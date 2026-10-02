import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
export default function Setup() {
  return (
    <>
      <Head>
        <title>Board setup · Thinking Robot Labs</title>
      </Head>
      <main className="setup-page">
        <Link href="/" className="back-link">
          <ArrowLeft size={17} /> Back to the playground
        </Link>
        <h1>A real board. A little setup. Big possibilities.</h1>
        <p>
          Labs runs locally or on our HTTPS website. Your USB connection and programs stay on your
          computer. Desktop Chrome and Edge are recommended.
        </p>
        <h2>ESP32: connect directly in your browser</h2>
        <ol>
          <li>
            Use a classic ESP32 DevKit / ESP32-WROOM board. Version 1 does not support S2, S3, C3,
            C6, ESP8266 or ESP32-CAM.
          </li>
          <li>
            Choose ESP32, click Connect board, choose your USB port, then Connect &amp; check board.
          </li>
          <li>
            If MicroPython is missing, download the full{' '}
            <a
              href="https://micropython.org/download/ESP32_GENERIC/"
              target="_blank"
              rel="noreferrer"
            >
              official ESP32_GENERIC .bin
            </a>{' '}
            and choose it in the installer. The bundled firmware is available automatically.
          </li>
          <li>
            Installing firmware erases the board’s files. Confirm this in the installer. Hold BOOT
            while connecting if needed, then release when writing begins.
          </li>
          <li>
            Connect again. Run tries your blocks in memory; Upload writes <code>main.py</code> and
            restarts the board. Stop interrupts the running program.
          </li>
        </ol>
        <p>
          GPIO is 3.3 V. The blink example uses GPIO 2. Some boards need an external LED with a
          resistor. Use ADC1 pins 32–39 for sensors, and keep sensor voltage at or below 3.3 V.
        </p>
        <h2>Arduino: start the local helper</h2>
        <p>
          Uno, classic Nano and Mega use Arduino C++, not MicroPython. A compiler cannot run on
          Vercel and cannot access your local USB ports. Our helper compiles and uploads locally
          using Arduino CLI.
        </p>
        <ol>
          <li>
            Install Python 3.10+ and{' '}
            <a
              href="https://docs.arduino.cc/arduino-cli/installation/"
              target="_blank"
              rel="noreferrer"
            >
              Arduino CLI
            </a>
            . Ensure <code>arduino-cli</code> is on PATH.
          </li>
          <li>
            Download the{' '}
            <a
              href="https://github.com/Thinking-Robot-Tech/lab.trc"
              target="_blank"
              rel="noreferrer"
            >
              repository
            </a>{' '}
            and open a terminal in its folder.
          </li>
          <li>Run these commands:</li>
        </ol>
        <pre>{`python -m venv .venv\n# Windows:\n.venv\\Scripts\\activate\n# macOS / Linux: source .venv/bin/activate\npython -m pip install -r companion/requirements.txt\narduino-cli core update-index\narduino-cli core install arduino:avr\npython companion/bridge.py --origin http://localhost:3000`}</pre>
        <p>
          For the hosted site, replace the origin with the exact HTTPS address shown in your browser
          (scheme and hostname only):
        </p>
        <pre>{`python companion/bridge.py --origin https://YOUR-PROJECT.vercel.app`}</pre>
        <ol start={4}>
          <li>
            The helper prints a temporary token. Choose your Arduino board in Labs, click Connect,
            paste the token and Refresh local ports.
          </li>
          <li>
            Choose the correct COM or USB port, then Connect. Allow local network access if Chrome
            or Edge asks.
          </li>
          <li>
            Upload to board compiles and uploads your sketch. Choose “old bootloader” for older Nano
            clones if needed. Arduino runs until unplugged or replaced with a new sketch.
          </li>
        </ol>
        <p>
          The helper listens only on 127.0.0.1, accepts only the origins you specify, requires its
          random token, and never uploads code to the cloud. Keep the terminal open while using it.
          Ctrl+C stops it. Tokens are kept only in page memory.
        </p>
        <h2>When something doesn’t connect</h2>
        <ul>
          <li>Try a USB data cable; charging-only cables won’t work.</li>
          <li>Close Arduino IDE, Thonny, and other serial apps using the port.</li>
          <li>Install your board’s USB driver if no port appears (often CP210x or CH340).</li>
          <li>ESP32: press RESET, reconnect, or hold BOOT when the installer tries to connect.</li>
          <li>
            Arduino: check the board model, port, Nano bootloader option, Arduino CLI and installed
            AVR core.
          </li>
          <li>
            If the helper cannot be reached from the hosted site, allow local network access in
            browser site settings. If school policies block it, run Labs on localhost instead.
          </li>
        </ul>
        <h2>Keep your inventions</h2>
        <p>
          The current project saves automatically in this browser. Projects → Export gives you a
          portable <code>.labs.json</code> backup. Code downloads as <code>.py</code> or{' '}
          <code>.ino</code>. Clearing browser data removes the local copy. No account or database
          setup is required.
        </p>
      </main>
    </>
  );
}
