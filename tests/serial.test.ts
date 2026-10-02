import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoardSerial, resetEsp32 } from '../src/lib/serial';

function fakePort(readyAfter = 1, platform = 'esp32') {
  const writes: string[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let raw = false;
  let attempts = 0;
  let source = '';
  const signals: SerialOutputSignals[] = [];
  const emit = (text: string) => controller.enqueue(new TextEncoder().encode(text));
  const port = {
    readable: new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write(bytes) {
        const text = new TextDecoder().decode(bytes);
        writes.push(text);
        if (text.includes('\x01') && ++attempts >= readyAfter) {
          raw = true;
          source = '';
          emit('raw REPL; CTRL-B to exit\r\n>');
        } else if (raw && !text.includes('\x04') && !text.includes('\x02')) {
          source += text;
        }
        if (text === '\x04' && raw) {
          emit('OK');
          if (source.includes('import sys')) {
            emit('LAB_RE');
            emit(`ADY ${platform} micropython\r\n`);
          }
          emit('\x04\x04>');
          raw = false;
        }
      },
    }),
    open: async () => {},
    close: async () => {},
    setSignals: async (value: SerialOutputSignals) => {
      signals.push(value);
    },
  } as unknown as SerialPort;
  return { port, writes, signals };
}
test('ESP32 handshake checks a real platform reply and releases port locks', async () => {
  const { port } = fakePort();
  const board = new BoardSerial(
    port,
    () => {},
    () => {},
  );
  await board.open();
  assert.equal(await board.probe(), true);
  await board.close();
  assert.equal(port.readable!.locked, false);
  assert.equal(port.writable!.locked, false);
});
test('detection retries when the first command arrives before Python boots', async () => {
  const { port, writes } = fakePort(2);
  const board = new BoardSerial(
    port,
    () => {},
    () => {},
  );
  await board.open();
  assert.equal(await board.probe(), true);
  assert.equal(writes.filter((text) => text.includes('\x01')).length, 2);
  assert.equal(writes.at(-1), '\x02');
  await board.close();
});
test('reset releases GPIO0 then pulses EN high and low for normal boot', async () => {
  const { port, signals } = fakePort();
  await resetEsp32(port);
  assert.deepEqual(signals, [
    { dataTerminalReady: false, requestToSend: false },
    { dataTerminalReady: false, requestToSend: true },
    { dataTerminalReady: false, requestToSend: false },
  ]);
});
test('MicroPython on another board is not reported as ESP32', async () => {
  const { port } = fakePort(1, 'rp2');
  const board = new BoardSerial(
    port,
    () => {},
    () => {},
  );
  await board.open();
  assert.equal(await board.probe(), false);
  await board.close();
});
test('upload writes main.py through raw REPL then soft-resets the board', async () => {
  const { port, writes } = fakePort();
  const board = new BoardSerial(
    port,
    () => {},
    () => {},
  );
  await board.open();
  await board.save('print("hi")\n');
  assert(writes.some((text) => text.includes("with open('main.py', 'w')")));
  assert.equal(writes.at(-1), '\x04');
  await board.close();
});
