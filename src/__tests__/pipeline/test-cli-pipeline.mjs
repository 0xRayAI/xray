/**
 * CLI Commands Pipeline Test
 * 
 * Pipeline Tree: docs/pipeline-trees/CLI_PIPELINE_TREE.md
 * 
 * Data Flow:
 * CLI Command Invoke
 *     │
 *     ▼
 * Parse Arguments
 *     │
 *     ▼
 * Validate Input
 *     │
 *     ├─► File System Check
 *     ├─► Configuration Read
 *     └─► Skills Detection
 *     │
 *     ▼
 * Execute Command
 *     │
 *     ▼
 * Output Results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

console.log('=== CLI COMMANDS PIPELINE TEST ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((e) => {
        console.log(`❌ ${name}: ${e.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

// ============================================
// INSTALLER COMMAND
// ============================================
console.log('📦 Installer Command (scripts/node/install.cjs)\n');

test('should exist at scripts/node/install.cjs', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  if (!fs.existsSync(installPath)) throw new Error('install.cjs not found');
});

test('should contain OpenCode detection', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('checkOpenCodeInstallation')) throw new Error('OpenCode detection missing');
});

test('should support --minimal flag', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('--minimal')) throw new Error('--minimal flag missing');
});

test('should support --full flag', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('--full')) throw new Error('--full flag missing');
});

test('should support --with-skills flag', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('--with-skills')) throw new Error('--with-skills flag missing');
});

test('should support --yes flag', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('--yes')) throw new Error('--yes flag missing');
});

test('should copy plugin to both locations', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('pluginLocations')) {
    throw new Error('pluginLocations array missing');
  }
  if (!content.includes('targetDir, ".opencode"')) {
    throw new Error('Target directory path missing');
  }
});

test('should have kernel layering', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('layerKernel')) throw new Error('Kernel layering missing');
});

test('should have Impeccable installation', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('installImpeccable')) throw new Error('Impeccable installation missing');
});

test('should have OpenViking installation', () => {
  const installPath = path.join(PROJECT_ROOT, 'scripts/node/install.cjs');
  const content = fs.readFileSync(installPath, 'utf-8');
  if (!content.includes('installOpenViking')) throw new Error('OpenViking installation missing');
});

// ============================================
// STATUS COMMAND
// ============================================
console.log('\n📊 Status Command (src/cli/commands/status.ts)\n');

test('should exist at src/cli/commands/status.ts', () => {
  const statusPath = path.join(PROJECT_ROOT, 'src/cli/commands/status.ts');
  if (!fs.existsSync(statusPath)) throw new Error('status.ts not found');
});

test('should export getStatusReport', () => {
  const statusPath = path.join(PROJECT_ROOT, 'src/cli/commands/status.ts');
  const content = fs.readFileSync(statusPath, 'utf-8');
  if (!content.includes('export function getStatusReport')) {
    throw new Error('getStatusReport export missing');
  }
});

test('should export printStatus', () => {
  const statusPath = path.join(PROJECT_ROOT, 'src/cli/commands/status.ts');
  const content = fs.readFileSync(statusPath, 'utf-8');
  if (!content.includes('export function printStatus')) {
    throw new Error('printStatus export missing');
  }
});

test('should detect skills in integrations', () => {
  const statusPath = path.join(PROJECT_ROOT, 'src/cli/commands/status.ts');
  const content = fs.readFileSync(statusPath, 'utf-8');
  if (!content.includes('integrationsPath') && !content.includes('integrations')) {
    throw new Error('.opencode/integrations detection missing');
  }
});

test('should detect skills in skills directory', () => {
  const statusPath = path.join(PROJECT_ROOT, 'src/cli/commands/status.ts');
  const content = fs.readFileSync(statusPath, 'utf-8');
  if (!content.includes('skillsPath') && !content.includes('skills')) {
    throw new Error('.opencode/skills detection missing');
  }
});

// ============================================
// PUBLISH-AGENT COMMAND
// ============================================
console.log('\n📦 Publish Agent Command (src/cli/commands/publish-agent.ts)\n');

test('should exist at src/cli/commands/publish-agent.ts', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  if (!fs.existsSync(publishPath)) throw new Error('publish-agent.ts not found');
});

test('should export publishAgentCommand', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  const content = fs.readFileSync(publishPath, 'utf-8');
  if (!content.includes('export async function publishAgentCommand')) {
    throw new Error('publishAgentCommand export missing');
  }
});

test('should require --agent flag', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  const content = fs.readFileSync(publishPath, 'utf-8');
  if (!content.includes('--agent')) throw new Error('--agent flag missing');
});

test('should support --dry-run flag', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  const content = fs.readFileSync(publishPath, 'utf-8');
  if (!content.includes('--dry-run')) throw new Error('--dry-run flag missing');
});

test('should search agents directory', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  const content = fs.readFileSync(publishPath, 'utf-8');
  if (!content.includes('agents/')) throw new Error('agents directory search missing');
});

test('should create agent manifest', () => {
  const publishPath = path.join(PROJECT_ROOT, 'src/cli/commands/publish-agent.ts');
  const content = fs.readFileSync(publishPath, 'utf-8');
  if (!content.includes('createAgentManifest')) {
    throw new Error('createAgentManifest function missing');
  }
});

// ============================================
// ANTIGRAVITY-STATUS COMMAND
// ============================================
console.log('\n🎯 Antigravity Status Command (src/cli/commands/antigravity-status.ts)\n');

test('should exist at src/cli/commands/antigravity-status.ts', () => {
  const antigravityPath = path.join(PROJECT_ROOT, 'src/cli/commands/antigravity-status.ts');
  if (!fs.existsSync(antigravityPath)) throw new Error('antigravity-status.ts not found');
});

test('should export antigravityStatusCommand', () => {
  const antigravityPath = path.join(PROJECT_ROOT, 'src/cli/commands/antigravity-status.ts');
  const content = fs.readFileSync(antigravityPath, 'utf-8');
  if (!content.includes('export async function antigravityStatusCommand')) {
    throw new Error('antigravityStatusCommand export missing');
  }
});

test('should detect skills in integrations', () => {
  const antigravityPath = path.join(PROJECT_ROOT, 'src/cli/commands/antigravity-status.ts');
  const content = fs.readFileSync(antigravityPath, 'utf-8');
  if (!content.includes('getSkillsFromIntegrations')) {
    throw new Error('getSkillsFromIntegrations function missing');
  }
});

test('should show license information', () => {
  const antigravityPath = path.join(PROJECT_ROOT, 'src/cli/commands/antigravity-status.ts');
  const content = fs.readFileSync(antigravityPath, 'utf-8');
  if (!content.includes('MIT') || !content.includes('Apache')) {
    throw new Error('License detection missing');
  }
});

test('should reference LICENSE files', () => {
  const antigravityPath = path.join(PROJECT_ROOT, 'src/cli/commands/antigravity-status.ts');
  const content = fs.readFileSync(antigravityPath, 'utf-8');
  if (!content.includes('LICENSE.antigravity') || 
      !content.includes('LICENSE.impeccable') || 
      !content.includes('LICENSE.openviking')) {
    throw new Error('License file references missing');
  }
});

// ============================================
// CREDIBLE-INIT COMMAND
// ============================================
console.log('\n🚀 Credible Init Command (src/cli/commands/credible-init.ts)\n');

test('should exist at src/cli/commands/credible-init.ts', () => {
  const crediblePath = path.join(PROJECT_ROOT, 'src/cli/commands/credible-init.ts');
  if (!fs.existsSync(crediblePath)) throw new Error('credible-init.ts not found');
});

test('should export credibleInitCommand', () => {
  const crediblePath = path.join(PROJECT_ROOT, 'src/cli/commands/credible-init.ts');
  const content = fs.readFileSync(crediblePath, 'utf-8');
  if (!content.includes('export async function credibleInitCommand')) {
    throw new Error('credibleInitCommand export missing');
  }
});

test('should show not implemented message', () => {
  const crediblePath = path.join(PROJECT_ROOT, 'src/cli/commands/credible-init.ts');
  const content = fs.readFileSync(crediblePath, 'utf-8');
  if (!content.includes('not yet implemented')) {
    throw new Error('Not implemented message missing');
  }
});

// ============================================
// SKILLS VERIFICATION
// ============================================
console.log('\n🎨 Skills Verification\n');

test('typescript-expert skill should exist', () => {
  const skillPath = path.join(PROJECT_ROOT, '.opencode/integrations/typescript-expert/SKILL.md');
  if (!fs.existsSync(skillPath)) throw new Error('typescript-expert skill not found');
});

test('impeccable skill should exist', () => {
  const skillPath = path.join(PROJECT_ROOT, '.opencode/integrations/impeccable/SKILL.md');
  if (!fs.existsSync(skillPath)) throw new Error('impeccable skill not found');
});

test('openviking skill should exist', () => {
  const skillPath = path.join(PROJECT_ROOT, '.opencode/integrations/openviking/SKILL.md');
  if (!fs.existsSync(skillPath)) throw new Error('openviking skill not found');
});

test('antigravity-bridge skill should exist', () => {
  const skillPath = path.join(PROJECT_ROOT, '.opencode/integrations/antigravity-bridge/SKILL.md');
  if (!fs.existsSync(skillPath)) throw new Error('antigravity-bridge skill not found');
});

// ============================================
// LICENSE FILES
// ============================================
console.log('\n📜 License Files Verification\n');

test('LICENSE.impeccable should exist', () => {
  const licensePath = path.join(PROJECT_ROOT, 'LICENSE.impeccable');
  if (!fs.existsSync(licensePath)) throw new Error('LICENSE.impeccable not found');
});

test('LICENSE.openviking should exist', () => {
  const licensePath = path.join(PROJECT_ROOT, 'LICENSE.openviking');
  if (!fs.existsSync(licensePath)) throw new Error('LICENSE.openviking not found');
});

test('LICENSE.impeccable should contain Apache 2.0', () => {
  const licensePath = path.join(PROJECT_ROOT, 'LICENSE.impeccable');
  const content = fs.readFileSync(licensePath, 'utf-8');
  if (!content.includes('Apache') || !content.includes('2.0')) {
    throw new Error('Apache 2.0 license text missing');
  }
});

test('LICENSE.openviking should contain Apache 2.0', () => {
  const licensePath = path.join(PROJECT_ROOT, 'LICENSE.openviking');
  const content = fs.readFileSync(licensePath, 'utf-8');
  if (!content.includes('Apache') || !content.includes('2.0')) {
    throw new Error('Apache 2.0 license text missing');
  }
});

// ============================================
// SUMMARY
// ============================================
console.log('\n═══════════════════════════════════════');
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
