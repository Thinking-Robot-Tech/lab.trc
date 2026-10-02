import { isBoard, BoardId } from './boards';
import type { WorkspaceState } from './blocks';
export type Project = { version: 1; name: string; board: BoardId; workspace: WorkspaceState };
export function parseProject(text: string): Project {
  if (text.length > 2000000)
    throw new Error('This project is too large. Choose a Labs project under 2 MB.');
  const data = JSON.parse(text);
  if (
    !data ||
    typeof data !== 'object' ||
    data.version !== 1 ||
    !isBoard(data.board) ||
    typeof data.name !== 'string' ||
    !data.workspace ||
    typeof data.workspace !== 'object' ||
    (data.workspace.blocks !== undefined &&
      (!data.workspace.blocks || !Array.isArray(data.workspace.blocks.blocks)))
  )
    throw new Error('This is not a valid Labs v1 project. Choose a .labs.json file.');
  let count = 0;
  const walk = (node: unknown, depth = 0) => {
    if (depth > 100 || ++count > 20000) throw new Error('This project is too complex.');
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (
        'type' in record &&
        (typeof record.type !== 'string' ||
          !/^lab_(start|forever|repeat|wait|print|if|compare|number|text|math|led|pin|read|analog)$/.test(
            record.type,
          ))
      )
        throw new Error('This project contains unsupported blocks.');
      Object.values(record).forEach((v) => walk(v, depth + 1));
    }
  };
  walk(data.workspace);
  return {
    version: 1,
    name: data.name.slice(0, 80) || 'My invention',
    board: data.board,
    workspace: data.workspace,
  };
}
export function downloadFile(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
