import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FIRMWARE_SHA256, FIRMWARE_URL, loadFirmware } from '../src/lib/firmware';
test('the automatic installer loads the bundled firmware and verifies its checksum', async () => {
  const bytes = readFileSync('public/assets/firmware/esp32-micropython.bin');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), FIRMWARE_SHA256);
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, FIRMWARE_URL);
    return new Response(bytes);
  };
  try {
    assert.deepEqual(await loadFirmware(), new Uint8Array(bytes));
  } finally {
    globalThis.fetch = original;
  }
});
test('an incomplete automatic firmware download is rejected before flashing', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([0xe9, 0, 0]));
  try {
    await assert.rejects(loadFirmware(), /incomplete or damaged/);
  } finally {
    globalThis.fetch = original;
  }
});
