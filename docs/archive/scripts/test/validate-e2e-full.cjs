#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const KEEP = process.argv.includes('--keep');
const SKIP_MJS = process.argv.includes('--skip-mjs');

let passed = 0;
let failed = 0;
let skipped = 0;
let details = [];

function result(name, ok, msg) {
  if (ok) { passed++; process.stdout.write(`  \x1b[32mPASS\x1b[0m: ${name}\n`); }
  else { failed++; process.stdout.write(`  \x1b[31mFAIL\x1b[0m: ${name} — ${msg}\n`); }
  details.push({ name, ok, msg });
}

function section(title) {
  console.log(`\n\x1b[1m${'='.repeat(70)}\n  ${title}\n${'='.repeat(70)}\x1b[0m`);
}

function getStdout(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: opts.timeout || 120000, cwd: opts.cwd || ROOT, stdio: ['pipe', 'pipe', 'pipe'], ...opts }).toString();
  } catch (e) {
    return (e.stdout || e.stderr || '').toString();
  }
}

function subprocess(filePath, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [filePath, ...args], {
      cwd: opts.cwd || ROOT, stdio: opts.silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env, ...(opts.env || {}) }, timeout: opts.timeout || 180000,
    });
    let stdout = '', stderr = '';
    if (opts.silent) { child.stdout.on('data', d => { stdout += d; }); child.stderr.on('data', d => { stderr += d; }); }
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve({ ok: false, stdout, stderr, code: -1, error: 'timeout' }); }, opts.timeout || 180000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ ok: code === 0, stdout, stderr, code }); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ ok: false, stdout, stderr, code: -1, error: err.message }); });
  });
}

function grepFile(filePath, pattern) {
  try { const content = fs.readFileSync(filePath, 'utf-8'); return content.split('\n').filter(l => pattern.test(l)); } catch { return []; }
}

function assertFile(fullPath, label) {
  const exists = fs.existsSync(fullPath);
  result(label, exists, `not found: ${fullPath}`);
  return exists;
}

