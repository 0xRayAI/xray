/**
 * Goggles MCP. Stdio. Server name `goggles`.
 * Tools: look, status_lens. Same organ as the CLI.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as bundled from './goggles-pipeline.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SERVER_NAME = 'goggles';
/** Card planes come from the organ, not a hand-kept copy. */
const CARD_PLANES = Array.isArray(bundled.CARD_PLANES) ? bundled.CARD_PLANES : [];

const LOOK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    plane: {
      type: 'string',
      description: 'A plane, or the card for one thing. Omit it to read the current card.',
    },
  },
};

export const TOOLS = [
  {
    name: 'look',
    description: 'The card for this plane, or for one thing on it. Entry and Exit, and the other rows, are in LENS.md. A missing plate names the stamp-plate skill.',
    inputSchema: LOOK_SCHEMA,
  },
  {
    name: 'status_lens',
    description: 'Whether the organ is worn. A missing organ is not a card.',
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

function checkArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return deny('invalid_args', 'look takes an object.');
  }
  const allowed = new Set(['plane']);
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) return deny('invalid_args', 'Unknown argument.');
  }
  if (args.plane == null) return null;
  if (typeof args.plane !== 'string') return deny('invalid_args', 'plane must be a string.');
  if (typeof bundled.isCardName !== 'function' || !bundled.isCardName(args.plane)) return deny('invalid_args', 'Name one plane.');
  return null;
}

function publicCard(view) {
  const notes = [];
  if (typeof view.exam === 'string' && view.exam.startsWith('Drift:')) notes.push(view.exam);
  return {
    plane: view.plane,
    from: view.from || '',
    digest: view.digest || '',
    plate: view.plate || '',
    entry: view.entry || '',
    exit: view.exit || '',
    files: Array.isArray(view.files) ? view.files : [],
    skills: view.skills ? String(view.skills) : '',
    setup: view.setup || '',
    teardown: view.teardown || '',
    worn: view.worn || '',
    card: view.card || view.plane || '',
    stamp: view.stamp || '',
    notes,
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
  const argv = args.plane == null ? [] : [args.plane];
  const text = api.look(argv, here).text;
  if (text === 'Name one plane.') return deny('name_one', 'Name one plane.');
  const cards = api.lookCards(argv, here);
  if (!Array.isArray(cards) || !cards.length) return deny('name_one', 'Name one plane.');
  const shown = cards.map(publicCard);
  if (shown.length === 1 && shown[0]) {
    const heldName = shown[0].card || shown[0].plane;
    if (heldName) api.holdPlane(here, heldName);
  }
  return {
    ok: true,
    quiet: false,
    mode: 'card',
    content: shown.length === 1 ? shown[0] : shown,
  };
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
  return {
    ok: true,
    organ: worn ? 'worn' : 'not_found',
    organPath: organOk ? organPath : '',
    planesPath: planesOk ? planesPath : '',
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
