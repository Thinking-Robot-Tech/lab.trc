export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export class BoardSerial {
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private reading?: Promise<void>;
  private buffer = '';
  private closing = false;
  private opened = false;
  constructor(
    public port: SerialPort,
    private log: (text: string) => void,
    private lost: () => void,
  ) {}
  async open() {
    await this.port.open({ baudRate: 115200 });
    this.opened = true;
    this.closing = false;
    this.reader = this.port.readable!.getReader();
    this.reading = this.read();
  }
  private async read() {
    const decoder = new TextDecoder();
    try {
      while (!this.closing) {
        const { value, done } = await this.reader!.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        this.buffer = (this.buffer + text).slice(-131072);
        this.log(text);
      }
    } catch (e) {
      if (!this.closing) this.log(`\nConnection lost: ${e instanceof Error ? e.message : e}\n`);
    } finally {
      this.reader?.releaseLock();
      this.reader = undefined;
      if (!this.closing) this.lost();
    }
  }
  async write(text: string | Uint8Array) {
    if (!this.port.writable) throw new Error('The port is closed. Connect your board again.');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(typeof text === 'string' ? new TextEncoder().encode(text) : text);
    } finally {
      writer.releaseLock();
    }
  }
  private async expect(match: (text: string) => boolean, timeout = 5000) {
    const start = Date.now();
    while (!match(this.buffer)) {
      if (!this.reader) throw new Error('Board disconnected. Connect it again.');
      if (Date.now() - start > timeout)
        throw new Error(
          'The board did not reply. Close other serial apps, check your USB cable, then reconnect.',
        );
      await delay(30);
    }
    return this.buffer;
  }
  async probe() {
    this.buffer = '';
    await this.write('\x03\x03\x02');
    await delay(200);
    this.buffer = '';
    await this.write(
      "\r\nimport sys; print('LAB_' + 'READY', sys.platform, sys.implementation.name)\r\n",
    );
    try {
      await this.expect((t) => t.includes('LAB_READY esp32 micropython'), 2500);
      return true;
    } catch {
      return false;
    }
  }
  async stop() {
    await this.write('\x03\x03');
    await delay(100);
    await this.write('\x02');
  }
  private async raw(source: string) {
    await this.stop();
    this.buffer = '';
    await this.write('\x01');
    await this.expect((t) => t.includes('raw REPL; CTRL-B to exit') && t.endsWith('>'));
    this.buffer = '';
    const bytes = new TextEncoder().encode(source);
    for (let i = 0; i < bytes.length; i += 128) {
      await this.write(bytes.slice(i, i + 128));
      await delay(10);
    }
    await this.write('\x04');
    await this.expect((t) => t.startsWith('OK'));
  }
  async run(code: string) {
    await this.raw(code);
  }
  async save(code: string) {
    await this.raw(`with open('main.py', 'w') as f:\n    f.write(${JSON.stringify(code)})\n`);
    const response = await this.expect((t) => t.includes('\x04>'), 10000);
    const sections = response.slice(2).split('\x04');
    if (sections[1]?.trim()) throw new Error(`Could not save main.py: ${sections[1]}`);
    await this.write('\x02');
    await delay(100);
    await this.write('\x04');
  }
  async close() {
    this.closing = true;
    await this.reader?.cancel().catch(() => {});
    await this.reading;
    if (this.opened) {
      await this.port.close().catch(() => {});
      this.opened = false;
    }
  }
}

export async function flashMicroPython(
  port: SerialPort,
  bytes: Uint8Array,
  log: (t: string) => void,
  progress: (n: number) => void,
) {
  if (
    bytes.length < 100000 ||
    bytes.length > 8000000 ||
    bytes[0] !== 0xe9 ||
    bytes[12] !== 0 ||
    bytes[13] !== 0 ||
    bytes[0x7000] !== 0xaa ||
    bytes[0x7001] !== 0x50 ||
    bytes[0xf000] !== 0xe9
  )
    throw new Error(
      'Choose the full classic ESP32_GENERIC .bin image, not an .app-bin or S3/C3 firmware.',
    );
  const { ESPLoader, Transport } = await import('esptool-js');
  const { default: SparkMD5 } = await import('spark-md5');
  const transport = new Transport(port, true);
  try {
    const loader = new ESPLoader({
      transport,
      baudrate: 460800,
      terminal: { clean() {}, write: log, writeLine: (t) => log(t + '\n') },
    });
    log('Hold BOOT if connection waits; release it when writing starts.\n');
    await loader.main();
    if (loader.chip?.CHIP_NAME !== 'ESP32')
      throw new Error(
        `Detected ${loader.chip?.CHIP_NAME}. This image supports classic ESP32/WROOM only. ESP32-S2/S3/C3 need their own firmware.`,
      );
    // Chip detection must precede erase; never flash a classic image to S3/C3.
    await loader.writeFlash({
      fileArray: [{ data: bytes, address: 0x1000 }],
      flashSize: 'keep',
      flashMode: 'keep',
      flashFreq: 'keep',
      eraseAll: true,
      compress: true,
      calculateMD5Hash: (image) => SparkMD5.ArrayBuffer.hash(new Uint8Array(image).buffer),
      reportProgress: (_file, written, total) => progress(Math.round((written / total) * 100)),
    });
    await loader.after('hard_reset');
  } finally {
    await transport.disconnect();
  }
}
