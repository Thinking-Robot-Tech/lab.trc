import Head from 'next/head';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Blockly from 'blockly/core';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  CircuitBoard,
  Code2,
  Copy,
  Download,
  FolderOpen,
  HelpCircle,
  Lightbulb,
  LoaderCircle,
  Play,
  Plug,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Undo2,
  Unplug,
  Usb,
  X,
  Zap,
} from 'lucide-react';
import { BoardId, boards, isBoard, ThemeId } from '@/lib/boards';
import type { WorkspaceState } from '@/lib/blocks';
import { BoardSerial, delay, flashMicroPython } from '@/lib/serial';
import { loadFirmware } from '@/lib/firmware';
import { downloadFile, parseProject, Project } from '@/lib/project';
import { BridgePort, bridgeRequest } from '@/lib/bridge';
import { QuickGuide } from '@/components/Guide';

const Editor = dynamic(() => import('@/components/BlockEditor'), {
  ssr: false,
  loading: () => (
    <div className="workspace-loading">
      <LoaderCircle className="spin" /> Getting your blocks ready…
    </div>
  ),
});
const examples = [
  {
    id: 'blink',
    name: 'Make it blink',
    description: 'Your first little light show',
    icon: Lightbulb,
    color: 'yellow',
    level: 'FIRST STEPS',
  },
  {
    id: 'hello',
    name: 'Hello, robot!',
    description: 'Send your board a message',
    icon: Code2,
    color: 'green',
    level: 'SAY HELLO',
  },
  {
    id: 'sensor',
    name: 'Sensor explorer',
    description: 'See what your board can sense',
    icon: Zap,
    color: 'pink',
    level: 'GET CURIOUS',
  },
] as const;
type Modal = 'connect' | 'projects' | 'help' | 'firmware' | null;
type Connection = 'offline' | 'checking' | 'ready' | 'firmware';
type SerialEntry = { port: SerialPort; label: string };
export default function Home() {
  const [board, setBoard] = useState<BoardId>('esp32');
  const [theme, setTheme] = useState<ThemeId>('daylight');
  const [name, setName] = useState('My first blink');
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [connection, setConnection] = useState<Connection>('offline');
  const [busy, setBusy] = useState('');
  const busyRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [log, setLog] = useState('Welcome, maker! Connect a board to see its messages here.\n');
  const [ports, setPorts] = useState<SerialEntry[]>([]);
  const [portIndex, setPortIndex] = useState('');
  const [supported, setSupported] = useState(false);
  const [bridgeToken, setBridgeToken] = useState('');
  const [bridgePorts, setBridgePorts] = useState<BridgePort[]>([]);
  const [bridgePort, setBridgePort] = useState('');
  const [oldNano, setOldNano] = useState(false);
  const [eraseConfirmed, setEraseConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(true);
  const [running, setRunning] = useState(false);
  const [monitorInput, setMonitorInput] = useState('');
  const [panel, setPanel] = useState<'code' | 'guide'>('code');
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const serial = useRef<BoardSerial | null>(null);
  const selectedPort = useRef<SerialPort | null>(null);
  const flashedPorts = useRef(new WeakSet<SerialPort>());
  const importInput = useRef<HTMLInputElement>(null);
  const monitor = useRef<HTMLPreElement>(null);
  const pollErrors = useRef(0);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const focusable = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) setModal(null);
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    node?.addEventListener('keydown', keys);
    return () => {
      node?.removeEventListener('keydown', keys);
      previous?.focus();
    };
  }, [modal]);
  const append = useCallback(
    (text: string) =>
      setLog((current) => (current + text.replace(/[\x00-\x08\x0b-\x1f]/g, '')).slice(-40000)),
    [],
  );
  const notify = useCallback((text: string) => setNotice(text), []);
  const task = async (label: string, work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    try {
      await work();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
      append(`\n${label}: ${e instanceof Error ? e.message : e}\n`);
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  };
  const refreshPorts = useCallback(async () => {
    if (!('serial' in navigator)) return;
    const list = await navigator.serial.getPorts();
    if (selectedPort.current && !list.includes(selectedPort.current)) {
      selectedPort.current = null;
      setPortIndex('');
    }
    setPorts(
      list.map((port, i) => {
        const info = port.getInfo();
        return {
          port,
          label: `USB board ${i + 1}${info.usbVendorId ? ` · ${info.usbVendorId.toString(16).toUpperCase()}:${(info.usbProductId || 0).toString(16).toUpperCase()}` : ''}`,
        };
      }),
    );
  }, []);
  useEffect(() => {
    setSupported('serial' in navigator && window.isSecureContext);
    try {
      const data = localStorage.getItem('labs.project.v1');
      if (data) {
        const p = parseProject(data);
        setBoard(p.board);
        setName(p.name);
        setState(p.workspace);
      }
      const t = localStorage.getItem('labs.theme');
      if (t === 'daylight' || t === 'midnight' || t === 'candy') setTheme(t);
    } catch {
      setNotice('Your saved project could not be opened. You can import a backup from Projects.');
    }
    setLoaded(true);
    void refreshPorts();
    if ('serial' in navigator) {
      navigator.serial.addEventListener('connect', refreshPorts);
      navigator.serial.addEventListener('disconnect', refreshPorts);
    }
    return () => {
      if ('serial' in navigator) {
        navigator.serial.removeEventListener('connect', refreshPorts);
        navigator.serial.removeEventListener('disconnect', refreshPorts);
      }
      void serial.current?.close();
    };
  }, [refreshPorts]);
  useEffect(() => {
    if (!loaded || !state) return;
    setSaved(false);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          'labs.project.v1',
          JSON.stringify({ version: 1, name, board, workspace: state }),
        );
        localStorage.setItem('labs.theme', theme);
        setSaved(true);
      } catch {
        setNotice('Browser storage is full or unavailable. Export your project to keep it.');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state, board, name, theme, loaded]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 9000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    if (monitor.current) monitor.current.scrollTop = monitor.current.scrollHeight;
  }, [log]);
  useEffect(() => {
    if (board === 'esp32' || connection !== 'ready') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const data = await bridgeRequest<{ text: string; connected: boolean }>(
          bridgeToken,
          '/monitor',
        );
        if (cancelled) return;
        pollErrors.current = 0;
        if (data.text) append(data.text);
        if (!data.connected) {
          setConnection('offline');
          notify('Your board disconnected. Select its port and connect again.');
          return;
        }
      } catch (e) {
        if (cancelled) return;
        if (++pollErrors.current >= 3) {
          setConnection('offline');
          notify(e instanceof Error ? e.message : 'Local helper disconnected.');
          return;
        }
      }
      if (!cancelled) timer = setTimeout(poll, 600);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [board, connection, bridgeToken, append, notify]);
  const onChange = useCallback(
    (next: WorkspaceState, text: string, issues: string[], total: number) => {
      setState(next);
      setCode(text);
      setErrors(issues);
      setCount(total);
    },
    [],
  );
  const disconnect = async () => {
    if (serial.current) {
      await serial.current.close();
      serial.current = null;
    }
    if (board !== 'esp32' && connection === 'ready')
      await bridgeRequest(bridgeToken, '/disconnect', {});
    setConnection('offline');
    setRunning(false);
    append('\nBoard disconnected.\n');
  };
  const chooseBoard = (next: BoardId) =>
    void task('Changing board', async () => {
      await disconnect();
      setBoard(next);
      selectedPort.current = null;
      setPortIndex('');
      setBridgePort('');
      setEraseConfirmed(false);
    });
  const choosePort = () =>
    void task('Choosing a port', async () => {
      const port = await navigator.serial.requestPort();
      await refreshPorts();
      const list = await navigator.serial.getPorts();
      setPortIndex(String(list.indexOf(port)));
      selectedPort.current = port;
    });
  const connect = () =>
    void task('Connecting', async () => {
      setConnection('checking');
      try {
        if (board === 'esp32') {
          const port = selectedPort.current;
          if (!port) throw new Error('Choose a USB port first.');
          selectedPort.current = port;
          const session = new BoardSerial(port, append, () => {
            setConnection('offline');
            setRunning(false);
          });
          serial.current = session;
          await session.open();
          if (await session.probe()) {
            setConnection('ready');
            setModal(null);
            append('\nMicroPython is ready. Let’s make something!\n');
          } else {
            await session.close();
            serial.current = null;
            const alreadyFlashed = flashedPorts.current.has(port);
            setConnection(alreadyFlashed ? 'offline' : 'firmware');
            setEraseConfirmed(false);
            setModal(alreadyFlashed ? 'connect' : 'firmware');
            const message =
              'The Python console did not answer. Release BOOT, press RESET, close other serial apps, and reconnect.';
            append(`\n${message}\n`);
            if (alreadyFlashed) notify('Firmware was already written and verified. ' + message);
          }
        } else {
          if (!bridgePort) throw new Error('Refresh ports and choose your Arduino first.');
          await bridgeRequest(bridgeToken, '/connect', { port: bridgePort });
          setConnection('ready');
          setModal(null);
          append(`\nConnected to ${bridgePort}. Ready to upload.\n`);
        }
      } catch (e) {
        await serial.current?.close();
        serial.current = null;
        setConnection('offline');
        throw e;
      }
    });
  const loadExample = async (kind: 'blink' | 'hello' | 'sensor' | 'blank') => {
    if (
      state &&
      count > 1 &&
      !window.confirm(
        'Replace the current blocks? Export your project first if you want to keep it.',
      )
    )
      return;
    const { starter } = await import('@/lib/blocks');
    setState(starter(kind));
    setName(
      kind === 'blink'
        ? 'My first blink'
        : kind === 'hello'
          ? 'Hello, robot!'
          : kind === 'sensor'
            ? 'Sensor explorer'
            : 'My invention',
    );
    setEditorKey((k) => k + 1);
    setModal(null);
  };
  const upload = () =>
    void task(board === 'esp32' ? 'Saving to board' : 'Compiling & uploading', async () => {
      if (errors.length) throw new Error(errors[0]);
      if (connection !== 'ready') throw new Error('Connect a board first.');
      if (board === 'esp32') {
        await serial.current!.save(code);
        setRunning(true);
        append('\nSaved main.py. Your program starts now and after every restart.\n');
      } else {
        const data = await bridgeRequest<{ log: string }>(
          bridgeToken,
          '/upload',
          { board, oldNano, port: bridgePort, code },
          180000,
        );
        append(data.log);
        append('\nUpload complete. Your Arduino is running!\n');
        setRunning(true);
      }
    });
  const run = () =>
    void task('Running on board', async () => {
      if (errors.length) throw new Error(errors[0]);
      await serial.current!.run(code);
      setRunning(true);
      append('\nRunning in memory. Use Upload to keep it after restart.\n');
    });
  const stop = () =>
    void task('Stopping', async () => {
      await serial.current!.stop();
      setRunning(false);
      append('\nProgram stopped.\n');
    });
  const flash = () =>
    void task('Installing MicroPython', async () => {
      if (!eraseConfirmed)
        throw new Error('Confirm that installing firmware will erase this board.');
      if (!selectedPort.current) throw new Error('Choose your board’s USB port first.');
      const port = selectedPort.current;
      const bytes = await loadFirmware();
      setProgress(0);
      await flashMicroPython(port, bytes, append, setProgress);
      flashedPorts.current.add(port);
      await delay(1200);
      setEraseConfirmed(false);
      setBusy('Checking MicroPython');
      setConnection('checking');
      const session = new BoardSerial(port, append, () => {
        setConnection('offline');
        setRunning(false);
      });
      serial.current = session;
      try {
        await session.open();
        if (!(await session.probe()))
          throw new Error(
            'The Python console did not answer. Release BOOT, press RESET and reconnect.',
          );
        setConnection('ready');
        setModal(null);
        append('\nFirmware installed and MicroPython confirmed. Your board is ready!\n');
        notify('MicroPython is ready. Try Run or Upload!');
      } catch (error) {
        await session.close();
        serial.current = null;
        setConnection('offline');
        setModal('connect');
        notify(
          `Firmware was written and verified; you do not need to install it again. ${error instanceof Error ? error.message : error}`,
        );
      }
    });
  const project = (): Project => ({ version: 1, name, board, workspace: state! });
  const fileBase = name.replace(/[^a-zA-Z0-9_-]/g, '-') || 'my-project';
  const importProject = async (file: File) => {
    try {
      const p = parseProject(await file.text());
      if (!window.confirm('Open this project and replace your current blocks?')) return;
      await disconnect();
      setBoard(p.board);
      selectedPort.current = null;
      setPortIndex('');
      setBridgePort('');
      setState(p.workspace);
      setName(p.name);
      setEditorKey((k) => k + 1);
      setModal(null);
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    }
  };
  const lines = code.split('\n');
  const boardInfo = boards[board];
  const locked = Boolean(busy) || connection === 'ready' || connection === 'checking';
  return (
    <>
      <Head>
        <title>Thinking Robot Labs · Make something amazing</title>
        <meta
          name="description"
          content="A playful block coding studio for ESP32 and Arduino. Build with blocks, see the code, and bring your board to life."
        />
        <meta name="theme-color" content="#7860dd" />
        <link rel="icon" href="/labs.svg" />
      </Head>
      <div className={`studio theme-${theme}`}>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Thinking Robot Labs home">
            <span className="brand-mark">
              <CircuitBoard size={25} />
            </span>
            <span>
              thinking robot
              <span className="brand-sub">
                LABS <span className="version">v1</span>
              </span>
            </span>
          </Link>
          <div className="top-divider" />
          <div className="project-title">
            <input
              aria-label="Project name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            <span>
              <span className="status-dot green" />
              {saved ? 'Saved on this device' : 'Saving…'}
            </span>
          </div>
          <div className="board-controls">
            <select
              className="board-select"
              aria-label="Board model"
              value={board}
              disabled={locked}
              onChange={(e) => {
                if (isBoard(e.target.value)) chooseBoard(e.target.value);
              }}
            >
              {Object.entries(boards).map(([id, b]) => (
                <option key={id} value={id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className={`connection-status ${connection === 'ready' ? 'connected' : ''}`}>
              <span className={`status-dot ${connection === 'ready' ? 'green' : ''}`} />
              {connection === 'ready'
                ? 'Connected & ready'
                : connection === 'checking'
                  ? 'Checking your board…'
                  : connection === 'firmware'
                    ? 'MicroPython setup needed'
                    : 'Not connected yet'}
            </div>
            <button
              className="primary connect-button"
              disabled={!!busy}
              onClick={() =>
                connection === 'ready'
                  ? void task('Disconnecting', disconnect)
                  : setModal('connect')
              }
            >
              {connection === 'ready' ? <Unplug size={17} /> : <Plug size={17} />}{' '}
              {connection === 'ready' ? 'Disconnect board' : 'Connect board'}
              <ArrowRight size={16} />
            </button>
          </div>
          <nav className="top-actions">
            <button onClick={() => setModal('projects')}>
              <FolderOpen size={17} />
              <span>Projects</span>
            </button>
            <button onClick={() => setModal('help')}>
              <HelpCircle size={17} />
              <span>Help</span>
            </button>
            <label className="theme-picker">
              <Sun size={16} />
              <select
                aria-label="Color theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeId)}
              >
                <option value="daylight">Daylight</option>
                <option value="midnight">Midnight</option>
                <option value="candy">Candy</option>
              </select>
            </label>
          </nav>
        </header>
        <main className="studio-main">
          <section className="workspace-card">
            <div className="workspace-toolbar">
              <div className="workspace-label">
                <span className="purple-dot" />
                <strong>Block playground</strong>
                <span className="small-tag">{count} blocks</span>
              </div>
              <div className="workspace-actions">
                <button
                  title="Undo"
                  aria-label="Undo last block change"
                  onClick={() => workspace.current?.undo(false)}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  title="Redo"
                  aria-label="Redo block change"
                  onClick={() => workspace.current?.undo(true)}
                >
                  <RotateCcw size={17} />
                </button>
                <span className="toolbar-divider" />
                <button
                  title="Start fresh"
                  aria-label="Clear workspace"
                  onClick={() => void loadExample('blank')}
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="board-program-actions">
                <button
                  disabled={
                    !!busy || connection !== 'ready' || board !== 'esp32' || !!errors.length
                  }
                  title={
                    board !== 'esp32'
                      ? 'Use Upload to run an Arduino sketch'
                      : 'Run once in board memory'
                  }
                  className="run-button"
                  onClick={run}
                >
                  <Play size={14} fill="currentColor" /> Run
                </button>
                <button
                  className="primary upload-button"
                  disabled={!!busy || connection !== 'ready' || !!errors.length}
                  onClick={upload}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <ArrowDownToLine size={16} />
                  )}{' '}
                  {busy || 'Upload to board'}
                </button>{' '}
              </div>
            </div>
            <div className="workspace-hint">
              <span>
                <Plus size={13} /> Pick a category. Drag a block. Snap it in.
              </span>
              <a href="/local-setup" target="_blank" rel="noreferrer">
                USB setup guide
              </a>
            </div>
            <div className="editor-wrap">
              {loaded ? (
                <Editor
                  key={editorKey}
                  board={board}
                  theme={theme}
                  state={state}
                  onChange={onChange}
                  onReady={(ws) => {
                    workspace.current = ws;
                  }}
                />
              ) : (
                <div className="workspace-loading">Opening your playground…</div>
              )}
            </div>
            <div className="workspace-footer">
              <span>
                <span className={`status-dot ${errors.length ? 'orange' : 'green'}`} />
                {errors.length ? errors[0] : 'Looking good! Your blocks are ready.'}
              </span>
            </div>
          </section>
          <aside className="inspector">
            <section className="code-card">
              <div className="inspector-tabs">
                <button
                  className={panel === 'code' ? 'selected' : ''}
                  onClick={() => setPanel('code')}
                >
                  <Code2 size={16} /> Live code
                </button>
                <button
                  className={panel === 'guide' ? 'selected' : ''}
                  onClick={() => setPanel('guide')}
                >
                  <BookOpen size={16} /> Quick guide
                </button>
              </div>
              {panel === 'code' ? (
                <>
                  <div className="code-header">
                    <span>
                      <span className="status-dot purple" />
                      {boardInfo.language}
                    </span>
                    <div>
                      <button
                        aria-label="Copy generated code"
                        title="Copy code"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(code)
                            .then(() => notify('Code copied!'))
                            .catch(() =>
                              notify('Clipboard unavailable. Download the code instead.'),
                            )
                        }
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        aria-label="Download generated code"
                        title="Download code"
                        onClick={() =>
                          downloadFile(fileBase + (board === 'esp32' ? '.py' : '.ino'), code)
                        }
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="code-scroll" aria-label="Generated code">
                    <pre>
                      {lines.map((line, i) => (
                        <div className="code-line" key={i}>
                          <span className="line-number">{i + 1}</span>
                          <code
                            className={
                              line.trim().startsWith('#') || line.trim().startsWith('//')
                                ? 'code-comment'
                                : /^(from|void|while|for|if|else|import)/.test(line.trim())
                                  ? 'code-keyword'
                                  : ''
                            }
                          >
                            {line || ' '}
                          </code>
                        </div>
                      ))}
                    </pre>
                  </div>
                  <div className="code-note">
                    <Sparkles size={13} />
                    <span>Your blocks turn into real code. Watch it change!</span>
                  </div>
                </>
              ) : (
                <QuickGuide board={board} />
              )}
            </section>
            <section className="monitor-card">
              <div className="monitor-header">
                <strong>
                  <span className={`status-dot ${connection === 'ready' ? 'green' : ''}`} /> Serial
                  monitor
                </strong>
                <div>
                  <span>115200</span>
                  <button
                    aria-label="Clear serial monitor"
                    title="Clear monitor"
                    onClick={() => setLog('')}
                  >
                    <Trash2 size={14} />
                  </button>
                  {board === 'esp32' && running ? (
                    <button
                      aria-label="Stop program"
                      title="Stop program"
                      disabled={!!busy}
                      onClick={stop}
                    >
                      <Square size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
              <pre ref={monitor} className="monitor-output" aria-label="Board messages">
                {log}
              </pre>
              <form
                className="monitor-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!monitorInput) return;
                  void task('Sending message', async () => {
                    if (board === 'esp32') await serial.current!.write(monitorInput + '\r\n');
                    else await bridgeRequest(bridgeToken, '/send', { text: monitorInput + '\n' });
                    setMonitorInput('');
                  });
                }}
              >
                <input
                  aria-label="Serial message"
                  placeholder={
                    connection === 'ready' ? 'Send a message…' : 'Connect to see your board talk…'
                  }
                  value={monitorInput}
                  disabled={connection !== 'ready' || !!busy}
                  onChange={(e) => setMonitorInput(e.target.value)}
                  maxLength={1000}
                />
                <button
                  aria-label="Send serial message"
                  disabled={connection !== 'ready' || !!busy}
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </section>
          </aside>
        </main>
        <footer className="bottom-bar">
          <span>
            <CircuitBoard size={12} /> {boardInfo.description}
          </span>
          <span>Local-first · saved on this device</span>
        </footer>
        {notice ? (
          <div className="toast" role="status">
            <span>{notice}</span>
            <button aria-label="Dismiss message" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        ) : null}
        <input
          ref={importInput}
          type="file"
          accept=".json,.labs.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importProject(f);
            e.target.value = '';
          }}
        />
        {modal ? (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setModal(null);
            }}
          >
            <section
              className="modal"
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <button
                className="modal-close"
                aria-label="Close dialog"
                disabled={!!busy}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
              {modal === 'connect' ? (
                <>
                  <span className="modal-icon">
                    <Usb size={24} />
                  </span>
                  <h2 id="modal-title">Let’s connect your {boardInfo.short}.</h2>
                  <p>
                    Use a USB data cable. Close Arduino IDE, Thonny, and other serial monitors
                    first.
                  </p>
                  {board === 'esp32' ? (
                    <>
                      {!supported ? (
                        <div className="callout">
                          Open this page in desktop Chrome or Edge over HTTPS or localhost to
                          connect through USB.
                        </div>
                      ) : (
                        <>
                          <label className="field-label">
                            USB port
                            <select
                              value={portIndex}
                              onChange={(e) => {
                                setPortIndex(e.target.value);
                                selectedPort.current = ports[Number(e.target.value)]?.port || null;
                              }}
                            >
                              <option value="">Choose a previously allowed port</option>
                              {ports.map((p, i) => (
                                <option value={i} key={i}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button className="secondary wide" disabled={!!busy} onClick={choosePort}>
                            <Plus size={16} /> Choose a new USB port
                          </button>
                          <p className="fine-print">
                            The browser’s chooser shows your device or COM port. Port access stays
                            on this computer.
                          </p>
                        </>
                      )}
                      <div className="callout">
                        <Check size={18} />
                        <span>
                          We check for MicroPython first. If it’s missing, we’ll guide you through
                          setup.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="callout">
                        Arduino needs our local helper to compile sketches.{' '}
                        <a href="/local-setup" target="_blank" rel="noreferrer">
                          Open the setup guide ↗
                        </a>
                      </div>
                      <label className="field-label">
                        Helper token
                        <input
                          type="password"
                          autoComplete="off"
                          placeholder="Paste the token printed by bridge.py"
                          value={bridgeToken}
                          onChange={(e) => setBridgeToken(e.target.value)}
                        />
                      </label>
                      <button
                        className="secondary wide"
                        disabled={!!busy || !bridgeToken}
                        onClick={() =>
                          void task('Finding ports', async () => {
                            const data = await bridgeRequest<{
                              ports: BridgePort[];
                              arduinoCli: boolean;
                            }>(bridgeToken, '/ports');
                            setBridgePorts(data.ports);
                            if (!data.arduinoCli)
                              notify(
                                'Install Arduino CLI and the arduino:avr core before uploading. See the setup guide.',
                              );
                          })
                        }
                      >
                        <Usb size={16} /> Refresh local ports
                      </button>
                      <label className="field-label">
                        Board port
                        <select value={bridgePort} onChange={(e) => setBridgePort(e.target.value)}>
                          <option value="">Select a port</option>
                          {bridgePorts.map((p) => (
                            <option key={p.device} value={p.device}>
                              {p.device} · {p.description}
                            </option>
                          ))}
                        </select>
                      </label>
                      {board === 'nano' ? (
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={oldNano}
                            onChange={(e) => setOldNano(e.target.checked)}
                          />{' '}
                          My Nano uses the old bootloader
                        </label>
                      ) : null}
                    </>
                  )}
                  <button
                    className="primary wide"
                    disabled={
                      !!busy ||
                      (board === 'esp32'
                        ? !supported || portIndex === ''
                        : !bridgeToken || !bridgePort)
                    }
                    onClick={connect}
                  >
                    {busy ? <LoaderCircle className="spin" size={17} /> : <Plug size={17} />}{' '}
                    {busy || 'Connect & check board'}
                  </button>
                </>
              ) : null}
              {modal === 'firmware' ? (
                <>
                  <span className="modal-icon">
                    <CircuitBoard size={24} />
                  </span>
                  <h2 id="modal-title">Give your ESP32 its superpower.</h2>
                  <p>
                    We couldn’t reach the Python console. If you already installed MicroPython,
                    release BOOT, press RESET and reconnect first. A missing reply doesn’t mean your
                    firmware is missing.
                  </p>
                  <div className="callout">
                    For classic ESP32 / WROOM only. ESP32-S2, S3, C3 and C6 are not supported in v1.
                  </div>
                  <div className="callout">
                    <Check size={18} />
                    <span>
                      MicroPython v1.29.0 is included. Install it directly—no file download or
                      selection needed. We’ll restart and check your board afterwards.
                    </span>
                  </div>
                  <label className="check-label erase-warning">
                    <input
                      type="checkbox"
                      checked={eraseConfirmed}
                      disabled={!!busy}
                      onChange={(e) => setEraseConfirmed(e.target.checked)}
                    />{' '}
                    I understand this erases the board’s existing firmware and files.
                  </label>
                  {busy ? (
                    <>
                      <progress max={100} value={progress} />
                      <p>{progress}% · Keep your USB cable connected.</p>
                    </>
                  ) : null}
                  <button
                    className="primary wide"
                    disabled={!!busy || !eraseConfirmed}
                    onClick={flash}
                  >
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Zap size={16} />}{' '}
                    {busy || 'Install MicroPython'}
                  </button>
                  <button
                    className="text-button wide"
                    disabled={!!busy}
                    onClick={() => {
                      setConnection('offline');
                      setModal('connect');
                    }}
                  >
                    Reconnect without installing
                  </button>
                </>
              ) : null}
              {modal === 'projects' ? (
                <>
                  <span className="modal-icon">
                    <FolderOpen size={24} />
                  </span>
                  <h2 id="modal-title">Your next big idea starts here.</h2>
                  <p>
                    Your current project saves automatically in this browser. Export a copy to move
                    it to another computer.
                  </p>
                  <div className="project-options">
                    <button
                      className="secondary"
                      disabled={!state}
                      onClick={() => {
                        downloadFile(
                          fileBase + '.labs.json',
                          JSON.stringify(project(), null, 2),
                          'application/json',
                        );
                        notify('Project exported. Keep this file as your backup.');
                      }}
                    >
                      <Save size={18} /> Export project
                    </button>
                    <button
                      className="secondary"
                      disabled={!!busy}
                      onClick={() => importInput.current?.click()}
                    >
                      <FolderOpen size={18} /> Open project
                    </button>
                    <button className="secondary" onClick={() => void loadExample('blank')}>
                      <Plus size={18} /> New invention
                    </button>
                  </div>
                  <h3>Try a starter project</h3>
                  {examples.map((e) => (
                    <button
                      key={e.id}
                      className="project-example"
                      onClick={() => void loadExample(e.id)}
                    >
                      <e.icon size={19} />
                      <span>
                        <strong>{e.name}</strong>
                        <small>{e.description}</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </>
              ) : null}
              {modal === 'help' ? (
                <>
                  <span className="modal-icon">
                    <BookOpen size={24} />
                  </span>
                  <h2 id="modal-title">From a block to a little magic.</h2>
                  <QuickGuide board={board} />
                  <a
                    href="/local-setup"
                    className="secondary wide"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Usb size={16} /> Board setup & troubleshooting
                  </a>
                  <p className="fine-print">
                    ESP32 GPIO uses 3.3 V. Uno/Nano/Mega use 5 V. Use a resistor for external LEDs;
                    keep inputs within your board’s voltage limits. Nothing runs on hardware until
                    you connect and press Run or Upload.
                  </p>
                </>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
