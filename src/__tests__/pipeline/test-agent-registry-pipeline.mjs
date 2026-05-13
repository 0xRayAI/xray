#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function readJSON(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) throw new Error(`File not found: ${relPath}`);
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function readSourceJSON(relPath) {
  // Prefer src/opencode/ (source of truth), fall back to .opencode/ (generated)
  const srcPath = join(ROOT, 'src', relPath);
  const genPath = join(ROOT, relPath);
  if (existsSync(srcPath)) return JSON.parse(readFileSync(srcPath, 'utf-8'));
  if (!existsSync(genPath)) throw new Error(`File not found: src/${relPath} or ${relPath}`);
  return JSON.parse(readFileSync(genPath, 'utf-8'));
}

function extractRegistryFromSource() {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  const match = src.match(/export const AGENT_REGISTRY[^=]*=\s*\{([\s\S]*)\n\};/);
  if (!match) throw new Error('Could not parse AGENT_REGISTRY from source');
  const body = match[1];
  const keys = [];
  const r = /(?:"([^"]+)"|(\w+)):\s*\{/g;
  let m;
  while ((m = r.exec(body)) !== null) {
    keys.push(m[1] || m[2]);
  }
  return keys;
}

function extractBarrelFromSource() {
  const src = readFileSync(join(ROOT, 'src/agents/index.ts'), 'utf-8');
  const blockMatch = src.match(/export const builtinAgents[^=]*=\s*\{([\s\S]*?)\};/);
  if (!blockMatch) throw new Error('Could not parse builtinAgents from index.ts');
  const body = blockMatch[1];
  const keys = [];
  const r = /^\s*(?:"([^"]+)"\s*:\s*\w+|(\w+))\s*,/gm;
  let m;
  while ((m = r.exec(body)) !== null) {
    keys.push(m[1] || m[2]);
  }
  return keys;
}

function getAgentFilesOnDisk() {
  const dir = join(ROOT, 'src/agents');
  const files = readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'registry.ts' && f !== 'types.ts');
  return files.map(f => f.replace('.ts', ''));
}

console.log('=== AGENT-REGISTRY PIPELINE TEST ===\n');

// ============================================
// LAYER 1: Registry Source Integrity
// ============================================
console.log('📍 Layer 1: Registry Source Integrity\n');

test('registry source has 21 agents', () => {
  const keys = extractRegistryFromSource();
  if (keys.length !== 21) throw new Error(`Expected 21 agents, got ${keys.length}: ${keys.join(', ')}`);
});

test('all registry entries have required fields', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  const required = ['name', 'description', 'capabilities', 'capacity', 'specialties', 'mode', 'maxComplexity', 'concurrentTasks', 'status', 'performance', 'expertise'];
  for (const field of required) {
    const pattern = new RegExp(`${field}:`, 'g');
    const count = (src.match(pattern) || []).length;
    if (count < 21) throw new Error(`Field "${field}" appears ${count} times, expected >= 21`);
  }
});

