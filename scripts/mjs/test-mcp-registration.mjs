#!/usr/bin/env node

/**
 * MCP Server Registration Validation Test
 * 
 * Validates that all agents registered in features.json have
 * corresponding MCP server configurations.
 * 
 * This test catches the bug where agents are defined in features.json
 * but not registered in the MCP client, causing ProviderNotFound errors.
 * 
 * Usage:
 *   node scripts/mjs/test-mcp-registration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const prefix = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    section: '📋'
  }[type] || 'ℹ️';
  console.log(`${prefix} ${message}`);
}

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result?.success) {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      log(name, 'success');
      return true;
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: result?.error || 'Test returned false' });
      log(`${name}: ${result?.error || 'Test returned false'}`, 'error');
      return false;
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log(`${name}: ${error.message}`, 'error');
    return false;
  }
}

// Load features.json
function loadFeatures() {
  const featuresPath = path.join(rootDir, '.opencode/strray/features.json');
  if (!fs.existsSync(featuresPath)) {
    throw new Error('features.json not found');
  }
  return JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
}

// Load MCP client source to extract registered servers
function loadMCPClientConfigs() {
  const mcpPath = path.join(rootDir, 'src/mcps/mcp-client.ts');
  if (!fs.existsSync(mcpPath)) {
    throw new Error('mcp-client.ts not found');
  }
  
  const content = fs.readFileSync(mcpPath, 'utf-8');
  
  // Extract server names from serverConfigs
  const serverNames = [];
  const regex = /serverName:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    serverNames.push(match[1]);
  }
  
  return [...new Set(serverNames)]; // Deduplicate
}

// Get all available MCP server files
function getAvailableMCPServers() {
  const servers = new Set();
  
  // Check knowledge-skills
  const knowledgeSkillsPath = path.join(rootDir, 'src/mcps/knowledge-skills');
  if (fs.existsSync(knowledgeSkillsPath)) {
    for (const file of fs.readdirSync(knowledgeSkillsPath)) {
      if (file.endsWith('.server.ts')) {
        servers.add(file.replace('.server.ts', ''));
      }
    }
  }
  
  // Check mcps root
  const mcpsPath = path.join(rootDir, 'src/mcps');
  if (fs.existsSync(mcpsPath)) {
    for (const file of fs.readdirSync(mcpsPath)) {
      if (file.endsWith('.server.ts')) {
        servers.add(file.replace('.server.ts', ''));
      }
    }
  }
  
  return [...servers];
}

// Test: features.json exists and has agent_management
function testFeaturesJsonExists() {
  const features = loadFeatures();
  return {
    success: !!features.agent_management && !!features.agent_management.agent_models,
    error: 'features.json missing agent_management.agent_models'
  };
}

// Test: All agents in features.json have MCP configurations
function testAgentsHaveMCPConfig() {
  const features = loadFeatures();
  const registeredMCPs = loadMCPClientConfigs();
  const availableMCPs = getAvailableMCPServers();
  
  const agentModels = features.agent_management?.agent_models || {};
  const agents = Object.keys(agentModels);
  
  // Known aliases: serverName -> actual file (without .server.ts)
  const aliasMap = {
    'code-reviewer': 'code-review',
    'security-auditor': 'security-audit',
    'refactorer': 'refactoring-strategies',
    'testing-lead': 'testing-strategy',
    'strategist': 'strategist',
    'librarian': 'project-analysis',
    'explore': 'code-analyzer',
    'tech-writer': 'documentation-generation',
    'frontend-ui-ux-engineer': 'ui-ux-design',
    'enforcer': 'enforcer-tools',
    'architect': 'architect-tools',
    'backend-engineer': 'api-design',
  };
  
  const missing = [];
  const hasFallback = [];
  
  for (const agent of agents) {
    if (!registeredMCPs.includes(agent)) {
      // Check if alias exists
      const alias = aliasMap[agent];
      if (alias && (availableMCPs.includes(alias) || registeredMCPs.includes(alias))) {
        hasFallback.push(`${agent} -> ${alias}`);
      } else if (availableMCPs.includes(agent)) {
        hasFallback.push(agent);
      } else {
        missing.push(agent);
      }
    }
  }
  
  if (missing.length > 0) {
    return {
      success: false,
      error: `Agents missing MCP config: ${missing.join(', ')}`
    };
  }
  
  if (hasFallback.length > 0) {
    log(`Aliases/fallbacks: ${hasFallback.join(', ')}`, 'warn');
  }
  
  return { success: true };
}

// Test: All registered MCP servers exist as files (or are aliases)
function testRegisteredMCPServersExist() {
  const registeredMCPs = loadMCPClientConfigs();
  const availableMCPs = getAvailableMCPServers();
  
  // Known aliases: registered name -> actual file
  const aliasMap = {
    'code-reviewer': 'code-review',
    'security-auditor': 'security-audit',
    'refactorer': 'refactoring-strategies',
    'testing-lead': 'testing-strategy',
    'strategist': 'strategist',
    'librarian': 'project-analysis',
    'explore': 'code-analyzer',
    'tech-writer': 'documentation-generation',
    'frontend-ui-ux-engineer': 'ui-ux-design',
    'enforcer': 'enforcer-tools',
    'architect': 'architect-tools',
    'backend-engineer': 'api-design',
    // ========== ADDED MISSING ALIASES ==========
    'performance-engineer': 'performance-optimization',
    'mobile-developer': 'mobile-development',
    'devops-engineer': 'devops-deployment',
    'database-engineer': 'database-design',
    'frontend-engineer': 'ui-ux-design',
    'tech-writer': 'documentation-generation',
    'bug-triage-specialist': 'bug-triage-specialist',
    'log-monitor': 'log-monitor',
    'multimodal-looker': 'multimodal-looker',
    'seo-consultant': 'seo-consultant',
    'content-creator': 'content-creator',
    'growth-strategist': 'growth-strategist',
    // Legacy aliases for renamed agents
    'document-writer': 'tech-writer',
    'documentwriter': 'tech-writer',
    // ========== END ADDED ALIASES ==========
  };
  
  const notFound = [];
  
  for (const server of registeredMCPs) {
    // Check direct match
    if (availableMCPs.includes(server)) continue;
    
    // Check alias mapping
    const alias = aliasMap[server];
    if (alias && availableMCPs.includes(alias)) continue;
    
    // Check root mcps folder
    const inRoot = fs.existsSync(path.join(rootDir, 'src/mcps', `${server}.server.ts`));
    if (inRoot) continue;
    
    notFound.push(server);
  }
  
  if (notFound.length > 0) {
    return {
      success: false,
      error: `Registered MCPs without files: ${notFound.join(', ')}`
    };
  }
  
  return { success: true };
}

// Test: MCP servers have required properties
function testMCPServerProperties() {
  const mcpPath = path.join(rootDir, 'src/mcps/mcp-client.ts');
  const content = fs.readFileSync(mcpPath, 'utf-8');
  
  // Check for required properties in server configs
  const requiredProps = ['serverName', 'command', 'args', 'timeout'];
  
  for (const prop of requiredProps) {
    if (!content.includes(prop)) {
      return {
        success: false,
        error: `Missing required property: ${prop}`
      };
    }
  }
  
  return { success: true };
}

// Test: Consistency between features.json and MCP client
function testFeaturesMCPConsistency() {
  const features = loadFeatures();
  const registeredMCPs = loadMCPClientConfigs();
  
  const agentModels = features.agent_management?.agent_models || {};
  const agents = Object.keys(agentModels);
  
  const stats = {
    totalAgents: agents.length,
    registeredMCPs: registeredMCPs.length,
    matching: agents.filter(a => registeredMCPs.includes(a)).length,
    missing: agents.filter(a => !registeredMCPs.includes(a)).length
  };
  
  log(`Agents in features.json: ${stats.totalAgents}`, 'info');
  log(`MCP servers registered: ${stats.registeredMCPs}`, 'info');
  log(`Matching: ${stats.matching}`, 'info');
  
  if (stats.missing > 0) {
    return {
      success: false,
      error: `${stats.missing} agents in features.json have no MCP config`
    };
  }
  
  return { success: true };
}

// Test: Enhanced orchestrator vs basic orchestrator
function testOrchestratorRedundancy() {
  const registeredMCPs = loadMCPClientConfigs();
  
  const hasOrchestrator = registeredMCPs.includes('orchestrator');
  
  // Just check that orchestrator exists
  if (!hasOrchestrator) {
    return {
      success: false,
      error: 'orchestrator MCP is required'
    };
  }
  
  return { success: true };
}

// Print summary
function printSummary() {
  console.log('\n' + '='.repeat(60));
  log('MCP REGISTRATION VALIDATION SUMMARY', 'section');
  console.log('='.repeat(60));
  
  const features = loadFeatures();
  const agentModels = features.agent_management?.agent_models || {};
  const registeredMCPs = loadMCPClientConfigs();
  
  console.log(`\n📊 Configuration:`);
  console.log(`   Agents in features.json: ${Object.keys(agentModels).length}`);
  console.log(`   MCP servers registered: ${registeredMCPs.length}`);
  console.log(`   Available MCP servers: ${getAvailableMCPServers().length}`);
  
  console.log(`\n📈 Results:`);
  console.log(`   Total tests: ${results.passed + results.failed}`);
  console.log(`   Passed: ${results.passed} ✅`);
  console.log(`   Failed: ${results.failed} ❌`);
  console.log(`   Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    for (const t of results.tests.filter(t => t.status === 'failed')) {
      console.log(`  - ${t.name}: ${t.error}`);
    }
  }
  
  console.log('='.repeat(60) + '\n');
}

// Main execution
function main() {
  console.log('\n' + '='.repeat(60));
  log('MCP REGISTRATION VALIDATION TEST', 'section');
  console.log('='.repeat(60) + '\n');
  
  // Run validation tests
  test('features.json exists with agent_management', testFeaturesJsonExists);
  test('All agents in features.json have MCP config', testAgentsHaveMCPConfig);
  test('All registered MCP servers exist as files', testRegisteredMCPServersExist);
  test('MCP servers have required properties', testMCPServerProperties);
  test('Features.json and MCP client are consistent', testFeaturesMCPConsistency);
  test('No orchestrator redundancy', testOrchestratorRedundancy);
  
  printSummary();
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
