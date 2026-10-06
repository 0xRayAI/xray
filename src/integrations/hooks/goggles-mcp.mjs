/**
 * Goggles MCP. Stdio. Server name `goggles`.
 * Tools: look, status_lens. Same organ as the CLI.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as bundled from './goggles-pipeline.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVER_NAME = 'goggles';
const CARD_PLANES = [
  'ground',
  'routing',
  'house',
  'boot',
  'governance',
  'memory-recall',
  'orchestration',
  'processor',
  'reporting',
];
const SCOPES = ['ecosystem', 'part', 'one flow', 'one artifact'];

const LOOK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: {
      type: 'string',
      description: 'Optional. Use "0" or "actuality" for the lens. Omit when naming an outer.',
      enum: ['0', 'actuality'],
    },
    outer: {
      type: 'string',
      description: 'One outer name. digest and triage return a card. The others return a reading.',
      enum: ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'],
    },
    scope: {
      type: 'string',
      description: 'Zoom only. Not a kind. One level.',
      enum: SCOPES,
    },
    plane: {
      type: 'string',
      description: 'Card plane for digest or triage only. Not the lens.',
      enum: CARD_PLANES,
    },
  },
};

export const TOOLS = [
  {
    name: 'look',
    description: 'Kind 0 is quiet on a match. It checks the six outer names. One outer is a reading. digest and triage return a card.',
    inputSchema: LOOK_SCHEMA,
  },
  {
    name: 'status_lens',
    description: 'Whether the organ is worn, and the last Kind 0. Quiet is a match. A missing organ is not drift.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
];

function serverVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(HERE, '../../../package.json'), 'utf8'));
    return typeof pkg.version === 'string' && pkg.version ? pkg.version : 'local';
  } catch {
    return 'local';
  }
}

function deny(code, reason) {
  return {
    ok: false,
    quiet: false,
    mode: 'deny',
    content: '',
    error: { gate: 'goggles', decision: 'deny', code, reason },
  };
}

function quiet(mode) {
  return { ok: true, quiet: true, mode, content: '' };
}

async function organApi() {
  const override = typeof process.env.GOGGLES_ORGAN_PATH === 'string'
    ? process.env.GOGGLES_ORGAN_PATH.trim()
    : '';
  if (!override) return bundled;
  if (!existsSync(override)) return null;
  return import(pathToFileURL(override).href);
}

function projectRoot(root) {
  if (typeof root === 'string' && root.trim()) return root;
  const env = process.env.GOGGLES_ROOT;
  if (typeof env === 'string' && env.trim() && env.trim() !== '.') return env.trim();
  return process.cwd();
}

function argvFrom(args) {
  const words = [];
  if (args.kind === '0') words.push('kind', '0');
  else if (args.kind === 'actuality') words.push('actuality');
  else if (args.kind === '1' || args.kind === '2') words.push('kind', String(args.kind));
  else if (typeof args.kind === 'string') words.push(args.kind);
  if (args.outer === 'outer loop') words.push('outer', 'loop');
  else if (typeof args.outer === 'string') words.push(args.outer);
  if (typeof args.plane === 'string') words.push(args.plane);
  if (args.scope === 'one flow') words.push('one', 'flow');
  else if (args.scope === 'one artifact') words.push('one', 'artifact');
  else if (typeof args.scope === 'string') words.push(args.scope);
  return words;
}

function pureKind0(args) {
  return (args.kind === '0' || args.kind === 'actuality')
    && args.outer == null
    && args.plane == null
    && args.scope == null;
}

function checkArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return deny('invalid_args', 'look takes an object.');
  }
  const allowed = new Set(['kind', 'outer', 'scope', 'plane']);
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) return deny('invalid_args', 'Unknown argument.');
  }
  for (const key of ['kind', 'outer', 'scope', 'plane']) {
    if (args[key] != null && typeof args[key] !== 'string') {
      return deny('invalid_args', `${key} must be a string.`);
    }
  }
  if (args.kind != null && !['0', 'actuality', '1', '2'].includes(args.kind)) {
    return deny('invalid_args', 'kind is 0 or actuality.');
  }
  if (args.outer != null && !LOOK_SCHEMA.properties.outer.enum.includes(args.outer)) {
    const setName = args.outer === 'outer' || args.outer === 'outer-loop' || args.outer === 'outer loop';
    if (!setName) return deny('invalid_args', 'Name one outer.');
  }
  if (args.scope != null && !SCOPES.includes(args.scope)) {
    return deny('invalid_args', 'scope is one zoom level.');
  }
  if (args.plane != null && !CARD_PLANES.includes(args.plane)) {
    return deny('invalid_args', 'plane is a card plane.');
  }
  return null;
}

function publicCard(view) {
  const notes = [];
  if (view.flavor === 'triage') {
    if (Array.isArray(view.empty) && view.empty.length) notes.push(`Empty: ${view.empty.join(', ')}`);
    if (view.exam) notes.push(view.exam);
  }
  const skills = view.skills ? basename(String(view.skills)) : '';
  const cascade = view.cascade
    ? {
      plane: view.cascade.plane,
      station: view.cascade.station,
      notesPage: view.cascade.notesPage,
      index: view.cascade.index,
      laws: Array.isArray(view.cascade.laws) ? view.cascade.laws : [],
      notes: Array.isArray(view.cascade.notes) ? view.cascade.notes : [],
    }
    : null;
  const sleeve = view.sleeve
    ? {
      on: Boolean(view.sleeve.on),
      missing: Array.isArray(view.sleeve.missing) ? view.sleeve.missing : [],
      stitches: Array.isArray(view.sleeve.stitches)
        ? view.sleeve.stitches.map((row) => ({
          name: String(row && row.name || ''),
          on: Boolean(row && row.on),
          at: Array.isArray(row && row.at) ? row.at.map((item) => String(item)) : [],
        }))
        : [],
    }
    : null;
  if (view.narrow) {
    return {
      plane: view.plane,
      flavor: view.flavor,
      digest: view.digest || '',
      files: Array.isArray(view.files) ? view.files : [],
      notes,
      ...(cascade ? { cascade } : {}),
      ...(sleeve ? { sleeve } : {}),
    };
  }
  return {
    plane: view.plane,
    flavor: view.flavor,
    from: view.from || '',
    digest: view.digest || '',
    plate: view.plate || '',
    entry: view.entry || '',
    exit: view.exit || '',
    files: Array.isArray(view.files) ? view.files : [],
    skills,
    setup: view.setup || '',
    teardown: view.teardown || '',
    worn: view.worn || '',
    notes,
    ...(cascade ? { cascade } : {}),
    ...(sleeve ? { sleeve } : {}),
  };
}

export async function answerLook(raw, root) {
  if (raw != null && (typeof raw !== 'object' || Array.isArray(raw))) {
    return deny('invalid_args', 'look takes an object.');
  }
  const args = raw && typeof raw === 'object' ? raw : {};
  const bad = checkArgs(args);
  if (bad) return bad;
  const api = await organApi();
  if (!api) return deny('invalid_args', 'Goggles organ not found.');
  const here = projectRoot(root);
  if (pureKind0(args)) {
    api.maintainLens(here);
    const line = api.actualityLine();
    if (!line) return quiet('kind0');
    return { ok: true, quiet: false, mode: 'kind0', content: line };
  }
  const argv = argvFrom(args);
  const text = api.look(argv, here).text;
  if (text === 'Name one plane.') return deny('name_one', 'Name one plane.');
  const cards = api.lookCards(argv, here);
  if (Array.isArray(cards) && cards.length) {
    const shown = cards.map(publicCard);
    return {
      ok: true,
      quiet: false,
      mode: 'card',
      content: shown.length === 1 ? shown[0] : shown,
      outer: args.outer,
      scope: args.scope || null,
    };
  }
  if (!text) {
    if (args.kind === '0' || args.kind === 'actuality') return quiet('kind0');
    if (args.outer === 'digest' || args.outer === 'triage') return quiet('card');
    return quiet('reading');
  }
  if (text.startsWith('Actuality. Drift:')) {
    return { ok: true, quiet: false, mode: 'kind0', content: text };
  }
  return {
    ok: true,
    quiet: false,
    mode: 'reading',
    content: text,
    outer: args.outer ?? null,
    scope: args.scope || null,
  };
}

function lensBody(root) {
  const file = join(root, '.xray', 'state', 'LENS.md');
  if (!existsSync(file)) return { found: false, text: '' };
  try {
    return { found: true, text: readFileSync(file, 'utf8').trim() };
  } catch {
    return { found: false, text: '' };
  }
}

export async function answerStatus(root) {
  const api = await organApi();
  const override = typeof process.env.GOGGLES_ORGAN_PATH === 'string'
    ? process.env.GOGGLES_ORGAN_PATH.trim()
    : '';
  const organPath = override || fileURLToPath(new URL('./goggles-pipeline.mjs', import.meta.url));
  const planesPath = api ? api.planesFile() : '';
  const organOk = existsSync(organPath);
  const planesOk = Boolean(planesPath) && existsSync(planesPath);
  const worn = Boolean(api) && organOk && planesOk;
  const here = projectRoot(root);
  const lens = lensBody(here);
  let kind0 = 'none';
  let kind0Text = '';
  if (lens.found && (!lens.text || lens.text === 'quiet (match)')) kind0 = 'quiet';
  else if (lens.found) {
    kind0 = 'drift';
    kind0Text = lens.text;
  } else if (worn) {
    const line = api.actualityLine();
    if (line) {
      kind0 = 'drift';
      kind0Text = line;
    }
  }
  return {
    ok: true,
    organ: worn ? 'worn' : 'not_found',
    organPath: organOk ? organPath : '',
    planesPath: planesOk ? planesPath : '',
    kind0,
    kind0Text,
    lensPath: '.xray/state/LENS.md',
  };
}

export async function dispatchTool(name, args, root) {
  const bare = String(name || '').replace(/^goggles__/, '');
  if (bare === 'status_lens') {
    const input = args && typeof args === 'object' ? args : {};
    if (Object.keys(input).length) {
      return { payload: deny('invalid_args', 'status_lens takes no arguments.'), isError: true };
    }
    return { payload: await answerStatus(root), isError: false };
  }
  if (bare === 'look') {
    const payload = await answerLook(args, root);
    return { payload, isError: payload.mode === 'deny' };
  }
  return { payload: deny('invalid_args', 'Unknown tool.'), isError: true };
}

export function createGogglesServer() {
  const server = new Server(
    { name: SERVER_NAME, version: serverVersion() },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};
    const { payload, isError } = await dispatchTool(request.params.name, args, projectRoot());
    return {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      isError,
    };
  });
  return server;
}

async function main() {
  const server = createGogglesServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function sameInvoked(argvPath, modulePath) {
  try {
    return realpathSync(argvPath) === realpathSync(modulePath);
  } catch {
    return resolve(argvPath) === resolve(modulePath);
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && sameInvoked(process.argv[1], thisFile)) {
  main().catch((err) => {
    process.stderr.write(`goggles MCP failed: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
