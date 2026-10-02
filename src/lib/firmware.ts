export const FIRMWARE_URL = '/assets/firmware/esp32-micropython.bin';
export const FIRMWARE_SHA256 = 'e67ad6015a0a504c1fec9aa9bbf589d0432ed28e62546f4f8dd8a147f8bd95f6';
export async function loadFirmware() {
  const response = await fetch(FIRMWARE_URL);
  if (!response.ok)
    throw new Error('The firmware could not be loaded. Refresh Labs and try again.');
  const buffer = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== FIRMWARE_SHA256)
    throw new Error('The firmware download is incomplete or damaged. Refresh Labs and try again.');
  return new Uint8Array(buffer);
}