test('all agents are active or deprecated status', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  const inactive = src.match(/status:\s*["']inactive["']/g);
  // Allow up to 2 deprecated agents (enforcer, orchestrator)
  if (inactive && inactive.length > 2) throw new Error(`Found ${inactive.length} inactive agents — expected <= 2 (deprecated)`);
});

test('modes are valid (primary or subagent)', () => {
  const keys = extractRegistryFromSource();
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  for (const key of keys) {
    const sectionRegex = new RegExp(`(?:"${key}"|\\b${key}\\b)\\s*:\\s*\\{([\\s\\S]*?)\\n  \\}`, 'm');
    const sectionMatch = src.match(sectionRegex);
    if (!sectionMatch) throw new Error(`Cannot parse section for ${key}`);
    const modeMatch = sectionMatch[1].match(/mode:\s*["']([^"']+)["']/);
    if (!modeMatch) throw new Error(`No mode found for ${key}`);
    if (modeMatch[1] !== 'primary' && modeMatch[1] !== 'subagent') {
      throw new Error(`Invalid mode for ${key}: ${modeMatch[1]}`);
    }
  }
});

// ============================================
// LAYER 2: Barrel ↔ Registry Parity
// ============================================
console.log('\n📍 Layer 2: Barrel ↔ Registry Parity\n');

test('barrel exports match registry keys exactly', () => {
  const registryKeys = extractRegistryFromSource().sort();
  const barrelKeys = extractBarrelFromSource().sort();
  const missing = registryKeys.filter(k => !barrelKeys.includes(k));
  const extra = barrelKeys.filter(k => !registryKeys.includes(k));
  if (missing.length || extra.length) {
    throw new Error(`Mismatch — missing in barrel: [${missing}], extra in barrel: [${extra}]`);
  }
});

// ============================================
// LAYER 3: Agent Files on Disk
// ============================================
console.log('\n📍 Layer 3: Agent Files on Disk\n');

test('each registry agent has a corresponding .ts file in src/agents/', () => {
  const registryKeys = extractRegistryFromSource();
  const diskFiles = getAgentFilesOnDisk();
  const missing = registryKeys.filter(k => !diskFiles.includes(k));
  if (missing.length) throw new Error(`No .ts file for agents: ${missing.join(', ')}`);
});

const EXTRA_AGENT_FILES = ['librarian-agents-updater', 'multimodal-looker'];

test('each .ts file in src/agents/ is in the registry or is a known extra', () => {
  const registryKeys = extractRegistryFromSource();
  const diskFiles = getAgentFilesOnDisk();
  const orphans = diskFiles.filter(f => !registryKeys.includes(f) && !EXTRA_AGENT_FILES.includes(f));
  if (orphans.length) throw new Error(`Unexpected files not in registry: ${orphans.join(', ')}`);
});

// ============================================
// LAYER 4: Routing Mappings Consistency
// ============================================
console.log('\n📍 Layer 4: Routing Mappings Consistency\n');

test('routing-mappings.json loads and is valid JSON array', () => {
  const mappings = readSourceJSON('opencode/strray/routing-mappings.json');
  if (!Array.isArray(mappings)) throw new Error('routing-mappings.json is not an array');
  if (mappings.length === 0) throw new Error('routing-mappings.json is empty');
});

test('all routing-mappings agents exist in registry', () => {
  const registryKeys = new Set(extractRegistryFromSource());
  const mappings = readSourceJSON('opencode/strray/routing-mappings.json');
  const invalid = mappings.filter(m => !registryKeys.has(m.agent)).map(m => m.agent);
  if (invalid.length) throw new Error(`Phantom agents in routing-mappings: ${[...new Set(invalid)].join(', ')}`);
});

test('no test artifacts in routing-mappings (autoGenerated entries)', () => {
  const mappings = readSourceJSON('opencode/strray/routing-mappings.json');
  const autoGen = mappings.filter(m => m.autoGenerated);
  if (autoGen.length) throw new Error(`Found ${autoGen.length} autoGenerated entries`);
});

test('routing-mappings has no exact duplicate entries', () => {
  const mappings = readSourceJSON('opencode/strray/routing-mappings.json');
  const seen = new Set();
  for (const m of mappings) {
    const key = JSON.stringify(m);
    if (seen.has(key)) throw new Error(`Exact duplicate entry: agent=${m.agent}, skill=${m.skill}`);
    seen.add(key);
  }
});

// ============================================
// LAYER 5: Helper Functions (from dist or source parse)
// ============================================
console.log('\n📍 Layer 5: Helper Functions & Validation\n');

test('validateRegistryConsistency function exists in source', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  if (!src.includes('export function validateRegistryConsistency()')) {
    throw new Error('validateRegistryConsistency function not found');
  }
});

test('getActiveAgents function exists in source', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  if (!src.includes('export function getActiveAgents()')) {
    throw new Error('getActiveAgents function not found');
  }
});

test('isAllowedAgent function exists in source', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  if (!src.includes('export function isAllowedAgent(')) {
    throw new Error('isAllowedAgent function not found');
  }
});

test('getAgentCapabilities function exists in source', () => {
  const src = readFileSync(join(ROOT, 'src/agents/registry.ts'), 'utf-8');
  if (!src.includes('export function getAgentCapabilities(')) {
    throw new Error('getAgentCapabilities function not found');
  }
});

// ============================================
// LAYER 6: Cross-Consumer Consistency
// ============================================
console.log('\n📍 Layer 6: Cross-Consumer Consistency\n');

test('default-agents.ts references registry', () => {
  const src = readFileSync(join(ROOT, 'src/config/default-agents.ts'), 'utf-8');
  if (!src.includes('from "../agents/registry.js"')) {
    throw new Error('default-agents.ts does not import from registry');
  }
});

test('agent-delegator.ts uses registry helpers', () => {
  const src = readFileSync(join(ROOT, 'src/delegation/agent-delegator.ts'), 'utf-8');
  if (!src.includes('from "../agents/registry.js"')) {
    throw new Error('agent-delegator.ts does not import from registry');
  }
  if (!src.includes('getActiveAgents') || !src.includes('isAllowedAgent')) {
    throw new Error('agent-delegator.ts missing getActiveAgents or isAllowedAgent import');
  }
});

test('agent-capabilities.ts references registry', () => {
  const src = readFileSync(join(ROOT, 'src/mcps/orchestrator/config/agent-capabilities.ts'), 'utf-8');
  if (!src.includes('agents/registry')) {
    throw new Error('agent-capabilities.ts does not import from registry');
  }
});

// ============================================
// RESULTS
// ============================================
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failed === 0) {
    console.log('✅ Agent-Registry Pipeline test PASSED');
    process.exit(0);
  } else {
    console.log('❌ Agent-Registry Pipeline test FAILED');
    process.exit(1);
  }
}, 300);
