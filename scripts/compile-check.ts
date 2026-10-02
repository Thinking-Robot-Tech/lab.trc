import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as Blockly from 'blockly/core';
import { boards, BoardId } from '../src/lib/boards';
import { generate, registerBlocks, starter } from '../src/lib/blocks';

const cli = process.env.ARDUINO_CLI || 'arduino-cli';
const config = process.env.ARDUINO_CONFIG;
for (const board of ['uno', 'nano', 'mega'] as BoardId[]) {
  registerBlocks(board);
  for (const example of ['blink', 'hello', 'sensor'] as const) {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(starter(example), ws);
    const result = generate(ws, board);
    ws.dispose();
    if (result.errors.length) throw new Error(result.errors.join('\n'));
    const folder = resolve('test-results', `sketch_${board}_${example}`);
    mkdirSync(folder, { recursive: true });
    writeFileSync(resolve(folder, `sketch_${board}_${example}.ino`), result.code);
    const args = [
      ...(config ? ['--config-file', config] : []),
      'compile',
      '--fqbn',
      boards[board].fqbn,
      '--build-path',
      resolve('test-results', 'build', `${board}_${example}`),
      folder,
    ];
    const compiled = spawnSync(cli, args, { encoding: 'utf8', timeout: 120000 });
    if (compiled.status !== 0)
      throw new Error(
        `${board}/${example}: ${compiled.error || compiled.stderr || compiled.stdout}`,
      );
    console.log(`PASS ${board}/${example}: ${compiled.stdout.trim().split('\n')[0]}`);
  }
}
