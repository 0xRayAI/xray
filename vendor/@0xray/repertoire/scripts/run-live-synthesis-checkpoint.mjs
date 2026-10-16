#!/usr/bin/env node
/**
 * Live synthesis checkpoint driver — repertoire core (real .xray/state, not tmp).
 *
 * Usage:
 *   node scripts/run-live-synthesis-checkpoint.mjs seed [--session-id=ID]
 *   node scripts/run-live-synthesis-checkpoint.mjs status
 *   node scripts/run-live-synthesis-checkpoint.mjs complete-todo
 *     (refuses: a CLI flag must not mint PASS or clear consult todos)
 *   node scripts/run-live-synthesis-checkpoint.mjs finish
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const xrayRoot = join(root, 'node_modules/0xray');
const stateDir = join(root, '.xray', 'state');
const checkpointPath = join(stateDir, 'synthesis-checkpoint.json');
const planPath = join(stateDir, 'lead-dev-plan.json');

const DEFAULT_SESSION = 'live-synthesis-repertoire';

const log = (msg) => process.stdout.write(`${msg}\n`);
const err = (msg) => process.stderr.write(`${msg}\n`);

function parseSessionId() {
  const arg = process.argv.find((a) => a.startsWith('--session-id='));
  return arg?.split('=')[1] || process.env.GROK_SESSION_ID || DEFAULT_SESSION;
}

function loadFeatures() {
  return JSON.parse(readFileSync(join(root, '.xray/features.json'), 'utf8'));
}

async function loadXray() {
  const synthesis = await import(join(xrayRoot, 'dist/nucleus/synthesis.js'));
  const persistence = await import(join(xrayRoot, 'dist/nucleus/lead-dev-plan-persistence.js'));
  const kernel = await import(join(xrayRoot, 'dist/nucleus/autonomy-kernel.js'));
  return { synthesis, persistence, kernel };
}

async function cmdSeed() {
  const sessionId = parseSessionId();
  const grokSession = process.env.GROK_SESSION_ID;
  if (grokSession && grokSession !== sessionId) {
    err(
      `❌ GROK_SESSION_ID (${grokSession}) ≠ seed sessionId (${sessionId}) — hooks will skip synthesis due`,
    );
    process.exit(1);
  }
  const features = loadFeatures();
  const threshold = features.synthesis?.every_n_gates ?? 12;
  if (!features.synthesis?.enabled) {
    err('❌ synthesis.enabled is false in .xray/features.json');
    process.exit(1);
  }

  mkdirSync(stateDir, { recursive: true });
  const { synthesis, kernel, persistence } = await loadXray();

  // Reset prior checkpoint for clean live run
  if (existsSync(checkpointPath)) {
    const prior = synthesis.loadSynthesisCheckpointState(root);
    if (prior?.synthesisDue) {
      log('ℹ️  Clearing prior due checkpoint for fresh live run');
    }
  }

  let becameDue = false;
  for (let i = 0; i < threshold; i++) {
    const result = synthesis.recordExecutionSlice('gate', { projectRoot: root, sessionId });
    if (result.becameDue) becameDue = true;
  }

  const state = synthesis.loadSynthesisCheckpointState(root);
  const due = synthesis.isSynthesisCheckpointDue(root, sessionId);

  log(`📊 sessionId: ${sessionId}`);
  log(`📊 gate slices recorded: ${threshold}`);
  log(`📊 synthesisDue: ${due}`);
  log(`📊 dueReason: ${state?.dueReason ?? 'null'}`);
  log(`📊 synthesisCount: ${state?.synthesisCount ?? 0}`);

  if (!due) {
    err('❌ Checkpoint not due after seeding');
    process.exit(1);
  }

  // Write session boot marker for hooks
  writeFileSync(
    join(stateDir, 'session-boot.json'),
    JSON.stringify(
      {
        hook: 'live-synthesis-seed',
        lead_dev_mode: true,
        sessionId,
        workspaceRoot: root,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  log('\n✅ Live synthesis checkpoint SEEDED');
  log('Next: CallMcpTool xray-orchestrator analyze-complexity with sessionId');
  log(`      sessionId: "${sessionId}"`);
}

async function cmdStatus() {
  const sessionId = parseSessionId();
  const { synthesis, persistence } = await loadXray();
  const state = synthesis.loadSynthesisCheckpointState(root);
  const due = synthesis.isSynthesisCheckpointDue(root, sessionId);
  const plan = persistence.loadPersistedLeadDevPlan(root);
  const consultTodos = plan ? persistence.getSynthesisConsultTodos(plan) : [];

  log(JSON.stringify(
    {
      sessionId,
      synthesisDue: due,
      dueReason: state?.dueReason ?? null,
      synthesisCount: state?.synthesisCount ?? 0,
      planActive: plan?.active ?? false,
      phaseId: plan?.phases?.[0]?.id ?? null,
      consultTodos: consultTodos.map((t) => ({ id: t.id, subagent: t.subagent, status: t.status })),
    },
    null,
    2,
  ));
}

async function cmdCompleteTodo() {
  err('❌ complete-todo cannot mint a PASS receipt or clear consult todos.');
  err('A consult todo completes only when Confer records a real model approve.');
  process.exit(1);
}

async function cmdFinish() {
  const sessionId = parseSessionId();
  const { synthesis } = await loadXray();
  const due = synthesis.isSynthesisCheckpointDue(root, sessionId);
  const state = synthesis.loadSynthesisCheckpointState(root);
  if (due) {
    err('❌ Checkpoint still due — complete all consult todos first');
    await cmdStatus();
    process.exit(1);
  }
  log('✅ Live synthesis checkpoint CLEARED');
  log(`📊 synthesisCount: ${state?.synthesisCount ?? 0}`);
  log(`📊 lastSynthesisAt: ${state?.lastSynthesisAt ?? 'null'}`);
}

const cmd = process.argv[2] || 'seed';
const handlers = {
  seed: cmdSeed,
  status: cmdStatus,
  'complete-todo': cmdCompleteTodo,
  finish: cmdFinish,
};

const handler = handlers[cmd];
if (!handler) {
  err(`Unknown command: ${cmd}`);
  process.exit(1);
}
await handler();