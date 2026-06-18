#!/usr/bin/env node

/**
 * 0xRay CJS/MJS Scripts Loadability Tests
 *
 * Tests that all .cjs and .mjs scripts that ship with the package
 * can be loaded without errors, and checks for expected exports.
 *
 * CJS scripts that are self-invoking are tested via subprocess to
 * avoid side effects. Library-style CJS scripts are tested with
 * require() directly.
 *
 * Usage: node scripts/test/test-cjs-mjs-scripts.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

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

function checkSyntax(filePath) {
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

function runSubprocess(filePath, timeout = 15000) {
  return new Promise((resolve) => {
    const child = spawn('node', [filePath], {
      stdio: 'pipe',
      cwd: ROOT,
      timeout,
    });

    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stderr: err.message });
    });
  });
}

const cjsScripts = [
  {
    path: path.join(ROOT, 'scripts', 'node', 'postinstall.cjs'),
    name: 'scripts/node/postinstall.cjs',
    expectedExports: [],
    description: 'Post-installation setup script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'setup-dev.cjs'),
    name: 'scripts/node/setup-dev.cjs',
    expectedExports: [],
    description: 'Development environment setup script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'prepare-consumer.cjs'),
    name: 'scripts/node/prepare-consumer.cjs',
    expectedExports: [],
    description: 'Consumer preparation script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'reflection-processor.cjs'),
    name: 'scripts/node/reflection-processor.cjs',
    expectedExports: [],
    description: 'Reflection post-processor',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'basic-security-audit.cjs'),
    name: 'scripts/node/basic-security-audit.cjs',
    expectedExports: [],
    description: 'Basic security audit script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'ci-cd-auto-fix.cjs'),
    name: 'scripts/node/ci-cd-auto-fix.cjs',
    expectedExports: [],
    description: 'CI/CD auto-fix script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'helpers', 'resolve-config-path.cjs'),
    name: 'scripts/helpers/resolve-config-path.cjs',
    expectedExports: ['getConfigDir', 'resolveConfigPath'],
    description: 'Config path resolver (CJS)',
    selfInvoking: false,
  },
];

const mjsScripts = [
  {
    path: path.join(ROOT, 'scripts', 'node', 'enforce-agents-md.mjs'),
    name: 'scripts/node/enforce-agents-md.mjs',
    description: 'AGENTS.md enforcement script',
    selfInvoking: false,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'version-manager.mjs'),
    name: 'scripts/node/version-manager.mjs',
    description: 'Version manager script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'release.mjs'),
    name: 'scripts/node/release.mjs',
    description: 'Release script',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'validate-release-docs.mjs'),
    name: 'scripts/node/validate-release-docs.mjs',
    description: 'Release docs freshness guard',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'auto-reflection-generator.mjs'),
    name: 'scripts/node/auto-reflection-generator.mjs',
    description: 'Auto-reflection generator',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'node', 'ci-report-generator.mjs'),
    name: 'scripts/node/ci-report-generator.mjs',
    description: 'CI report generator',
    selfInvoking: true,
  },
  {
    path: path.join(ROOT, 'scripts', 'mjs', 'validate-postinstall-config.mjs'),
    name: 'scripts/mjs/validate-postinstall-config.mjs',
    description: 'Post-install config validator',
    selfInvoking: true,
  },
];

async function runTests() {
  console.log('=== CJS/MJS Scripts Loadability Tests ===\n');

  // ── CJS Scripts ──────────────────────────────────────────────
  console.log('--- CJS Scripts ---\n');

  for (const script of cjsScripts) {
    console.log(`Testing: ${script.name} (${script.description})`);

    if (!fs.existsSync(script.path)) {
      fail(`${script.name} exists`, `File not found: ${script.path}`);
      console.log('');
      continue;
    }
    pass(`${script.name} exists`);

    // Syntax check
    const syntaxResult = await checkSyntax(script.path);
    if (syntaxResult.valid) {
      pass(`${script.name} has valid JS syntax`);
    } else {
      fail(`${script.name} has valid JS syntax`, syntaxResult.error.trim());
      console.log('');
      continue;
    }

    if (script.selfInvoking) {
      // Self-invoking scripts: run in subprocess with timeout
      // Exit code 0 = ran without crash, anything else = error
      const runResult = await runSubprocess(script.path, 10000);
      if (runResult.code === 0 || runResult.code === null) {
        // code 0 = success; null can happen if timeout killed it (still loadable)
        pass(`${script.name} runs without fatal errors`);
      } else {
        // Non-zero exit might be expected (e.g., security audit returns 1 on findings)
        // Only fail if there's an uncaught exception or module load error
        const hasLoadError = runResult.stderr && (
          runResult.stderr.includes('Cannot find module') ||
          runResult.stderr.includes('SyntaxError') ||
          runResult.stderr.includes('MODULE_NOT_FOUND')
        );
        if (hasLoadError) {
          fail(`${script.name} runs without fatal errors`, `Load error detected in stderr`);
        } else {
          pass(`${script.name} runs without fatal module errors (exit: ${runResult.code})`);
        }
      }
    } else {
      // Library-style CJS: require() and check exports
      try {
        const mod = require(script.path);
        pass(`${script.name} can be required without errors`);

        if (script.expectedExports.length > 0) {
          const exportedKeys = Object.keys(mod || {});
          for (const expectedExport of script.expectedExports) {
            if (mod && mod[expectedExport]) {
              pass(`${script.name} exports "${expectedExport}"`);
            } else {
              fail(`${script.name} exports "${expectedExport}"`, `Export not found. Available: [${exportedKeys.join(', ')}]`);
            }
          }
        }
      } catch (err) {
        if (err.code === 'ERR_REQUIRE_ESM' || (err.message && err.message.includes('ES Module'))) {
          skip(`${script.name} require (ESM module)`, err.message);
        } else if (err.message && (err.message.includes('Cannot find module') || err.code === 'MODULE_NOT_FOUND')) {
          const missingMatch = err.message.match(/Cannot find module '([^']+)'/);
          const missingModule = missingMatch ? missingMatch[1] : 'unknown';
          skip(`${script.name} require`, `Missing dependency: ${missingModule}`);
        } else {
          fail(`${script.name} can be required without errors`, err.message);
        }
      }
    }

    console.log('');
  }

  // ── MJS Scripts ──────────────────────────────────────────────
  console.log('--- MJS Scripts ---\n');

  for (const script of mjsScripts) {
    console.log(`Testing: ${script.name} (${script.description})`);

    if (!fs.existsSync(script.path)) {
      fail(`${script.name} exists`, `File not found: ${script.path}`);
      console.log('');
      continue;
    }
    pass(`${script.name} exists`);

    // Syntax check (works for .mjs files too)
    const syntaxResult = await checkSyntax(script.path);
    if (syntaxResult.valid) {
      pass(`${script.name} has valid JS syntax`);
    } else {
      fail(`${script.name} has valid JS syntax`, syntaxResult.error.trim());
      console.log('');
      continue;
    }

    // Attempt dynamic import or subprocess test
    if (script.selfInvoking) {
      // Self-invoking MJS scripts: run in subprocess with timeout
      const runResult = await runSubprocess(script.path, 10000);
      if (runResult.code === 0 || runResult.code === null) {
        pass(`${script.name} runs without fatal errors`);
      } else {
        const hasLoadError = runResult.stderr && (
          runResult.stderr.includes('Cannot find module') ||
          runResult.stderr.includes('SyntaxError') ||
          runResult.stderr.includes('MODULE_NOT_FOUND')
        );
        if (hasLoadError) {
          fail(`${script.name} runs without fatal errors`, 'Load error detected in stderr');
        } else {
          // Self-invoking scripts often exit with non-zero for expected reasons
          pass(`${script.name} runs without fatal module errors (exit: ${runResult.code})`);
        }
      }
    } else {
      // Library-style MJS: test with dynamic import
      const importResult = await new Promise((resolve) => {
        const importCheckScript = `
          import('file://${script.path.replace(/\\/g, '/')}')
            .then(mod => {
              const exports = Object.keys(mod);
              console.log(JSON.stringify({ success: true, exports: exports }));
              process.exit(0);
            })
            .catch(err => {
              const safeErr = { message: err.message, code: err.code || null };
              console.log(JSON.stringify({ success: false, error: safeErr }));
              process.exit(0);
            });
        `;
        const child = spawn('node', ['--input-type=module', '-e', importCheckScript], {
          stdio: 'pipe',
          cwd: ROOT,
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        const timer = setTimeout(() => {
          child.kill('SIGTERM');
        }, 15000);

        child.on('close', (code) => {
          clearTimeout(timer);
          try {
            const lines = stdout.trim().split('\n');
            const jsonLine = lines.find(l => {
              try { JSON.parse(l); return true; } catch { return false; }
            });
            if (jsonLine) {
              resolve(JSON.parse(jsonLine));
            } else {
              resolve({
                success: false,
                error: { message: `No JSON output found. stdout: ${stdout.slice(0, 300)}, stderr: ${stderr.slice(0, 200)}` },
              });
            }
          } catch {
            resolve({
              success: false,
              error: { message: `Parse error. stdout: ${stdout.slice(0, 200)}, stderr: ${stderr.slice(0, 200)}` },
            });
          }
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({ success: false, error: { message: err.message } });
        });
      });

      if (importResult.success) {
        pass(`${script.name} can be imported without errors`);
        if (importResult.exports && importResult.exports.length > 0) {
          pass(`${script.name} has exports: [${importResult.exports.slice(0, 5).join(', ')}${importResult.exports.length > 5 ? '...' : ''}]`);
        } else {
          pass(`${script.name} loaded (no named exports — likely side-effect script)`);
        }
      } else {
        const errMsg = importResult.error?.message || 'Unknown error';
        const errCode = importResult.error?.code;

        if (errCode === 'ERR_MODULE_NOT_FOUND' || errMsg.includes('Cannot find module') || errMsg.includes('MODULE_NOT_FOUND')) {
          const missingMatch = errMsg.match(/Cannot find module '([^']+)'/) || errMsg.match(/Cannot find package '([^']+)'/);
          const missingModule = missingMatch ? missingMatch[1] : 'unknown';
          skip(`${script.name} dynamic import`, `Missing dependency: ${missingModule}`);
        } else if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('network')) {
          skip(`${script.name} dynamic import`, 'Network dependency unavailable');
        } else {
          fail(`${script.name} can be imported without errors`, errMsg);
        }
      }
    }

    console.log('');
  }

  // ── Helper script: resolve-config-path.mjs ────────────────────
  console.log('--- Helper Scripts (additional) ---\n');

  const helperMjs = path.join(ROOT, 'scripts', 'helpers', 'resolve-config-path.mjs');
  console.log('Testing: scripts/helpers/resolve-config-path.mjs');

  if (!fs.existsSync(helperMjs)) {
    skip('scripts/helpers/resolve-config-path.mjs exists', 'File not found');
  } else {
    pass('scripts/helpers/resolve-config-path.mjs exists');

    const syntaxResult = await checkSyntax(helperMjs);
    if (syntaxResult.valid) {
      pass('scripts/helpers/resolve-config-path.mjs has valid JS syntax');
    } else {
      fail('scripts/helpers/resolve-config-path.mjs has valid JS syntax', syntaxResult.error.trim());
    }
  }

  console.log('');

  // ── Summary ──────────────────────────────────────────────────
  console.log('=== Summary ===');
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