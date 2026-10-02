import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoardSerial } from '../src/lib/serial';

function fakePort() {
  const writes: string[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let raw = false;
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
        if (text.includes("print('LAB_'")) emit('LAB_READY esp32 micropython\r\n>>> ');
        if (text === '\x01') {
          raw = true;
          emit('raw REPL; CTRL-B to exit\r\n>');
        }
        if (text === '\x04' && raw) {
          emit('OK\x04\x04>');
          raw = false;
        }
      },
    }),
    open: async () => {},
    close: async () => {},
  } as unknown as SerialPort;
  return { port, writes };
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
