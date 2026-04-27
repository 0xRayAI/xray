#!/usr/bin/env node

/**
 * StringRay Hermes Agent MCP Plugin Integration Tests
 *
 * Tests that the Hermes integration can be loaded, instantiated,
 * and exports the correct MCP tools and bridge configuration.
 *
 * Usage: node scripts/test/test-hermes-mcp-integration.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DIST_HERMES = path.join(ROOT, 'dist', 'integrations', 'hermes-agent');

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(name) {
  passed++;
  console.log(`  PASS: ${name}`);
}

function fail(name, reason) {
  failed++;
  console.log(`  FAIL: ${name} — ${reason}`);
}

function skip(name, reason) {
  skipped++;
  console.log(`  SKIP: ${name} — ${reason}`);
}

async function checkSyntax(filePath) {
  return new Promise((resolve) => {
    const child = spawn('node', ['--check', filePath], { stdio: 'pipe' });
    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (code) => {
      resolve({ valid: code === 0, error: stderr });
    });
    child.on('error', (err) => {
      resolve({ valid: false, error: err.message });
    });
  });
}

async function runTests() {
  console.log('=== Hermes Agent MCP Plugin Integration Tests ===\n');

  // Test 1: bridge.mjs can be loaded (syntax check)
  console.log('Test 1: bridge.mjs can be loaded');
  const bridgePath = path.join(DIST_HERMES, 'bridge.mjs');
  if (!fs.existsSync(bridgePath)) {
    fail('bridge.mjs exists', `File not found: ${bridgePath}`);
  } else {
    const result = await checkSyntax(bridgePath);
    if (result.valid) {
      pass('bridge.mjs has valid JS syntax');
    } else {
      fail('bridge.mjs has valid JS syntax', result.error.trim());
    }
  }

  // Test 2: plugin.yaml has valid structure
  console.log('\nTest 2: plugin.yaml has valid structure');
  const pluginYamlPath = path.join(DIST_HERMES, 'plugin.yaml');
  if (!fs.existsSync(pluginYamlPath)) {
    fail('plugin.yaml exists', `File not found: ${pluginYamlPath}`);
  } else {
    try {
      const content = fs.readFileSync(pluginYamlPath, 'utf-8');

      const requiredFields = ['name', 'version', 'description'];
      for (const field of requiredFields) {
        if (content.includes(`${field}:`)) {
          pass(`plugin.yaml has "${field}" field`);
        } else {
          fail(`plugin.yaml has "${field}" field`, `Missing "${field}:" key`);
        }
      }

      if (content.includes('provides_tools:')) {
        pass('plugin.yaml has "provides_tools" field');
      } else {
        fail('plugin.yaml has "provides_tools" field', 'Missing "provides_tools:" key');
      }

      if (content.includes('provides_hooks:')) {
        pass('plugin.yaml has "provides_hooks" field');
      } else {
        fail('plugin.yaml has "provides_hooks" field', 'Missing "provides_hooks:" key');
      }
    } catch (err) {
      fail('plugin.yaml is readable', err.message);
    }
  }

  // Test 3: plugin.yaml lists correct MCP tool names
  console.log('\nTest 3: plugin.yaml lists correct MCP tool names');
  if (fs.existsSync(pluginYamlPath)) {
    try {
      const content = fs.readFileSync(pluginYamlPath, 'utf-8');
      const expectedTools = ['strray_validate', 'strray_codex_check', 'strray_health', 'strray_hooks'];
      for (const tool of expectedTools) {
        if (content.includes(tool)) {
          pass(`plugin.yaml lists tool "${tool}"`);
        } else {
          fail(`plugin.yaml lists tool "${tool}"`, `Tool not found in plugin.yaml`);
        }
      }
    } catch (err) {
      fail('plugin.yaml tools check', err.message);
    }
  }

  // Test 4: hermes-agent-integration.js can be instantiated (if it exists in dist)
  console.log('\nTest 4: HermesAgentIntegration class can be instantiated');
  const integrationJsPath = path.join(DIST_HERMES, 'hermes-agent-integration.js');
  const integrationSrcPath = path.join(ROOT, 'src', 'integrations', 'hermes-agent', 'hermes-agent-integration.ts');

  if (fs.existsSync(integrationJsPath)) {
    try {
      const mod = require(integrationJsPath);
      if (mod.HermesAgentIntegration) {
        const instance = new mod.HermesAgentIntegration();
        if (instance) {
          pass('HermesAgentIntegration can be instantiated');
        } else {
          fail('HermesAgentIntegration can be instantiated', 'Constructor returned null/undefined');
        }
      } else {
        fail('HermesAgentIntegration is exported', 'Module does not export HermesAgentIntegration');
      }
    } catch (err) {
      if (err.code === 'ERR_REQUIRE_ESM' || err.message?.includes('ES Module')) {
        skip('HermesAgentIntegration instantiation (ESM module - needs dynamic import)', err.message);
      } else {
        fail('HermesAgentIntegration can be instantiated', err.message);
      }
    }
  } else if (fs.existsSync(integrationSrcPath)) {
    skip('HermesAgentIntegration class instantiation', 'Compiled JS not in dist yet; source TS exists');
  } else {
    skip('HermesAgentIntegration class instantiation', 'Integration class not built to dist (Python/MJS bridge)');
  }

  // Test 5: Python modules exist and are valid (syntax check via python3)
  console.log('\nTest 5: Python modules exist and are valid');
  const pythonFiles = ['__init__.py', 'tools.py', 'schemas.py', 'conftest.py'];
  for (const pyFile of pythonFiles) {
    const pyPath = path.join(DIST_HERMES, pyFile);
    if (!fs.existsSync(pyPath)) {
      skip(`Python module ${pyFile} syntax check`, 'File not found');
      continue;
    }

    const hasPython = await new Promise((resolve) => {
      const child = spawn('python3', ['--version'], { stdio: 'pipe' });
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });

    if (!hasPython) {
      skip(`Python module ${pyFile} syntax check`, 'python3 not available');
      break;
    }

    const result = await new Promise((resolve) => {
      const child = spawn('python3', ['-m', 'py_compile', pyPath], { stdio: 'pipe' });
      let stderr = '';
      child.stderr.on('data', (data) => { stderr += data.toString(); });
      child.on('close', (code) => resolve({ valid: code === 0, error: stderr }));
      child.on('error', (err) => resolve({ valid: false, error: err.message }));
    });

    if (result.valid) {
      pass(`Python module ${pyFile} has valid syntax`);
    } else {
      fail(`Python module ${pyFile} has valid syntax`, result.error.trim());
    }
  }

  // Test 6: after-install.md exists and is non-empty
  console.log('\nTest 6: after-install.md exists and is non-empty');
  const afterInstallPath = path.join(DIST_HERMES, 'after-install.md');
  if (!fs.existsSync(afterInstallPath)) {
    fail('after-install.md exists', `File not found: ${afterInstallPath}`);
  } else {
    const content = fs.readFileSync(afterInstallPath, 'utf-8');
    if (content.trim().length > 0) {
      pass('after-install.md is non-empty');
    } else {
      fail('after-install.md is non-empty', 'File is empty');
    }
  }

  // Test 7: bridge.mjs exports expected command handlers
  console.log('\nTest 7: bridge.mjs contains expected command handlers');
  if (fs.existsSync(bridgePath)) {
    const bridgeContent = fs.readFileSync(bridgePath, 'utf-8');
    const expectedCommands = ['health', 'pre-process', 'post-process', 'validate', 'codex-check', 'hooks'];
    for (const cmd of expectedCommands) {
      if (bridgeContent.includes(`"${cmd}"`) || bridgeContent.includes(`'${cmd}'`)) {
        pass(`bridge.mjs handles "${cmd}" command`);
      } else {
        fail(`bridge.mjs handles "${cmd}" command`, `Command not found in bridge.mjs`);
      }
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${passed + failed + skipped}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(2);
});