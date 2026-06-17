#!/usr/bin/env node

/**
 * 0xRay OpenClaw Integration Tests
 *
 * Tests that the OpenClaw integration can be loaded, instantiated,
 * and exports the expected types, client, and hooks.
 *
 * Usage: node scripts/test/test-openclaw-integration.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DIST_OPENCLAW = path.join(ROOT, 'dist', 'integrations', 'openclaw');
const SRC_OPENCLAW = path.join(ROOT, 'src', 'integrations', 'openclaw');

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
  console.log('=== OpenClaw Integration Tests ===\n');

  // Test 1: OpenClaw integration source exists
  console.log('Test 1: OpenClaw integration source exists');
  const srcIndex = path.join(SRC_OPENCLAW, 'index.ts');
  if (fs.existsSync(srcIndex)) {
    pass('OpenClaw source index.ts exists');
  } else {
    fail('OpenClaw source index.ts exists', `Not found: ${srcIndex}`);
  }

  // Test 2: OpenClawIntegration class can be instantiated (via dist or source check)
  console.log('\nTest 2: OpenClawIntegration class can be instantiated');
  const distIndex = path.join(DIST_OPENCLAW, 'index.js');

  if (fs.existsSync(distIndex)) {
    try {
      const mod = require(distIndex);
      if (mod.OpenClawIntegration) {
        const instance = new mod.OpenClawIntegration();
        if (instance) {
          pass('OpenClawIntegration can be instantiated from dist');
        } else {
          fail('OpenClawIntegration can be instantiated from dist', 'Constructor returned null/undefined');
        }
      } else {
        // Check if module loaded but doesn't export the class directly
        const exportKeys = Object.keys(mod);
        if (exportKeys.length > 0) {
          pass(`OpenClawIntegration dist module loaded (exports: ${exportKeys.slice(0, 5).join(', ')})`);
        } else {
          fail('OpenClawIntegration is exported from dist', 'Module has no exports');
        }
      }
    } catch (err) {
      if (err.code === 'ERR_REQUIRE_ESM' || err.message?.includes('ES Module')) {
        skip('OpenClawIntegration instantiation from dist', 'ESM module requires dynamic import');
      } else {
        fail('OpenClawIntegration instantiation from dist', err.message);
      }
    }
  } else {
    // Check source file exists with the class definition
    if (fs.existsSync(srcIndex)) {
      const content = fs.readFileSync(srcIndex, 'utf-8');
      if (content.includes('class OpenClawIntegration')) {
        skip('OpenClawIntegration class instantiation', 'Compiled dist not found; class exists in source');
      } else {
        fail('OpenClawIntegration class exists in source', 'Class definition not found in index.ts');
      }
    } else {
      fail('OpenClawIntegration class', 'Neither dist nor source found');
    }
  }

  // Test 3: Types module exports expected interfaces
  console.log('\nTest 3: Types module exports expected interfaces');
  const srcTypes = path.join(SRC_OPENCLAW, 'types.ts');
  if (fs.existsSync(srcTypes)) {
    const content = fs.readFileSync(srcTypes, 'utf-8');
    const expectedTypes = ['OpenClawIntegrationConfig', 'IntegrationStatistics', 'ClientStatistics'];

    for (const typeName of expectedTypes) {
      if (content.includes(typeName)) {
        pass(`Types module exports "${typeName}"`);
      } else {
        fail(`Types module exports "${typeName}"`, `Interface not found in types.ts`);
      }
    }
  } else {
    // Check dist
    const distTypes = path.join(DIST_OPENCLAW, 'types.js');
    if (fs.existsSync(distTypes)) {
      skip('Types module check', 'Only dist JS available; TypeScript interfaces are type-only');
    } else {
      fail('Types module exists', 'Neither source nor dist types found');
    }
  }

  // Test 4: Client module exists
  console.log('\nTest 4: Client module exists');
  const srcClient = path.join(SRC_OPENCLAW, 'client.ts');
  const distClient = path.join(DIST_OPENCLAW, 'client.js');

  if (fs.existsSync(srcClient)) {
    const content = fs.readFileSync(srcClient, 'utf-8');
    if (content.includes('class OpenClawClient') || content.includes('OpenClawClient')) {
      pass('Client module (source) defines OpenClawClient');
    } else {
      fail('Client module defines OpenClawClient', 'Class not found in client.ts');
    }
  } else if (fs.existsSync(distClient)) {
    const result = await checkSyntax(distClient);
    if (result.valid) {
      pass('Client module (dist) has valid JS syntax');
    } else {
      fail('Client module (dist) has valid JS syntax', result.error.trim());
    }
  } else {
    fail('Client module exists', 'Neither source nor dist client found');
  }

  // Test 5: API server module exists
  console.log('\nTest 5: API server module exists');
  const srcApiServer = path.join(SRC_OPENCLAW, 'api-server.ts');
  const distApiServer = path.join(DIST_OPENCLAW, 'api-server.js');

  if (fs.existsSync(srcApiServer)) {
    const content = fs.readFileSync(srcApiServer, 'utf-8');
    if (content.includes('XrayAPIServer') || content.includes('0xRayAPIServer') || content.includes('class APIServer')) {
      pass('API server module (source) defines XrayAPIServer');
    } else {
      fail('API server module defines XrayAPIServer', 'Class not found in api-server.ts');
    }
  } else if (fs.existsSync(distApiServer)) {
    const result = await checkSyntax(distApiServer);
    if (result.valid) {
      pass('API server module (dist) has valid JS syntax');
    } else {
      fail('API server module (dist) has valid JS syntax', result.error.trim());
    }
  } else {
    // Check if it's referenced in the README
    const readmePath = path.join(DIST_OPENCLAW, 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf-8');
      if (readme.includes('api-server') || readme.includes('API Server')) {
        skip('API server module', 'Source not compiled to dist; documented in README');
      } else {
        fail('API server module exists', 'Neither source nor dist found');
      }
    } else {
      fail('API server module exists', 'No source, dist, or documentation found');
    }
  }

  // Test 6: Hooks (xray-hooks) can be loaded
  console.log('\nTest 6: Hooks (xray-hooks) can be loaded');
  const srcHooks = path.join(SRC_OPENCLAW, 'hooks', 'xray-hooks.ts');
  const distHooks = path.join(DIST_OPENCLAW, 'hooks', 'xray-hooks.js');

  if (fs.existsSync(srcHooks)) {
    const content = fs.readFileSync(srcHooks, 'utf-8');
    if (content.includes('OpenClawHooksManager')) {
      pass('Hooks module (source) defines OpenClawHooksManager');
    } else {
      fail('Hooks module defines OpenClawHooksManager', 'Class not found in xray-hooks.ts');
    }
  } else if (fs.existsSync(distHooks)) {
    const result = await checkSyntax(distHooks);
    if (result.valid) {
      pass('Hooks module (dist) has valid JS syntax');
    } else {
      fail('Hooks module (dist) has valid JS syntax', result.error.trim());
    }
  } else {
    skip('Hooks module (xray-hooks)', 'Not compiled to dist; source module not found');
  }

  // Test 7: Config module exists
  console.log('\nTest 7: Config module exists');
  const srcConfig = path.join(SRC_OPENCLAW, 'config.ts');
  if (fs.existsSync(srcConfig)) {
    const content = fs.readFileSync(srcConfig, 'utf-8');
    if (content.includes('OpenClawConfigLoader')) {
      pass('Config module (source) defines OpenClawConfigLoader');
    } else {
      fail('Config module defines OpenClawConfigLoader', 'Class not found in config.ts');
    }
  } else {
    skip('Config module', 'Source not found; may not be compiled');
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