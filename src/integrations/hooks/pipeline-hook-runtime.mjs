#!/usr/bin/env node
/**
 * Pipeline facet hooks — reflection, routing outcomes, reporting, inference-improvement.
 * Loaded by Grok session-start / post-tool-use (rewire only, no new MCP surface).
 */
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolvePackageRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const require = createRequire(join(dir, 'package.json'));
        if (require('./package.json').name === '0xray') return dir;
      } catch {
        /* continue */
      }
    }
    const nm = join(dir, 'node_modules', '0xray', 'package.json');
    if (existsSync(nm)) return dirname(nm);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(__dirname, '../../..');
}

function loadFeatures(projectRoot) {
  const path = join(projectRoot, '.xray', 'features.json');
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function appendActivity(projectRoot, action, level, data = {}) {
  const logDir = join(projectRoot, 'logs', 'framework');
  mkdirSync(logDir, { recursive: true });
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    component: 'pipeline-hook',
    action,
    level,
    data,
  });
  appendFileSync(join(logDir, 'activity.log'), `${line}\n`);
}

function gitCommitCount(projectRoot) {
  try {
    const out = execSync('git rev-list --count HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** P1.1 — reflection stub when synthesis.reflection triggers fire */
export function maybeRunReflectionStub(projectRoot) {
  const features = loadFeatures(projectRoot);
  const reflection = features.synthesis?.reflection;
  if (!reflection || reflection.mode === 'off') return null;

  const threshold = reflection.thresholds?.[reflection.mode ?? 'minimal'];
  const commitTrigger = reflection.triggers?.commit_threshold;
  const commits = gitCommitCount(projectRoot);
  const commitLimit = commitTrigger?.threshold ?? threshold?.commit_threshold ?? 25;

  if (!commitTrigger?.enabled && !threshold?.auto_generate) return null;
  if (commits > 0 && commits % commitLimit !== 0) return null;

  const pkgRoot = resolvePackageRoot();
  const generator = join(pkgRoot, 'scripts', 'node', 'auto-reflection-generator.mjs');
  if (!existsSync(generator)) return null;

  const result = spawnSync(
    process.execPath,
    [generator, '--trigger', 'commit-threshold', '--title', `Pipeline checkpoint (${commits} commits)`],
    { cwd: projectRoot, encoding: 'utf8', timeout: 15000 },
  );

  appendActivity(projectRoot, 'reflection-stub', result.status === 0 ? 'success' : 'warning', {
    commits,
    exitCode: result.status,
    stdout: (result.stdout || '').slice(0, 200),
  });

  return { triggered: true, commits, exitCode: result.status };
}

/** P1.2 — record routing outcome after orchestrate / Task spawn */
export function recordRoutingOutcome(projectRoot, entry) {
  const logDir = join(projectRoot, 'logs', 'framework');
  mkdirSync(logDir, { recursive: true });
  const path = join(logDir, 'routing-outcomes.json');
  let outcomes = [];
  if (existsSync(path)) {
    try {
      outcomes = JSON.parse(readFileSync(path, 'utf8'));
      if (!Array.isArray(outcomes)) outcomes = [];
    } catch {
      outcomes = [];
    }
  }
  outcomes.push({
    timestamp: new Date().toISOString(),
    tool: entry.tool ?? 'unknown',
    agent: entry.agent ?? entry.subagent ?? null,
    planTodoId: entry.planTodoId ?? null,
    success: entry.success ?? true,
    sessionId: entry.sessionId ?? null,
  });
  if (outcomes.length > 500) outcomes = outcomes.slice(-500);
  writeFileSync(path, `${JSON.stringify(outcomes, null, 2)}\n`);
  appendActivity(projectRoot, 'routing-outcome', 'info', {
    tool: entry.tool,
    agent: entry.agent ?? entry.subagent,
    count: outcomes.length,
  });
  return outcomes.length;
}

/** P1.3 — mark autonomous reporting scheduled (framework reporter wired at boot in TS path) */
export function scheduleAutonomousReportingMarker(projectRoot) {
  const features = loadFeatures(projectRoot);
  const reporting = features.autonomous_reporting;
  if (!reporting?.enabled || !reporting?.auto_schedule) return null;

  const reportsDir = join(projectRoot, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const marker = join(reportsDir, '.autonomous-reporting-scheduled.json');
  writeFileSync(
    marker,
    `${JSON.stringify({
      scheduledAt: new Date().toISOString(),
      intervalMinutes: reporting.interval_minutes ?? 60,
    }, null, 2)}\n`,
  );
  appendActivity(projectRoot, 'autonomous-report-scheduled', 'info', {
    intervalMinutes: reporting.interval_minutes ?? 60,
  });
  return marker;
}

/** P1.7 — lightweight inference-improvement workflow stub */
export function runInferenceImprovementLight(projectRoot) {
  const features = loadFeatures(projectRoot);
  if (features.inference_governance?.enabled === false) return null;

  const infDir = join(projectRoot, '.xray', 'inference');
  mkdirSync(infDir, { recursive: true });
  const workflowPath = join(infDir, `workflow-${Date.now()}.json`);
  const payload = {
    timestamp: new Date().toISOString(),
    phase: 'pending',
    triggered: true,
    mode: 'light',
    dataLocations: {
      reflections: 'docs/reflections',
      logs: 'logs/framework',
      reports: 'reports',
    },
  };
  writeFileSync(workflowPath, `${JSON.stringify(payload, null, 2)}\n`);
  appendActivity(projectRoot, 'inference-improvement-light', 'info', { workflowPath });
  return workflowPath;
}

/** P2.2 — opt-in lightweight postprocessor on write tools (features.grok_postprocessor_light) */
export function runGrokPostprocessorLight(projectRoot, entry = {}) {
  const features = loadFeatures(projectRoot);
  if (features.grok_postprocessor_light !== true) return null;

  const infDir = join(projectRoot, '.xray', 'inference');
  mkdirSync(infDir, { recursive: true });
  const markerPath = join(infDir, 'postprocessor-light-latest.json');
  const payload = {
    timestamp: new Date().toISOString(),
    phase: 'post-process-light',
    tool: entry.tool ?? 'unknown',
    paths: entry.paths ?? [],
    mode: 'grok-post-tool-light',
  };
  writeFileSync(markerPath, `${JSON.stringify(payload, null, 2)}\n`);
  appendActivity(projectRoot, 'postprocessor-light', 'info', {
    tool: entry.tool,
    pathCount: (entry.paths ?? []).length,
  });
  return markerPath;
}

/** P3.3 — pipeline facet snapshot for suit audit */
export function writePipelineFacetSnapshot(projectRoot, counts) {
  const outPath = join(projectRoot, 'docs', 'PIPELINE-FACET-SNAPSHOT.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), ...counts }, null, 2)}\n`,
  );
  return outPath;
}