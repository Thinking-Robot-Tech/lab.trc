import { Lightbulb } from 'lucide-react';
import { boards, BoardId } from '@/lib/boards';
export function QuickGuide({ board }: { board: BoardId }) {
  return (
    <div className="quick-guide">
      <div>
        <b>1</b>
        <span>
          <strong>Build your idea</strong>
          <p>
            Open a block category. Drag blocks inside “when my board starts”. The notches show where
            they fit.
          </p>
        </span>
      </div>
      <div>
        <b>2</b>
        <span>
          <strong>Make it repeat</strong>
          <p>
            A “repeat forever” block keeps your idea going. Add a wait block so you can see each
            change.
          </p>
        </span>
      </div>
      <div>
        <b>3</b>
        <span>
          <strong>Meet your board</strong>
          <p>
            {board === 'esp32'
              ? 'Select its USB port. We’ll check MicroPython and help install it if needed.'
              : 'Start the local helper, paste its token, and select your Arduino’s COM or USB port.'}
          </p>
        </span>
      </div>
      <div>
        <b>4</b>
        <span>
          <strong>Bring it to life</strong>
          <p>
            Upload saves your program to the board. Watch the serial monitor for messages.
            {board === 'esp32'
              ? ' Run tries it in memory; Stop interrupts it.'
              : ' An Arduino keeps running until you upload another sketch or unplug it.'}
          </p>
        </span>
      </div>
      <div className="guide-tip">
        <Lightbulb size={18} />
        <span>
          Some ESP32 boards don’t have an LED on GPIO 2. Use an external LED and resistor if yours
          doesn’t blink.
        </span>
      </div>
    </div>
  );
}
export function BoardDrawing({ board }: { board: BoardId }) {
  const esp = board === 'esp32';
  return (
    <svg
      className="board-art"
      viewBox="0 0 230 150"
      role="img"
      aria-label={`${boards[board].name} illustration`}
    >
      <defs>
        <filter id="boardShadow">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".14" />
        </filter>
      </defs>
      <ellipse cx="115" cy="125" rx="81" ry="9" fill="currentColor" opacity=".035" />
      <g transform="translate(37 21) rotate(-7 78 50)" filter="url(#boardShadow)">
        <rect x="0" y="0" width="156" height="103" rx="8" fill={esp ? '#253e43' : '#178791'} />
        <circle cx="9" cy="9" r="3" fill="#d8dfd8" />
        <circle cx="147" cy="94" r="3" fill="#d8dfd8" />
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <rect x={19 + i * 10} y="3" width="6" height="10" rx="1" fill="#202b31" />
            <rect x={19 + i * 10} y="90" width="6" height="10" rx="1" fill="#202b31" />
            <rect x={21 + i * 10} y="5" width="2" height="5" fill="#dfc98a" />
            <rect x={21 + i * 10} y="92" width="2" height="5" fill="#dfc98a" />
          </g>
        ))}
        <rect x="-6" y="34" width="27" height="32" rx="3" fill="#bfc8cc" />
        <rect x="-6" y="40" width="10" height="20" rx="2" fill="#64777e" />
        <rect x="56" y="23" width="64" height="56" rx="3" fill={esp ? '#b7c1c5' : '#283338'} />
        {esp ? (
          <>
            <path d="M62 26h10v7h9v-7h9v7h9v-7h13" fill="none" stroke="#677980" strokeWidth="2" />
            <text x="88" y="53" textAnchor="middle" fill="#48565a" fontSize="10" fontWeight="bold">
              ESP32
            </text>
            <text x="88" y="64" textAnchor="middle" fill="#65777c" fontSize="5">
              WROOM-32
            </text>
          </>
        ) : (
          <text x="88" y="54" textAnchor="middle" fill="#afc6c7" fontSize="8">
            ATmega
          </text>
        )}
        <rect x="28" y="24" width="12" height="9" rx="2" fill="#18292f" />
        <rect x="28" y="69" width="12" height="9" rx="2" fill="#18292f" />
        <rect x="132" y="38" width="6" height="6" rx="1" fill="#99e3aa" />
        <path d="M44 51h10m70 8h12M47 31v37" stroke="#739086" strokeWidth="1" opacity=".6" />
        <text x="79" y="86" textAnchor="middle" fill="#a9c3be" fontSize="5" letterSpacing="1">
          THINKING ROBOT LABS
        </text>
      </g>
    </svg>
  );
}
