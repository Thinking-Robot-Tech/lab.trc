import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import { BoardId, ThemeId } from '@/lib/boards';
import { generate, registerBlocks, starter, toolbox, WorkspaceState } from '@/lib/blocks';

type Props = {
  board: BoardId;
  theme: ThemeId;
  state: WorkspaceState | null;
  onChange: (state: WorkspaceState, code: string, errors: string[], count: number) => void;
  onReady: (workspace: Blockly.WorkspaceSvg | null) => void;
};
export default function BlockEditor({ board, theme, state, onChange, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const change = useRef(onChange);
  const ready = useRef(onReady);
  const initial = useRef(state);
  useEffect(() => {
    change.current = onChange;
    ready.current = onReady;
    initial.current = state;
  }, [onChange, onReady, state]);
  useEffect(() => {
    Blockly.setLocale(
      Object.fromEntries(
        Object.entries(En).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      ),
    );
    registerBlocks(board);
    const dark = theme === 'midnight';
    const blockTheme = Blockly.Theme.defineTheme(`labs-${theme}`, {
      name: `labs-${theme}`,
      base: Blockly.Themes.Classic,
      fontStyle: { family: 'Arial, sans-serif', weight: '600', size: 12 },
      componentStyles: {
        workspaceBackgroundColour: dark ? '#20242b' : theme === 'candy' ? '#fff5f8' : '#f5f6f8',
        toolboxBackgroundColour: dark ? '#191d23' : '#ffffff',
        toolboxForegroundColour: dark ? '#dce2ed' : '#40516a',
        flyoutBackgroundColour: dark ? '#292e37' : '#eef1f6',
        flyoutForegroundColour: dark ? '#dce2ed' : '#40516a',
        flyoutOpacity: 1,
        scrollbarColour: dark ? '#566071' : '#c0c7d2',
        insertionMarkerColour: '#7761dd',
        insertionMarkerOpacity: 0.4,
      },
    });
    Blockly.Scrollbar.scrollbarThickness = 6;
    const ws = Blockly.inject(host.current!, {
      toolbox,
      media: '/blockly/media/',
      theme: blockTheme,
      renderer: 'zelos',
      grid: { spacing: 24, length: 2, colour: dark ? '#3a414b' : '#d8dce4', snap: true },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.78,
        maxScale: 1.6,
        minScale: 0.45,
        scaleSpeed: 1.1,
      },
      move: { scrollbars: true, drag: true, wheel: true },
      trashcan: true,
      sounds: false,
    });
    workspace.current = ws;
    try {
      Blockly.serialization.workspaces.load(initial.current || starter('blink'), ws);
    } catch {
      Blockly.serialization.workspaces.load(starter('blank'), ws);
    }
    const report = () => {
      const result = generate(ws, board);
      change.current(
        Blockly.serialization.workspaces.save(ws),
        result.code,
        result.errors,
        result.count,
      );
    };
    const syncFlyout = () => {
      const flyout = ws.getFlyout();
      host.current?.classList.toggle('flyout-open', !!flyout?.isVisible());
      flyout?.getWorkspace().scrollbar?.setContainerVisible(!!flyout.isVisible());
    };
    let flyoutFrame = 0;
    const listener = (event: Blockly.Events.Abstract) => {
      if (!event.isUiEvent) report();
      cancelAnimationFrame(flyoutFrame);
      flyoutFrame = requestAnimationFrame(syncFlyout);
    };
    ws.addChangeListener(listener);
    report();
    syncFlyout();
    ready.current(ws);
    const observer = new ResizeObserver(() => {
      Blockly.svgResize(ws);
      syncFlyout();
    });
    observer.observe(host.current!);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(flyoutFrame);
      ws.removeChangeListener(listener);
      ready.current(null);
      ws.dispose();
      workspace.current = null;
    };
  }, [board, theme]);
  return <div ref={host} className="blockly-host" aria-label="Block coding workspace" />;
}
