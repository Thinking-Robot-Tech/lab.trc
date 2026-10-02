# Bundled ESP32 MicroPython firmware

- Board: classic ESP32 / WROOM, dual core, at least 4 MiB flash.
- MicroPython: v1.29.0, released 2026-08-24.
- Official source: https://www.micropython.org/resources/firmware/ESP32_GENERIC-20260824-v1.29.0.bin
- Saved as: `esp32-micropython.bin`.
- Flash offset: `0x1000`.
- Length: 1,790,544 bytes.
- SHA-256: `e67ad6015a0a504c1fec9aa9bbf589d0432ed28e62546f4f8dd8a147f8bd95f6`.
- License: see `MICROPYTHON-LICENSE.txt`; firmware includes upstream ESP-IDF components under their respective licenses. Upstream source: https://github.com/micropython/micropython/tree/v1.29.0/ports/esp32

The installer loads this image directly without a file picker, verifies the download's SHA-256, checks the ESP32 chip ID and merged-image layout, detects the physical chip before erasing, and verifies flashed bytes with MD5. It explicitly pulses reset into normal boot and reconnects to confirm MicroPython. Installing firmware erases existing files and requires the user's explicit acknowledgement in the UI.

Do not substitute `.app-bin`, S2/S3/C3/C6, single-core, or 2 MiB variants at this path. Add distinct supported board profiles and installation addresses before supporting them.
