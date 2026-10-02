# Hardware acceptance checks for Labs v1

Software checks cannot replace a real USB board test. The connection fix was checked on the attached CP210x board at COM3: its raw Python console reported ESP32 / MicroPython v1.29.0. This check did not erase or reflash it; full installation/upload acceptance checks remain below.

## Classic ESP32 DevKit / WROOM (4 MiB or more)

1. Open the HTTPS site in desktop Chrome or Edge. Choose ESP32 and connect a USB data cable.
2. Choose a new USB port, select the ESP32 in the browser chooser, and connect.
3. With MicroPython already installed, confirm the status becomes “Connected & ready” without flashing.
4. With an Arduino or factory image installed, confirm the firmware setup appears without a file picker. Acknowledge the erase warning and install the included firmware. Release BOOT when writing starts. The board must restart and become “Connected & ready” automatically after verification. If the console remains unreachable, Labs must offer reconnecting rather than asking to install again.
5. Load Make it blink. Run should blink GPIO 2; Stop should interrupt it. If no built-in LED exists, use an LED and resistor on GPIO 2.
6. Upload the blink program, unplug, and reconnect power. It should start again from `main.py`.
7. Load Hello, robot! and upload. Confirm the serial monitor prints the greeting.
8. Connect a suitable 0–3.3 V sensor on ADC1 GPIO 34 and load Sensor explorer. Confirm readings change.
9. Disconnect the USB cable during normal monitoring. Status should return to disconnected and allow reconnecting.
10. Cancel the browser port chooser. Existing blocks and project must stay intact.
11. Try another application holding the port. The error should explain closing other serial applications.
12. With a spare S3/C3 board, attempt a firmware install: it must reject the chip before erasing. Never use a board containing valuable files for erase tests.

## Arduino Uno, classic Nano, Mega

1. Install Python, `pyserial`, Arduino CLI, and `arduino:avr` as described in README.
2. Start the helper with the exact Labs origin. Keep its terminal open.
3. Select the Arduino model, paste the token, refresh local ports, and choose the board's COM/USB port.
4. Connect, load Make it blink, and Upload. Check the LED on pin 13 blinks and upload logs appear.
5. Load Hello, robot! and upload. Check the greeting appears at 115200 baud.
6. Upload Sensor explorer with a sensor on A0 within the board's 0–5 V range. Confirm readings.
7. For an older Nano clone, enable the old bootloader option and repeat.
8. Unplug while monitoring; status must return to disconnected. Reconnect and upload again.
9. Stop the helper or enter a wrong token. The app should show an actionable connection message.
10. Repeat using the hosted HTTPS site with local network permission allowed. If managed browser policy blocks loopback requests, use localhost.

An Arduino sketch keeps running until it is replaced or the board loses power. Labs intentionally offers temporary Run/Stop only for ESP32's MicroPython REPL.