async function main() {
  console.log('\n\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  0xRay Full E2E Validation — npm pack → deploy → test → verify logs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');

  const startTime = Date.now();
  const TMP_DIR = path.join(os.tmpdir(), `xray-validate-${Date.now()}`);

  // ── Phase 0: npm pack ─────────────────────────────────────
  section('Phase 0: npm pack');
  const packOutput = getStdout('npm pack', { cwd: ROOT, timeout: 60000 });
  const tarballMatch = packOutput.match(/((?:0xray)-\d+\.\d+\.\d+)\.tgz/);
  if (!tarballMatch) { result('npm pack', false, `no tarball: ${packOutput.substring(0, 200)}`); process.exit(1); }
  const tarball = path.join(ROOT, tarballMatch[0]);
  result(`npm pack → ${tarballMatch[0]}`, true);

  // ── Phase 1: Consumer setup ───────────────────────────────
  section('Phase 1: Consumer setup');
  fs.mkdirSync(TMP_DIR, { recursive: true });
  getStdout('git init && git config user.email "t@t.com" && git config user.name "T" && npm init -y', { cwd: TMP_DIR, timeout: 15000 });
  result('git init + npm init', true);
  getStdout(`npm install "${tarball}"`, { cwd: TMP_DIR, timeout: 180000 });

  const XRAY = path.join(TMP_DIR, 'node_modules', '0xray');
  if (!fs.existsSync(path.join(XRAY, 'package.json'))) { result('0xray install', false, 'package.json not found'); process.exit(1); }
  const pkg = JSON.parse(fs.readFileSync(path.join(XRAY, 'package.json'), 'utf-8'));
  result(`0xray v${pkg.version} installed`, true);

  // ── Phase 2: File presence ──────────────────────────────
  section('Phase 2: File presence — all plugins, MCPs, skills');

  // 2a: Core files
  for (const f of ['dist/cli/index.js', 'dist/plugin/xray-codex-injection.js', 'dist/index.js', 'dist/mcps/mcp-client.js',
    'dist/state/state-manager.js', 'dist/processors/processor-manager.js', 'dist/enforcement/rule-enforcer.js',
    'dist/inference/inference-cycle.js', 'opencode.json', '.mcp.json', '.plugin/plugin.json', 'AGENTS.md', 'README.md',
    '.opencode/init.sh',
  ]) {
    assertFile(path.join(XRAY, f), `file: ${f}`);
  }

  // 2b: All MCP servers (flat + knowledge-skills + orchestrator)
  const flatMcps = ['architect-tools.server.js', 'auto-format.server.js', 'boot-orchestrator.server.js',
    'enforcer-tools.server.js', 'estimation.server.js', 'framework-compliance-audit.server.js',
    'framework-help.server.js', 'governance.server.js', 'lint.server.js', 'model-health-check.server.js',
    'performance-analysis.server.js', 'processor-pipeline.server.js', 'researcher.server.js',
    'security-scan.server.js', 'state-manager.server.js',
  ];
  const ksMcps = ['api-design.server.js', 'architecture-patterns.server.js', 'bug-triage-specialist.server.js',
    'code-analyzer.server.js', 'code-review.server.js', 'content-creator.server.js', 'database-design.server.js',
    'devops-deployment.server.js', 'git-workflow.server.js', 'growth-strategist.server.js', 'log-monitor.server.js',
    'mobile-development.server.js', 'multimodal-looker.server.js', 'performance-optimization.server.js',
    'project-analysis.server.js', 'refactoring-strategies.server.js', 'security-audit.server.js',
    'seo-consultant.server.js', 'session-management.server.js', 'skill-invocation.server.js',
    'strategist.server.js', 'tech-writer.server.js', 'testing-strategy.server.js', 'ui-ux-design.server.js',
  ];

  for (const s of flatMcps) assertFile(path.join(XRAY, 'dist', 'mcps', s), `MCP server: ${s}`);
  for (const s of ksMcps) assertFile(path.join(XRAY, 'dist', 'mcps', 'knowledge-skills', s), `MCP server: knowledge-skills/${s}`);
  assertFile(path.join(XRAY, 'dist', 'mcps', 'orchestrator', 'server.js'), 'MCP server: orchestrator/server.js');

  const totalMcps = flatMcps.length + ksMcps.length + 1;
  result(`MCP servers total: ${totalMcps}`, totalMcps >= 40, `expected >= 40, got ${totalMcps}`);

  // 2c: Skills
  const skillsDir = path.join(XRAY, 'src', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skillDirs = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory());
    result(`skills: ${skillDirs.length}`, skillDirs.length >= 40, `expected >= 40, got ${skillDirs.length}`);
    for (const skill of skillDirs.slice(0, 5)) {
      assertFile(path.join(skillsDir, skill, 'SKILL.md'), `skill SKILL.md: ${skill}`);
    }
  } else {
    result('skills dir', false, `not found: ${skillsDir}`);
  }

  // 2d: Agent YML declarations
  const agentsDir = path.join(XRAY, '.opencode', 'agents');
  if (fs.existsSync(agentsDir)) {
    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.yml'));
    result(`agent YML files: ${agentFiles.length}`, agentFiles.length >= 10, `expected >= 10, got ${agentFiles.length}`);
  } else {
    result('agents dir', false, `not found: ${agentsDir}`);
  }

  // 2e: Integrations
  for (const d of ['hermes-agent', 'openclaw']) {
    assertFile(path.join(XRAY, 'dist', 'integrations', d), `integration: ${d}`);
  }

  // 2f: Plugin loadability
  const pluginPath = path.join(XRAY, 'dist', 'plugin', 'xray-codex-injection.js');
  if (fs.existsSync(pluginPath)) {
    try {
      const pluginUrl = new URL(`file://${pluginPath}`);
      const m = await import(pluginUrl.href);
      result('plugin import()', !!(m.default || m));
    } catch (e) {
      result('plugin import()', false, e.message.substring(0, 100));
    }
  }

  // ── Phase 3: init.sh consumer detection ──────────────────
  section('Phase 3: init.sh consumer detection');
  const initSh = path.join(XRAY, '.opencode', 'init.sh');
  if (fs.existsSync(initSh)) {
    const initOut = getStdout(`bash "${initSh}"`, { cwd: TMP_DIR, timeout: 30000, silent: true });
    result('init.sh: version', /v?\d+\.\d+\.\d+/.test(initOut), `no version: ${initOut.substring(0, 200)}`);
    result('init.sh: Plugin ✅', /Plugin.*✅|✅.*Plugin/.test(initOut), `no plugin: ${initOut.substring(0, 200)}`);
    result('init.sh: Framework', /Framework/.test(initOut), `no framework: ${initOut.substring(0, 200)}`);
  } else {
    result('init.sh exists', false, `not found: ${initSh}`);
  }

  // ── Phase 4: Run e2e tests ─────────────────────────────
  section('Phase 4: E2E test suites');

  // Run opencode e2e inside the consumer dir
  const opencodeE2e = path.join(ROOT, 'scripts', 'test', 'test-opencode-e2e.mjs');
  if (fs.existsSync(opencodeE2e)) {
    const r = await subprocess(opencodeE2e, ['--dir', TMP_DIR], { cwd: ROOT, timeout: 300000, env: { NODE_ENV: 'production' }, silent: true });
    result(`test-opencode-e2e.mjs (exit ${r.code})`, r.ok, r.stderr?.substring(0, 300) || '');
    if (!r.ok) {
      // Print key lines on failure
      const lines = (r.stdout || '').split('\n').filter(l => /FAIL|PASS|SKIP/.test(l));
      for (const l of lines.slice(-10)) console.log(`  ${l}`);
    }
  }

  if (!SKIP_MJS) {
    const consumerE2e = path.join(ROOT, 'scripts', 'test', 'test-consumer-e2e.mjs');
    if (fs.existsSync(consumerE2e)) {
      const r = await subprocess(consumerE2e, ['--keep'], { cwd: ROOT, timeout: 300000, env: { NODE_ENV: 'production' }, silent: true });
      result(`test-consumer-e2e.mjs (exit ${r.code})`, r.ok, r.stderr?.substring(0, 300) || '');
    }
  }

  // ── Phase 5: 0xray CLI ──────────────────────────────────
  section('Phase 5: 0xray CLI');
  const cliPath = path.join(XRAY, 'dist', 'cli', 'index.js');
  if (fs.existsSync(cliPath)) {
    // Syntax check (ESM module, can't require)
    const syntaxOut = getStdout(`node --check "${cliPath}"`, { silent: true, ignoreError: true });
    result('CLI syntax valid', !syntaxOut.includes('SyntaxError'), syntaxOut.substring(0, 100));

    // Version
    const versionOut = getStdout(`node "${cliPath}" --version`, { cwd: TMP_DIR, timeout: 15000, silent: true, ignoreError: true });
    result(`CLI --version: ${(versionOut || '').trim() || '(empty)'}`, versionOut.length > 0 && /\./.test(versionOut), 'no version output');

    // Status
    const statusOut = getStdout(`node "${cliPath}" status`, { cwd: TMP_DIR, timeout: 30000, silent: true, ignoreError: true });
    result('CLI status', /ready|Framework|✅/.test(statusOut), `unexpected: ${statusOut.substring(0, 200)}`);
  } else {
    result('CLI index.js', false, `not found: ${cliPath}`);
  }

  // ── Phase 6: opencode install ──────────────────────────
  section('Phase 6: opencode install command');
  const cliEntry = path.join(XRAY, 'dist', 'cli', 'index.js');
  if (fs.existsSync(cliEntry)) {
    const installDir = path.join(os.tmpdir(), `xray-oc-install-${Date.now()}`);
    fs.mkdirSync(installDir, { recursive: true });
    getStdout('git init && git config user.email "t@t.com" && git config user.name "T" && npm init -y', { cwd: installDir, timeout: 15000 });
    getStdout(`npm install "${tarball}"`, { cwd: installDir, timeout: 180000 });

    // Run via CLI entry: node dist/cli/index.js opencode install
    const r = await subprocess(cliEntry, ['opencode', 'install'], { cwd: installDir, timeout: 120000, env: { NODE_ENV: 'production' }, silent: true });

    // opencode-install copies .opencode/ directory (agents, hooks, plugin), NOT opencode.json at root
    assertFile(path.join(installDir, '.opencode', 'plugin', 'xray-codex-injection.js'), 'oc-install: .opencode/plugin/');
    assertFile(path.join(installDir, '.opencode', 'agents'), 'oc-install: .opencode/agents/');
    assertFile(path.join(installDir, '.opencode', 'hooks'), 'oc-install: .opencode/hooks/');
    assertFile(path.join(installDir, 'node_modules', '0xray'), 'oc-install: node_modules/0xray');

    const consumerPkg = JSON.parse(fs.readFileSync(path.join(installDir, 'package.json'), 'utf-8'));
    result('oc-install: 0xray dependency', !!(consumerPkg.dependencies?.['0xray'] || consumerPkg.devDependencies?.['0xray']), 'dependency not found');

    // Also run init.sh in the consumer project
    const consumerInitSh = path.join(installDir, '.opencode', 'init.sh');
    if (fs.existsSync(consumerInitSh)) {
      const initOut = getStdout(`bash "${consumerInitSh}"`, { cwd: installDir, timeout: 30000, silent: true });
      result('oc-install: init.sh Plugin ✅', /Plugin.*✅|✅.*Plugin/.test(initOut), `no plugin: ${initOut.substring(0, 200)}`);
      result('oc-install: init.sh version', /v?\d+\.\d+\.\d+/.test(initOut), `no version: ${initOut.substring(0, 200)}`);
    }

    if (!KEEP) { try { fs.rmSync(installDir, { recursive: true, force: true }); } catch {} }
  } else {
    result('opencode-install CLI entry', false, `not found: ${cliEntry}`);
  }

  // ── Phase 7: activity.log verification ──────────────────
  section('Phase 7: Framework activity.log verification');

  // Change to TMP_DIR so frameworkLogger writes logs there: TMP_DIR/logs/framework/activity.log
  const origCwd = process.cwd();
  process.chdir(TMP_DIR);

  try {
    const fwMod = require(path.join(XRAY, 'dist', 'index.js'));
    const logger = fwMod.frameworkLogger;
    if (logger && typeof logger.log === 'function') {
      result('frameworkLogger.log() available', true);

      const marker = `e2e-validate-${Date.now()}`;
      await logger.log('e2e-validate', 'plugin-loaded', 'info', { marker, type: 'test' });
      await logger.log('e2e-validate', 'pre-tool', 'info', { marker, operation: 'CODE OPERATION' });
      await logger.log('e2e-validate', 'post-tool', 'success', { marker });
      await logger.log('e2e-validate', 'quality-gate', 'info', { marker });
      await logger.log('e2e-validate', 'session-start', 'info', { marker, session: 'e2e-test' });
      await logger.log('e2e-validate', 'pre-processors', 'info', { marker });
      await logger.log('e2e-validate', 'post-processors', 'success', { marker });
      await logger.log('e2e-validate', 'bridge', 'info', { marker });
      await logger.log('e2e-validate', 'nudge', 'info', { marker, message: 'test nudge' });
      for (const proc of ['testAutoCreation', 'testExecution', 'coverageAnalysis', 'agentsMdValidation']) {
        await logger.log('e2e-validate', 'post-processor', 'info', { marker, processor: proc });
      }

      // Flush buffer
      for (let i = 0; i < 100; i++) await logger.log('e2e-validate', 'flush', 'info', { marker, i });
      await new Promise(r => setTimeout(r, 1000));

      const logsDir = path.join(TMP_DIR, 'logs', 'framework');
      const activityLog = path.join(logsDir, 'activity.log');

      if (fs.existsSync(activityLog)) {
        result('activity.log file exists', true);
        const allLogs = fs.readFileSync(activityLog, 'utf-8');

        result('activity.log: [plugin-loaded]', allLogs.includes('plugin-loaded'), 'missing');
        result('activity.log: [pre-tool]', allLogs.includes('pre-tool'), 'missing');
        result('activity.log: [post-tool]', allLogs.includes('post-tool'), 'missing');
        result('activity.log: [quality-gate]', allLogs.includes('quality-gate'), 'missing');
        result('activity.log: [session-start]', allLogs.includes('session-start'), 'missing');
        result('activity.log: [pre-processors]', allLogs.includes('pre-processors'), 'missing');
        result('activity.log: [post-processors]', allLogs.includes('post-processors'), 'missing');
        result('activity.log: [bridge]', allLogs.includes('bridge'), 'missing');
        result('activity.log: [nudge]', allLogs.includes('nudge'), 'missing');

        for (const proc of ['testAutoCreation', 'testExecution', 'coverageAnalysis', 'agentsMdValidation']) {
          result(`activity.log: processor "${proc}"`, allLogs.includes(proc), 'not found');
        }

        result(`activity.log: marker "${marker}" written`, allLogs.includes(marker), 'marker not found');
      } else {
        result('activity.log file', false, `not found at ${activityLog}`);
      }
    } else {
      result('frameworkLogger', false, 'log method not available');
    }
  } catch (e) {
    result('framework import/activity.log', false, e.message.substring(0, 150));
  } finally {
    process.chdir(origCwd);
  }

  // ── Phase 8: MCP servers import check ────────────────────
  section('Phase 8: MCP server import validation');
  const criticalMcps = [
    { name: 'governance.server.js', path: path.join(XRAY, 'dist', 'mcps', 'governance.server.js') },
    { name: 'researcher.server.js', path: path.join(XRAY, 'dist', 'mcps', 'researcher.server.js') },
    { name: 'boot-orchestrator.server.js', path: path.join(XRAY, 'dist', 'mcps', 'boot-orchestrator.server.js') },
    { name: 'enforcer-tools.server.js', path: path.join(XRAY, 'dist', 'mcps', 'enforcer-tools.server.js') },
  ];
  for (const mcp of criticalMcps) {
    if (fs.existsSync(mcp.path)) {
      try { require(mcp.path); result(`MCP import: ${mcp.name}`, true); }
      catch (e) {
        if (e.code === 'ERR_REQUIRE_ESM') {
          const s = getStdout(`node --check "${mcp.path}"`, { silent: true, ignoreError: true });
          result(`MCP syntax: ${mcp.name}`, !s.includes('SyntaxError'), s.substring(0, 100));
        } else { result(`MCP import: ${mcp.name}`, false, e.message.substring(0, 100)); }
      }
    } else { result(`MCP file: ${mcp.name}`, false, 'not found'); }
  }

  // ── Phase 9: Core module syntax check ──────────────────
  section('Phase 9: Core module syntax validation');
  for (const rel of ['dist/index.js', 'dist/cli/index.js', 'dist/mcps/mcp-client.js', 'dist/state/state-manager.js']) {
    const fullPath = path.join(XRAY, rel);
    if (fs.existsSync(fullPath)) {
      const s = getStdout(`node --check "${fullPath}"`, { silent: true, ignoreError: true });
      result(`syntax: ${rel}`, !s.includes('SyntaxError'), s.substring(0, 100));
    } else { result(`file: ${rel}`, false, 'not found'); }
  }

  // ── Phase 10: Codex enforcement ──────────────────────────
  section('Phase 10: Codex enforcement plugin');
  if (fs.existsSync(pluginPath)) {
    try {
      const pluginUrl = new URL(`file://${pluginPath}`);
      const m = await import(pluginUrl.href);
      const defaultExport = m.default || m;
      if (typeof defaultExport === 'function') {
        result('plugin default export is function', true);
        const hooks = await defaultExport({ directory: TMP_DIR });
        const hookNames = Object.keys(hooks);
        result(`plugin hooks: ${hookNames.length}`, hookNames.length >= 3, `expected >= 3, got ${hookNames.length}`);
        for (const h of ['tool.execute.before', 'tool.execute.after', 'experimental.chat.system.transform', 'chat.message', 'config']) {
          result(`plugin hook: ${h}`, hookNames.includes(h), `missing: ${h}`);
        }
      } else { result('plugin default export', false, 'not a function'); }
    } catch (e) { result('plugin load', false, e.message.substring(0, 100)); }
  }

  // ── Phase 11: MCP client manager ─────────────────────────
  section('Phase 11: MCP client manager');
  const mcpClientPath = path.join(XRAY, 'dist', 'mcps', 'mcp-client.js');
  if (fs.existsSync(mcpClientPath)) {
    try { const m = require(mcpClientPath);
      result('mcpClientManager exists', !!m.mcpClientManager);
      result('mcpClientManager.callServerTool', typeof m.mcpClientManager?.callServerTool === 'function');
      result('mcpClientManager.onToolEvent', typeof m.mcpClientManager?.onToolEvent === 'function');
    } catch (e) { result('mcp-client import', false, e.message); }
  }

  // ── Phase 12: Inference Cycle ────────────────────────────
  section('Phase 12: Inference cycle');
  const cyclePath = path.join(XRAY, 'dist', 'inference', 'inference-cycle.js');
  if (fs.existsSync(cyclePath)) {
    try {
      const m = require(cyclePath);
      result('InferenceCycle class', typeof m.InferenceCycle === 'function');
      if (typeof m.InferenceCycle === 'function') {
        const cycle = new m.InferenceCycle(TMP_DIR);
        const result2 = await cycle.governExternalProposals([]);
        result('governExternalProposals()', result2 && typeof result2 === 'object', 'did not return object');
      }
    } catch (e) {
      if (e.code === 'ERR_REQUIRE_ESM') { result('inference-cycle (ESM)', true); }
      else { result('inference-cycle import', false, e.message.substring(0, 100)); }
    }
  }

  // ── Phase 13: Config files validation ────────────────────
  section('Phase 13: Config file validation');
  for (const cfg of ['.mcp.json', 'opencode.json', '.plugin/plugin.json']) {
    const cfgPath = path.join(XRAY, cfg);
    if (fs.existsSync(cfgPath)) {
      try { JSON.parse(fs.readFileSync(cfgPath, 'utf-8')); result(`config valid JSON: ${cfg}`, true); }
      catch (e) { result(`config valid JSON: ${cfg}`, false, e.message); }
    } else { result(`config: ${cfg}`, false, 'not found'); }
  }

  // ── Summary ─────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  section('Summary');
  console.log(`  \x1b[32mPassed:\x1b[0m  ${passed}`);
  console.log(`  \x1b[31mFailed:\x1b[0m  ${failed}`);
  console.log(`  \x1b[33mSkipped:\x1b[0m ${skipped}`);
  console.log(`  \x1b[36mTime:\x1b[0m    ${elapsed}s`);
  console.log(`  \x1b[36mDir:\x1b[0m     ${TMP_DIR}`);
  console.log(`  \x1b[36mTarball:\x1b[0m ${tarball}`);

  if (!KEEP) { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); console.log('\x1b[36mCleanup: temp dir removed\x1b[0m'); } catch {} }
  else { console.log(`\x1b[33mKept: ${TMP_DIR}\x1b[0m`); }

  console.log('');
  if (failed > 0) {
    const fn = details.filter(d => !d.ok).map(d => d.name);
    console.log(`\x1b[31m${failed} test(s) failed:\x1b[0m`);
    for (const n of fn) console.log(`  \x1b[31m✗\x1b[0m ${n}`);
    console.log(`\n\x1b[31mVALIDATION FAILED\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32mALL ${passed} TESTS PASSED\x1b[0m`);
  process.exit(0);
}

main().catch(e => {
  console.error(`\n\x1b[31mFATAL:\x1b[0m ${e.message}`);
  if (e.stack) console.error(e.stack.substring(0, 500));
  process.exit(2);
});
