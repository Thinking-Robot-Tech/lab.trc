import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import Mock, patch
from bridge import BoardSession, Problem, make_handler, validate_upload


class ValidationTests(unittest.TestCase):
    def test_boards_and_old_nano(self):
        code = '// Made with Thinking Robot Labs\n#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}\n'
        _, fqbn = validate_upload({'board': 'nano', 'oldNano': True, 'code': code})
        self.assertIn('atmega328old', fqbn)
        with self.assertRaises(Problem):
            validate_upload({'board': 'esp32', 'code': code})
        with self.assertRaises(Problem):
            validate_upload({'board': 'uno', 'code': code + '#include "secret.txt"'})

    def test_compile_failure_restores_serial_and_never_uploads(self):
        session = BoardSession()
        session.port = Mock()
        session.device = 'COM9'
        source = '// Made with Thinking Robot Labs\n#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}\n'
        with patch('bridge.list_ports.comports', return_value=[Mock(device='COM9')]), patch('bridge.shutil.which', return_value='arduino-cli'), patch('bridge.serial.Serial', return_value=Mock()), patch('bridge.subprocess.run', return_value=Mock(returncode=1, stdout='', stderr='bad sketch')) as run:
            with self.assertRaisesRegex(Problem, 'bad sketch'):
                session.upload({'board': 'uno', 'port': 'COM9', 'code': source})
            self.assertEqual(run.call_count, 1)
            self.assertFalse(session.uploading)
            self.assertEqual(session.device, 'COM9')

    def test_monitor_during_upload_and_unplug(self):
        session = BoardSession()
        session.uploading = True
        self.assertTrue(session.monitor()['connected'])
        session.uploading = False
        session.port = Mock()
        type(session.port).in_waiting = property(lambda _: (_ for _ in ()).throw(OSError('unplug')))
        self.assertFalse(session.monitor()['connected'])


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), make_handler(BoardSession(), 'test-token', {'http://localhost:3000'}))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, route='/ports', token='test-token', origin='http://localhost:3000', host='127.0.0.1:8765', method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        conn.request(method, route, headers={'Host': host, 'Authorization': 'Bearer ' + token, 'Origin': origin})
        response = conn.getresponse()
        body = response.read()
        result = response.status, dict(response.getheaders()), json.loads(body) if body else None
        conn.close()
        return result

    def test_authorized_ports_and_cors(self):
        status, headers, data = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'http://localhost:3000')
        self.assertIn('ports', data)

    def test_bad_token_origin_and_rebinding_are_rejected(self):
        self.assertEqual(self.request(token='wrong')[0], 401)
        self.assertEqual(self.request(origin='https://evil.example')[0], 403)
        self.assertEqual(self.request(host='evil.example:8765')[0], 403)

    def test_local_network_preflight_and_missing_route(self):
        status, headers, _ = self.request(method='OPTIONS')
        self.assertEqual(status, 204)
        self.assertEqual(headers['Access-Control-Allow-Private-Network'], 'true')
        self.assertEqual(self.request(route='/missing')[0], 404)


if __name__ == '__main__':
    unittest.main()
