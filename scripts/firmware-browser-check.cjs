const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  });
  for (const responsive of [true, false]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(
      ({ responsive }) => {
        let controller;
        let raw = false;
        let attempts = 0;
        const emit = (text) => controller.enqueue(new TextEncoder().encode(text));
        const port = {
          getInfo: () => ({ usbVendorId: 0x10c4, usbProductId: 0xea60 }),
          setSignals: async () => {},
          open: async () => {
            port.readable = new ReadableStream({
              start(c) {
                controller = c;
              },
            });
            port.writable = new WritableStream({
              write(bytes) {
                const text = new TextDecoder().decode(bytes);
                if (text.includes('\x01')) {
                  attempts++;
                  if (responsive && attempts >= 2) {
                    raw = true;
                    emit('raw REPL; CTRL-B to exit\r\n>');
                  }
                } else if (raw && text === '\x04') {
                  emit('OKLAB_READY esp32 micropython\r\n\x04\x04>');
                  raw = false;
                } else if (raw) {
                  source += text;
                }
              },
            });
          },
          close: async () => {},
        };
        const serial = new EventTarget();
        serial.getPorts = async () => [port];
        serial.requestPort = async () => port;
        Object.defineProperty(navigator, 'serial', { value: serial });
      },
      { responsive },
    );
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    await page.locator('.blocklySvg').waitFor();
    await page.getByRole('button', { name: 'Connect board', exact: true }).click();
    await page.locator('[role=dialog] select').selectOption('0');
    await page.getByRole('button', { name: 'Connect & check board' }).click();
    if (responsive) {
      await page.getByText('Connected & ready', { exact: true }).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Upload to board', exact: true }).isEnabled(),
        true,
      );
      assert.equal(
        await page.getByRole('heading', { name: 'Give your ESP32 its superpower.' }).count(),
        0,
      );
      console.log('PASS: delayed existing MicroPython connects without prompting for reinstall.');
    } else {
      await page.getByRole('heading', { name: 'Give your ESP32 its superpower.' }).waitFor();
      assert.equal(await page.locator('[role="dialog"] input[type="file"]').count(), 0);
      await page.getByText(/MicroPython v1.29.0 is included/).waitFor();
      assert.equal(
        await page.getByRole('button', { name: 'Install MicroPython', exact: true }).isDisabled(),
        true,
      );
      await page.getByRole('checkbox', { name: /I understand/ }).check();
      assert.equal(
        await page.getByRole('button', { name: 'Install MicroPython', exact: true }).isEnabled(),
        true,
      );
      await page.screenshot({ path: 'test-results/firmware-direct-install.png' });
      console.log(
        'PASS: firmware installs directly without file picker; erase acknowledgement remains required.',
      );
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
