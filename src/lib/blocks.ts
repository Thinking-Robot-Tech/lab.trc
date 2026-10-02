import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { boards, BoardId } from './boards';

let activeBoard: BoardId = 'esp32';
const dropdown = (kind: 'pins' | 'inputs' | 'analogPins') => () =>
  boards[activeBoard][kind].map((p) => [p, p] as [string, string]);
export function registerBlocks(board: BoardId) {
  activeBoard = board;
  if (Blockly.Blocks.lab_start) return;
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'lab_start',
      message0: 'when my board starts %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
      colour: '#e3a12e',
      tooltip: 'Your program begins here. Add your blocks inside.',
      hat: 'cap',
    },
    {
      type: 'lab_forever',
      message0: 'repeat forever %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#8c65db',
      tooltip: 'Keep doing the blocks inside until you stop your board.',
    },
    {
      type: 'lab_repeat',
      message0: 'repeat %1 times %2 %3',
      args0: [
        { type: 'field_number', name: 'TIMES', value: 5, min: 1, max: 10000, precision: 1 },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#8c65db',
      tooltip: 'Repeat the blocks inside a number of times.',
    },
    {
      type: 'lab_wait',
      message0: 'wait %1 seconds',
      args0: [{ type: 'field_number', name: 'SECONDS', value: 1, min: 0.01, max: 3600 }],
      previousStatement: null,
      nextStatement: null,
      colour: '#8c65db',
      tooltip: 'Pause before the next block.',
    },
    {
      type: 'lab_print',
      message0: 'say %1 in the monitor',
      args0: [{ type: 'input_value', name: 'VALUE' }],
      previousStatement: null,
      nextStatement: null,
      colour: '#49a789',
      tooltip: 'Show a message or a sensor value in the serial monitor.',
    },
    {
      type: 'lab_if',
      message0: 'if %1 %2 then %3 else %4',
      args0: [
        { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
        { type: 'input_statement', name: 'ELSE' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: '#e18a4b',
      tooltip: 'Choose what happens using a true or false condition.',
    },
    {
      type: 'lab_compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['=', '=='],
            ['>', '>'],
            ['<', '<'],
            ['≠', '!='],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      output: 'Boolean',
      colour: '#e18a4b',
      tooltip: 'Compare two numbers or sensor readings.',
    },
    {
      type: 'lab_number',
      message0: '%1',
      args0: [{ type: 'field_number', name: 'VALUE', value: 0 }],
      output: 'Number',
      colour: '#5798da',
    },
    {
      type: 'lab_text',
      message0: '“ %1 ”',
      args0: [{ type: 'field_input', name: 'VALUE', text: 'Hello, world!' }],
      output: 'String',
      colour: '#49a789',
    },
    {
      type: 'lab_math',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['+', '+'],
            ['−', '-'],
            ['×', '*'],
            ['÷', '/'],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      output: 'Number',
      colour: '#5798da',
    },
  ]);
  Blockly.Blocks.lab_led = {
    init() {
      this.appendDummyInput()
        .appendField('turn built-in LED')
        .appendField(
          new Blockly.FieldDropdown([
            ['on', '1'],
            ['off', '0'],
          ]),
          'STATE',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#5798da');
      this.setTooltip(
        'Control the built-in LED. Some ESP32 boards need an external LED on GPIO 2.',
      );
    },
  };
  Blockly.Blocks.lab_pin = {
    init() {
      this.appendDummyInput()
        .appendField('set pin')
        .appendField(new Blockly.FieldDropdown(dropdown('pins')), 'PIN')
        .appendField('to')
        .appendField(
          new Blockly.FieldDropdown([
            ['HIGH (on)', '1'],
            ['LOW (off)', '0'],
          ]),
          'STATE',
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('#5798da');
      this.setTooltip('Turn a digital output on or off. Use a resistor with an LED.');
    },
  };
  Blockly.Blocks.lab_read = {
    init() {
      this.appendDummyInput()
        .appendField('read digital pin')
        .appendField(new Blockly.FieldDropdown(dropdown('inputs')), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour('#df7594');
      this.setTooltip('Read 0 or 1 from a digital input. Inputs use a pull-up where supported.');
    },
  };
  Blockly.Blocks.lab_analog = {
    init() {
      this.appendDummyInput()
        .appendField('read analog pin')
        .appendField(new Blockly.FieldDropdown(dropdown('analogPins')), 'PIN');
      this.setOutput(true, 'Number');
      this.setColour('#df7594');
      this.setTooltip('Read a sensor: ESP32 0–4095, Arduino 0–1023.');
    },
  };
}

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Start',
      colour: '#e3a12e',
      contents: [{ kind: 'block', type: 'lab_start' }],
    },
    {
      kind: 'category',
      name: 'Light & pins',
      colour: '#5798da',
      contents: [
        { kind: 'block', type: 'lab_led' },
        { kind: 'block', type: 'lab_pin' },
      ],
    },
    {
      kind: 'category',
      name: 'Loops & time',
      colour: '#8c65db',
      contents: [
        { kind: 'block', type: 'lab_forever' },
        { kind: 'block', type: 'lab_repeat' },
        { kind: 'block', type: 'lab_wait' },
      ],
    },
    {
      kind: 'category',
      name: 'Sensors',
      colour: '#df7594',
      contents: [
        { kind: 'block', type: 'lab_read' },
        { kind: 'block', type: 'lab_analog' },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: '#e18a4b',
      contents: [
        { kind: 'block', type: 'lab_if' },
        {
          kind: 'block',
          type: 'lab_compare',
          inputs: { A: { shadow: { type: 'lab_number' } }, B: { shadow: { type: 'lab_number' } } },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Numbers',
      colour: '#5798da',
      contents: [
        { kind: 'block', type: 'lab_number' },
        {
          kind: 'block',
          type: 'lab_math',
          inputs: { A: { shadow: { type: 'lab_number' } }, B: { shadow: { type: 'lab_number' } } },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Messages',
      colour: '#49a789',
      contents: [
        { kind: 'block', type: 'lab_print', inputs: { VALUE: { shadow: { type: 'lab_text' } } } },
        { kind: 'block', type: 'lab_text' },
      ],
    },
  ],
};

export type WorkspaceState = ReturnType<typeof Blockly.serialization.workspaces.save>;
const wait = (next?: object) => ({
  type: 'lab_wait',
  fields: { SECONDS: 1 },
  ...(next ? { next: { block: next } } : {}),
});
export function starter(kind: 'blink' | 'hello' | 'sensor' | 'blank'): WorkspaceState {
  let block: object | undefined;
  if (kind === 'blink')
    block = {
      type: 'lab_forever',
      inputs: {
        DO: {
          block: {
            type: 'lab_led',
            fields: { STATE: '1' },
            next: {
              block: wait({ type: 'lab_led', fields: { STATE: '0' }, next: { block: wait() } }),
            },
          },
        },
      },
    };
  if (kind === 'hello')
    block = {
      type: 'lab_print',
      inputs: {
        VALUE: { block: { type: 'lab_text', fields: { VALUE: 'Hello, Thinking Robot!' } } },
      },
    };
  if (kind === 'sensor')
    block = {
      type: 'lab_forever',
      inputs: {
        DO: {
          block: {
            type: 'lab_print',
            inputs: { VALUE: { block: { type: 'lab_analog' } } },
            next: { block: wait() },
          },
        },
      },
    };
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        { type: 'lab_start', x: 90, y: 70, ...(block ? { inputs: { DO: { block } } } : {}) },
      ],
    },
  };
}

export function generate(workspace: Blockly.Workspace, board: BoardId) {
  const py = board === 'esp32';
  const generator = new Blockly.Generator(py ? 'MicroPython' : 'Arduino');
  generator.INDENT = '    ';
  const outputs = new Set<string>();
  const inputs = new Set<string>();
  const analogs = new Set<string>();
  generator.scrub_ = (block, code, thisOnly) =>
    code + (thisOnly ? '' : generator.blockToCode(block.getNextBlock()));
  const statements = (b: Blockly.Block, name: string) =>
    generator.statementToCode(b, name) || (py ? '    pass\n' : '');
  const value = (b: Blockly.Block, name: string, fallback = '0') =>
    generator.valueToCode(b, name, 0) || fallback;
  const outputPin = (pin: string, state: string) => {
    outputs.add(pin);
    return py
      ? `pin_${pin}.value(${state})\n`
      : `digitalWrite(${pin}, ${state === '1' ? 'HIGH' : 'LOW'});\n`;
  };
  generator.forBlock.lab_start = (b) => statements(b, 'DO');
  generator.forBlock.lab_led = (b) =>
    outputPin(String(boards[board].led), b.getFieldValue('STATE'));
  generator.forBlock.lab_pin = (b) => outputPin(b.getFieldValue('PIN'), b.getFieldValue('STATE'));
  generator.forBlock.lab_wait = (b) =>
    py
      ? `sleep(${b.getFieldValue('SECONDS')})\n`
      : `delay(${Math.round(Number(b.getFieldValue('SECONDS')) * 1000)});\n`;
  generator.forBlock.lab_print = (b) =>
    py ? `print(${value(b, 'VALUE', "''")})\n` : `Serial.println(${value(b, 'VALUE', '""')});\n`;
  generator.forBlock.lab_forever = (b) =>
    py
      ? `while True:\n${statements(b, 'DO')}    sleep(0.01)\n`
      : `while (true) {\n${statements(b, 'DO')}    delay(10);\n}\n`;
  generator.forBlock.lab_repeat = (b) =>
    py
      ? `for _ in range(${b.getFieldValue('TIMES')}):\n${statements(b, 'DO')}`
      : `for (int count_${b.id.replace(/[^a-zA-Z0-9]/g, '')} = 0; count_${b.id.replace(/[^a-zA-Z0-9]/g, '')} < ${b.getFieldValue('TIMES')}; ++count_${b.id.replace(/[^a-zA-Z0-9]/g, '')}) {\n${statements(b, 'DO')}}\n`;
  generator.forBlock.lab_if = (b) =>
    py
      ? `if ${value(b, 'CONDITION', 'False')}:\n${statements(b, 'DO')}else:\n${statements(b, 'ELSE')}`
      : `if (${value(b, 'CONDITION', 'false')}) {\n${statements(b, 'DO')}} else {\n${statements(b, 'ELSE')}}\n`;
  generator.forBlock.lab_number = (b) => [String(b.getFieldValue('VALUE')), 0];
  generator.forBlock.lab_text = (b) => [JSON.stringify(b.getFieldValue('VALUE')), 0];
  generator.forBlock.lab_compare = (b) => [
    `(${value(b, 'A')} ${b.getFieldValue('OP')} ${value(b, 'B')})`,
    0,
  ];
  generator.forBlock.lab_math = (b) => [
    `(${value(b, 'A')} ${b.getFieldValue('OP')} ${py ? value(b, 'B') : `static_cast<float>(${value(b, 'B')})`})`,
    0,
  ];
  generator.forBlock.lab_read = (b) => {
    const pin = b.getFieldValue('PIN');
    inputs.add(pin);
    return [py ? `input_${pin}.value()` : `digitalRead(${pin})`, 0];
  };
  generator.forBlock.lab_analog = (b) => {
    const pin = b.getFieldValue('PIN');
    analogs.add(pin);
    return [py ? `adc_${pin}.read()` : `analogRead(${pin})`, 0];
  };
  generator.init(workspace);
  const starts = workspace
    .getTopBlocks(true)
    .filter((b) => b.type === 'lab_start' && b.isEnabled());
  const errors: string[] = [];
  if (starts.length !== 1) errors.push('Use exactly one “when my board starts” block.');
  if (workspace.getTopBlocks().some((b) => b.type !== 'lab_start' && b.isEnabled()))
    errors.push('Some blocks are floating. Snap them inside your start block.');
  for (const b of workspace.getAllBlocks(false)) {
    const kind =
      b.type === 'lab_pin'
        ? 'pins'
        : b.type === 'lab_read'
          ? 'inputs'
          : b.type === 'lab_analog'
            ? 'analogPins'
            : null;
    if (kind && !(boards[board][kind] as readonly string[]).includes(b.getFieldValue('PIN')))
      errors.push(
        `Pin ${b.getFieldValue('PIN')} is not available on ${boards[board].name}. Choose another pin.`,
      );
  }
  const raw = starts.length === 1 ? (generator.blockToCode(starts[0]) as string) : '';
  const body = raw
    .split('\n')
    .map((line) => (line.startsWith('    ') ? line.slice(4) : line))
    .join('\n');
  for (const pin of outputs)
    if (inputs.has(pin) || analogs.has(pin))
      errors.push(`Pin ${pin} is used as both input and output. Choose separate pins.`);
  for (const pin of inputs)
    if (analogs.has(pin))
      errors.push(`Pin ${pin} is used as both digital and analog input. Choose one mode.`);
  const setup = py
    ? [
        ...[...outputs].map((p) => `pin_${p} = Pin(${p}, Pin.OUT)`),
        ...[...inputs].map(
          (p) =>
            `input_${p} = Pin(${p}, Pin.IN${['34', '35', '36', '39'].includes(p) ? '' : ', Pin.PULL_UP'})`,
        ),
        ...[...analogs].flatMap((p) => [
          `adc_${p} = ADC(Pin(${p}))`,
          `adc_${p}.atten(ADC.ATTN_11DB)`,
        ]),
      ].join('\n')
    : [
        ...[...outputs].map((p) => `    pinMode(${p}, OUTPUT);`),
        ...[...inputs].map((p) => `    pinMode(${p}, INPUT_PULLUP);`),
      ].join('\n');
  const code = py
    ? `# Made with Thinking Robot Labs\nfrom machine import Pin, ADC\nfrom time import sleep\n\n${setup}${setup ? '\n\n' : ''}${body}`
    : `// Made with Thinking Robot Labs\n#include <Arduino.h>\n\nvoid setup() {\n    Serial.begin(115200);\n${setup}${setup ? '\n' : ''}${body
        .split('\n')
        .filter((line, i, all) => i < all.length - 1 || line)
        .map((l) => '    ' + l)
        .join(
          '\n',
        )}\n}\n\nvoid loop() {\n    // Add a repeat forever block to keep your program running.\n}\n`;
  generator.finish('');
  return {
    code,
    errors: [...new Set(errors)],
    count: workspace.getAllBlocks(false).filter((b) => !b.isShadow()).length,
  };
}
