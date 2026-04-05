#!/usr/bin/env node

/**
 * Agent Validation Test Script
 * 
 * Tests that each agent can be imported and has valid configuration.
 * These agents are LLM configs, so we validate their structure.
 * 
 * Usage:
 *   node scripts/mjs/test-agent-configs.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import all agents
const agentsToTest = [
  'architect',
  'testing-lead', 
  'strategist',
  'seo-consultant',
  'content-creator',
  'growth-strategist',
  'mobile-developer',
  'database-engineer',
  'devops-engineer',
  'backend-engineer',
  'frontend-engineer',
  'tech-writer'
];

// Required fields for AgentConfig
const requiredFields = ['name', 'description', 'mode', 'system', 'capabilities', 'maxComplexity', 'enabled'];

const results = [];

async function testAgent(agentName) {
  try {
    // Dynamically import the agent - use dist folder
    const agentPath = new URL(`../../dist/agents/${agentName}.js`, import.meta.url);
    const module = await import(agentPath);
    
    // Get the agent config - try default export first, then named export with pascalCase
    let agentConfig = module.default;
    
    // If no default, try to find named export (e.g., testArchitect for test-architect)
    if (!agentConfig) {
      // Convert kebab-case to camelCase (test-architect -> testArchitect)
      const camelCaseName = agentName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      agentConfig = module[camelCaseName];
    }
    
    // If still not found, try the raw agent name from index
    if (!agentConfig) {
      const { builtinAgents } = await import('../../dist/agents/index.js');
      agentConfig = builtinAgents[agentName];
    }
    
    if (!agentConfig) {
      return { status: 'FAIL', error: 'No export found (tried default, camelCase, and builtinAgents)' };
    }
    
    // Check required fields
    const missingFields = requiredFields.filter(field => !agentConfig[field]);
    if (missingFields.length > 0) {
      return { status: 'FAIL', error: `Missing fields: ${missingFields.join(', ')}` };
    }
    
    // Check capabilities is an array
    if (!Array.isArray(agentConfig.capabilities)) {
      return { status: 'FAIL', error: 'capabilities is not an array' };
    }
    
    // Check enabled is boolean
    if (typeof agentConfig.enabled !== 'boolean') {
      return { status: 'FAIL', error: 'enabled is not a boolean' };
    }
    
    // Check maxComplexity is a number
    if (typeof agentConfig.maxComplexity !== 'number') {
      return { status: 'FAIL', error: 'maxComplexity is not a number' };
    }
    
    return { status: 'PASS', details: `OK - ${agentConfig.capabilities.length} capabilities` };
  } catch (error) {
    return { status: 'FAIL', error: error.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AGENT VALIDATION TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  console.log('Testing agents that previously failed:\n');
  
  for (const agentName of agentsToTest) {
    const result = await testAgent(agentName);
    results.push({ agent: agentName, ...result });
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const details = result.status === 'PASS' ? result.details : result.error;
    console.log(`${icon} ${agentName}: ${result.status} - ${details}`);
  }
  
  // Print summary table
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY TABLE');
  console.log('='.repeat(60));
  console.log('| Agent | Status | Error/Details |');
  console.log('|-------|--------|---------------|');
  for (const r of results) {
    const details = r.status === 'PASS' ? r.details : r.error;
    console.log(`| ${r.agent} | ${r.status} | ${details} |`);
  }
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log('='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
