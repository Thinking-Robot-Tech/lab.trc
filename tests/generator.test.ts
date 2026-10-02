import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import * as Blockly from 'blockly/core';
import { generate, registerBlocks, starter, WorkspaceState } from '../src/lib/blocks';
import { BoardId } from '../src/lib/boards';
import { parseProject } from '../src/lib/project';

function output(board: BoardId, state: WorkspaceState) {
  registerBlocks(board);
  const ws = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(state, ws);
    return generate(ws, board);
  } finally {
    ws.dispose();
  }
}
test('all starters generate valid Python with nested indentation', () => {
  for (const kind of ['blink', 'hello', 'sensor', 'blank'] as const) {
    const result = output('esp32', starter(kind));
    assert.deepEqual(result.errors, []);
    const python = spawnSync(
      process.env.PYTHON || 'python',
      ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
      { input: result.code, encoding: 'utf8' },
    );
    assert.equal(python.status, 0, python.stderr);
  }
  assert.match(
    output('esp32', starter('blink')).code,
    /while True:\n    pin_2.value\(1\)\n    sleep\(1\)/,
  );
});
test('Arduino boards generate hardware-specific setup and sketch', () => {
  for (const board of ['uno', 'nano', 'mega'] as const) {
    const result = output(board, starter('blink'));
    assert.deepEqual(result.errors, []);
    assert.match(result.code, /pinMode\(13, OUTPUT\)/);
    assert.match(result.code, /digitalWrite\(13, HIGH\)/);
    assert.match(result.code, /delay\(1000\)/);
    assert.match(result.code, /void loop\(\)/);
    assert.doesNotMatch(result.code, /from machine/);
  }
});
test('duplicate start and floating blocks block upload', () => {
  const state = starter('blank');
  state.blocks.blocks.push({ type: 'lab_start', x: 20, y: 20 }, { type: 'lab_wait', x: 40, y: 40 });
  assert.equal(output('esp32', state).errors.length, 2);
});
test('input-output pin conflicts are surfaced', () => {
  const state: WorkspaceState = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'lab_start',
          inputs: {
            DO: {
              block: {
                type: 'lab_pin',
                fields: { PIN: '4', STATE: '1' },
                next: {
                  block: {
                    type: 'lab_print',
                    inputs: { VALUE: { block: { type: 'lab_read', fields: { PIN: '4' } } } },
                  },
                },
              },
            },
          },
        },
      ],
    },
  };
  assert.match(output('esp32', state).errors.join(' '), /both input and output/);
});
test('nested conditionals and repeats preserve valid Python', () => {
  const compare = {
    type: 'lab_compare',
    fields: { OP: '>' },
    inputs: {
      A: { block: { type: 'lab_number', fields: { VALUE: 3 } } },
      B: { block: { type: 'lab_number', fields: { VALUE: 2 } } },
    },
  };
  const condition = {
    type: 'lab_if',
    inputs: {
      CONDITION: { block: compare },
      DO: { block: { type: 'lab_led', fields: { STATE: '1' } } },
    },
  };
  const repeat = { type: 'lab_repeat', fields: { TIMES: 3 }, inputs: { DO: { block: condition } } };
  const state: WorkspaceState = {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'lab_start', inputs: { DO: { block: repeat } } }],
    },
  };
  const result = output('esp32', state);
  const python = spawnSync(
    process.env.PYTHON || 'python',
    ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
    { input: result.code, encoding: 'utf8' },
  );
  assert.equal(python.status, 0, python.stderr);
  assert.match(result.code, /for _ in range\(3\):\n    if \(3 > 2\):\n        pin_2.value\(1\)/);
});
test('projects round trip and reject unsupported or oversized imports', () => {
  const project = { version: 1, name: 'Little maker', board: 'esp32', workspace: starter('blink') };
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  assert.deepEqual(parseProject(JSON.stringify({ ...project, workspace: {} })).workspace, {});
  assert.throws(() => parseProject('null'), /not a valid Labs/);
  assert.throws(() => parseProject(JSON.stringify({ ...project, board: 'unknown' })));
  assert.throws(() =>
    parseProject(
      JSON.stringify({
        ...project,
        workspace: { blocks: { blocks: [{ type: 'javascript_eval' }] } },
      }),
    ),
  );
  assert.throws(() => parseProject('x'.repeat(2000001)));
});
