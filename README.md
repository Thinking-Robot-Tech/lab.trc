# Thinking Robot Labs v1

A local-first, student-friendly Blockly studio for classic ESP32 and Arduino Uno, Nano and Mega. Build with blocks, watch real code appear, connect a USB board, and run your invention.

## Included

- Blockly snapping, drag/drop, editable fields, undo/redo, zoom, trash and keyboard support.
- Start, built-in LED, digital output, digital/analog input, waits, forever/repeat loops, if/else, numeric comparisons, arithmetic and serial messages.
- Board-aware pins and generated MicroPython or Arduino C++.
- Daylight, Midnight and Candy themes, quick guide, responsive layout and starter projects.
- Automatic local saving, project export/import and generated-code downloads.
- Direct ESP32 browser USB connection, MicroPython detection, guided installation, checksum-verified flashing, temporary Run/Stop and persistent `main.py` upload.
- Arduino loopback helper for actual COM/USB port selection, local compile/upload and serial monitoring.
- Bundled official ESP32_GENERIC MicroPython v1.29.0 firmware with provenance and license in `public/assets/firmware/`.

## Run locally with NVM

Node is pinned in `.nvmrc` to **22.14.0**. Use Node 22 for Vercel as well.

macOS/Linux with nvm:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Windows with nvm-windows (it does not automatically read `.nvmrc`):

```powershell
nvm install 22.14.0
nvm use 22.14.0
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables, login, Supabase project, or database migrations are required for v1.

On the current development machine, a stale global npm shim shadows the working Node installation. If `npm` reports a missing `npm-cli.js`, use `& 'C:\Program Files\nodejs\npm.cmd' ci` and `& 'C:\Program Files\nodejs\npm.cmd' run dev`, or repair your NVM/PATH installation. The project does not modify your system PATH.

## ESP32 setup

Use a **classic dual-core ESP32 DevKit / ESP32-WROOM with at least 4 MiB flash**. ESP32-S2/S3/C3/C6, ESP32-CAM, single-core and 2 MiB variants are outside v1 support.

1. Open Labs in desktop Chrome/Edge on localhost or HTTPS.
2. Select ESP32, Connect board, choose a USB port, then Connect & check board.
3. If MicroPython is present, no firmware is reinstalled. Labs retries the raw Python console handshake while the board boots. A missing reply does not prove firmware is missing: release BOOT and try RESET/reconnect before using the guided installer. Installing firmware erases the board and requires acknowledgement.
4. The installer uses the included firmware directly, with no file picker. It verifies the download with SHA-256, validates the merged-image layout, detects the physical chip before erase, writes at `0x1000`, and verifies the flashed bytes with MD5.
5. After installation, Labs explicitly pulses reset into normal boot, reconnects and confirms MicroPython automatically. If the console cannot be reached, it offers reconnecting without another firmware installation. Run executes in memory. Upload saves `main.py` and soft-resets the board. Stop interrupts a running program.

Firmware path: `public/assets/firmware/esp32-micropython.bin`. Source and SHA-256: [firmware README](public/assets/firmware/README.md). Official instructions: https://micropython.org/download/ESP32_GENERIC/

GPIO is 3.3 V. GPIO 2 is the default LED; use an external LED and resistor if your board lacks a built-in LED there. ADC inputs use ADC1 pins 32–39 and 11 dB attenuation. Digital inputs 34–39 lack internal pull-ups and need an appropriate external resistor. Reserved flash pins are excluded from the palette.

## Arduino local helper

Arduino uses C++, not ESP32 MicroPython. Vercel cannot run a local compiler or access your computer's USB ports. `companion/bridge.py` performs those operations on your own computer.

Install Python 3.10+ and Arduino CLI on PATH, then run:

```powershell
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r companion/requirements.txt
arduino-cli core update-index
arduino-cli core install arduino:avr
python companion/bridge.py --origin http://localhost:3000
```

For the hosted site:

```sh
python companion/bridge.py --origin https://YOUR-PROJECT.vercel.app
```

Use the exact scheme/hostname/port shown in the browser, without a trailing slash. Repeat `--origin` to allow multiple explicit origins. The helper prints a temporary token. Select your Arduino model, paste that token, refresh ports and select the board's real COM/USB port. Connect and Upload. If your classic Nano uses the older bootloader, check that option before connecting.

The helper binds only to `127.0.0.1:8765`, validates Host and Origin, requires a random bearer token, serializes hardware operations, restricts board targets and ports, and invokes CLI commands without a shell. Tokens are not saved in browser storage. It returns actual compiler/upload failures. It does not accept arbitrary shell commands or custom include files. Keep its terminal open; Ctrl+C stops it.

Allow local network access if the browser asks. Managed school browser policy may block localhost access from HTTPS; use Labs on localhost in that case. Close Arduino IDE, Thonny and other monitors before connecting. Install the appropriate CP210x/CH340 driver if the port is missing.

An Arduino sketch runs until replaced or unplugged. Temporary Run/Stop is available only for MicroPython.

A student-facing setup guide is included at `/local-setup`.

## Projects and privacy

The current project and selected theme save in browser local storage. Export `.labs.json` to back up or transfer a project; imports are versioned, size-limited, and restricted to supported blocks. Download code as `.py` or `.ino`. There are no accounts, analytics, cloud saves or Supabase migrations in this version. Clearing browser storage removes local projects, so keep exports for work you want to retain.

## Validation

```sh
npm run typecheck
npm run lint
npm test
python -m unittest discover -s companion -p 'test_*.py'
npm run build
```

`npm test` requires Python on PATH to syntax-check generated MicroPython using Python's AST parser. It also tests nested loops/conditions, all starter generators, conflicts, project import and mocked REPL upload/lock cleanup. Python helper tests cover authentication, CORS/private-network preflight, host validation, unplugging and compile failures.

To compile generated Arduino starters with an installed CLI/core:

```sh
npm run test:compile
```

Optional environment variables `ARDUINO_CLI` and `ARDUINO_CONFIG` select a portable CLI and configuration file. This validates blink/message/sensor sketches for Uno, Nano and Mega, without uploading anything.

Browser verification, after starting the app:

```sh
npx playwright install chromium
npm run test:browser
```

`CHROMIUM_PATH` can point to an installed Chrome/Edge executable. `PLAYWRIGHT_PATH` can point to a bundled Playwright module. The check exercises workspace loading, themes, generated code, connection/upload gating, project export, autosave/reload, examples, the setup route and mobile layout. Screenshots go into ignored `test-results/`.

GitHub Actions runs the build, lint, type checks, generator tests and helper tests on push/PR. Hardware remains a manual acceptance check: see [hardware testing](docs/HARDWARE-TESTING.md).

## Vercel

The existing repository remains a Next.js Pages Router application. Push `main` to trigger your existing Vercel Git integration. Use Node 22.x, install `npm ci`, build `npm run build`, and the standard Next.js preset. No environment variables or migrations are needed. The Python helper runs on the student's computer, never in a Vercel function. The ESP32 firmware and Blockly icons are served from this application's `public` directory.

## Deliberate v1 limits

No simulator, Wi-Fi upload, custom-code editor, cloud projects, servo/motor/PWM blocks or additional ESP32 chip families yet. The live code view reflects the blocks and can be copied/downloaded. Adding board families needs matching firmware offsets, safe pin profiles and hardware tests; do not treat all ESP32 variants as interchangeable.
