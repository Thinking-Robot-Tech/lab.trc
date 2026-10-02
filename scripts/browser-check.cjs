const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
// Use the bundled runtime by setting PLAYWRIGHT_PATH, or install Playwright locally.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  fs.mkdirSync('test-results', { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.locator('.blocklySvg').waitFor();
  await page
    .getByLabel('Generated code', { exact: true })
    .getByText('while True:', { exact: true })
    .waitFor();
  await page.screenshot({ path: 'test-results/studio-daylight.png', fullPage: true });
  assert.equal(
    await page.getByRole('button', { name: 'Upload to board', exact: true }).isDisabled(),
    true,
  );
  await page.getByLabel('Color theme').selectOption('midnight');
  await page.locator('.theme-midnight .blocklySvg').waitFor();
  await page.screenshot({ path: 'test-results/studio-midnight.png', fullPage: true });
  await page.getByLabel('Color theme').selectOption('candy');
  await page.locator('.theme-candy .blocklySvg').waitFor();
  await page.screenshot({ path: 'test-results/studio-candy.png', fullPage: true });
  await page.getByLabel('Board model').selectOption('uno');
  await page
    .getByLabel('Generated code', { exact: true })
    .getByText('void setup() {', { exact: true })
    .waitFor();
  assert.match(
    await page.getByLabel('Generated code', { exact: true }).innerText(),
    /digitalWrite\(13, HIGH\)/,
  );
  await page.getByRole('button', { name: 'Connect board', exact: true }).click();
  await page.getByRole('heading', { name: 'Let’s connect your Uno.' }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Connect & check board' }).isDisabled(),
    true,
  );
  await page.getByLabel('Close dialog').click();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export project' }).click();
  const download = await downloadPromise;
  const exportPath = path.resolve('test-results/export.labs.json');
  await download.saveAs(exportPath);
  const project = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  assert.equal(project.board, 'uno');
  assert.equal(project.version, 1);
  await page.getByLabel('Close dialog').click();
  await page.getByLabel('Project name').fill('My browser test');
  await page.getByText('Saved on this device', { exact: true }).waitFor();
  await page.waitForTimeout(700);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.blocklySvg').waitFor();
  assert.equal(await page.getByLabel('Project name').inputValue(), 'My browser test');
  assert.equal(await page.getByLabel('Board model').inputValue(), 'uno');
  assert.equal(await page.getByLabel('Color theme').inputValue(), 'candy');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /SAY HELLO/ }).click();
  await page
    .getByLabel('Generated code', { exact: true })
    .getByText('Serial.println("Hello, Thinking Robot!");', { exact: true })
    .waitFor();
  await page.getByLabel('Board model').selectOption('esp32');
  await page
    .getByLabel('Generated code', { exact: true })
    .getByText('print("Hello, Thinking Robot!")', { exact: true })
    .waitFor();
  await page.getByRole('button', { name: /FIRST STEPS/ }).click();
  await page.getByLabel('Color theme').selectOption('daylight');
  await page
    .getByLabel('Generated code', { exact: true })
    .getByText('while True:', { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/studio-mobile.png', fullPage: true });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Mobile layout must not overflow',
  );
  await page.goto('http://127.0.0.1:3000/local-setup', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Arduino: start the local helper' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: workspace, themes, board code, upload gating, connection dialog, export, autosave, starters, mobile and setup guide.',
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
