#!/usr/bin/env node
/**
 * Stranger proof: 0xray tarball + no ../repertoire sibling still wears the organ.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const xrayRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = mkdtempSync(join(tmpdir(), 'xray-organ-iso-'));
let failed = 0;

function pass(name) {
  process.stdout.write(`  PASS: ${name}\n`);
}
function fail(name, reason) {
  failed += 1;
  process.stderr.write(`  FAIL: ${name} — ${reason}\n`);
}

try {
  process.stdout.write('0xRay factory organ isolated install\n');
  execSync('npm pack', { cwd: xrayRoot, stdio: 'pipe', timeout: 120000 });
  const tarball = join(xrayRoot, '0xray-4.0.0.tgz');
  if (!existsSync(tarball)) {
    fail('npm pack', '0xray-4.0.0.tgz missing');
    process.exit(1);
  }
  pass('npm pack 0xray-4.0.0.tgz');

  writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'stranger-app', version: '1.0.0' }));
  execSync(`npm install "${tarball}"`, { cwd: tmp, stdio: 'pipe', timeout: 180000 });
  pass('npm install tarball into stranger dir');

  if (existsSync(join(tmp, '..', 'repertoire', 'package.json'))) {
    // parent of tmp is /tmp — should not be the plant sibling
  }
  const plantSibling = join(tmp, '..', 'repertoire', 'dist', 'provider', 'memory-routing-provider.js');
  if (existsSync(plantSibling)) {
    pass('note: /tmp/repertoire exists on this machine — still asserting node_modules organ');
  }

  const organRoot = join(tmp, 'node_modules', '@0xray', 'repertoire');
  const xrayPkg = join(tmp, 'node_modules', '0xray');
  if (!existsSync(join(organRoot, 'package.json'))) {
    fail('organ nested', 'node_modules/@0xray/repertoire missing');
  } else {
    const organPkg = JSON.parse(readFileSync(join(organRoot, 'package.json'), 'utf8'));
    if (organPkg.version !== '0.2.0') fail('organ version', organPkg.version);
    else pass('nested @0xray/repertoire@0.2.0');
    if (organPkg.dependencies && organPkg.dependencies['0xray']) {
      fail('cycle', 'organ still depends on 0xray at runtime');
    } else pass('organ has no runtime 0xray dep');
  }

  const registry = JSON.parse(readFileSync(join(organRoot, 'data', 'curated_signals.json'), 'utf8'));
  const names = registry.signals.map((s) => s.name);
  if (registry.source !== 'factory-seed-4.0') fail('seed source', registry.source);
  else pass('factory-seed-4.0');
  if (names.length < 8 || names.length > 24) fail('seed size', String(names.length));
  else pass(`seed size ${names.length}`);
  if (names.some((n) => String(n).toLowerCase().startsWith('bedrock'))) fail('bedrock', 'present');
  else pass('no bedrock names');

  const features = JSON.parse(readFileSync(join(xrayPkg, 'xray', 'features.json'), 'utf8'));
  if (features.memory_routing?.enabled !== true) fail('template enabled', JSON.stringify(features.memory_routing));
  else pass('shipped memory_routing enabled');

  const { createMemoryRoutingProvider } = await import(
    pathToFileURL(join(organRoot, 'dist/provider/memory-routing-provider.js')).href
  );
  const provider = createMemoryRoutingProvider({ projectRoot: tmp });
  if (!provider.isAvailable()) fail('provider', 'unavailable');
  else pass('provider available in stranger cwd');
  const conf = provider.getTaskConfidence({
    id: 'iso',
    description: 'TYPE: ontological-trap attestation-as-map consumer-boundary revalidation',
    type: 'governance',
  });
  if (!conf?.highConfidenceTrapPresent) fail('trap', JSON.stringify(conf));
  else pass('trap detected');
  if (conf?.recommendedAgent !== 'architect') fail('architect', String(conf?.recommendedAgent));
  else pass('recommendedAgent architect');

  const mcp = join(organRoot, 'dist/mcp/server.js');
  if (!existsSync(mcp)) fail('mcp server', 'missing');
  else pass('extra repertoire MCP binary present');

  const wiringPath = join(xrayPkg, 'scripts/node/bridge-mcp-wiring.cjs');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const wiring = require(wiringPath);
  if (wiring.XRAY_MCP_SERVERS.length !== 7) fail('7 servers', String(wiring.XRAY_MCP_SERVERS.length));
  else pass('canonical 7 xray MCP servers');
  const extras = wiring.detectConsumerExtraMcpServers(tmp);
  if (!extras.opencode?.repertoire) fail('extra mcp', 'opencode repertoire missing');
  else pass('host extra repertoire MCP wired');
} catch (err) {
  fail('runner', err instanceof Error ? err.message : String(err));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) {
  process.stderr.write(`\norgan isolated failed (${failed})\n`);
  process.exit(1);
}
process.stdout.write('\norgan isolated passed\n');
process.exit(0);
