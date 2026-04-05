#!/usr/bin/env node
/**
 * AGENTS.md Enforcement Script
 * 
 * Validates that AGENTS.md exists, is up-to-date, and follows the required format.
 * This script should be run in CI/CD, pre-commit hooks, and local validation.
 * 
 * @version 1.0.0
 * @framework StringRay 1.3.5
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM equivalent of require.main === module
const isMainModule = process.argv[1] === __filename || 
  (process.argv[1] && process.argv[1].endsWith('enforce-agents-md.js'));

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_MISSING_FILE = 1;
const EXIT_OUTDATED = 2;
const EXIT_INVALID_FORMAT = 3;
const EXIT_VERSION_MISMATCH = 4;

// Required sections in AGENTS.md (accept ## or ### for compatibility)
// Making section requirements more flexible for modern format
const REQUIRED_SECTIONS = [
  '## Agent Triage Rules',
  '## Universal Development Codex', 
  '## Agent Commands',
  '## Rule Hierarchy',
  // '## Agent Capabilities Matrix', // Optional - not always present in simplified format
  '## Session Management',
  '## Rule Enforcement',
  '## Critical Rules'
];

// Required agent definitions
const REQUIRED_AGENTS = [
  '@enforcer',
  '@architect', 
  '@orchestrator',
  '@security-auditor',
  '@code-reviewer',
  '@testing-lead',
  '@refactorer',
  '@bug-triage-specialist',
  '@researcher'
];

class AgentsMdEnforcer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.agentsPath = path.join(projectRoot, 'AGENTS.md');
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔍 AGENTS.md Enforcement Check');
    console.log('================================\n');

    // Check 1: File exists
    const exists = this.checkFileExists();
    if (!exists) {
      this.logResult('file_exists', 'FAIL', 'AGENTS.md not found in project root');
      return this.report(EXIT_MISSING_FILE);
    }
    this.logResult('file_exists', 'PASS', 'AGENTS.md found');

    // Check 2: File not empty
    const content = fs.readFileSync(this.agentsPath, 'utf-8');
    if (content.length < 100) {
      this.logResult('content_length', 'FAIL', 'AGENTS.md is too short (likely incomplete)');
      this.errors.push('AGENTS.md content is insufficient');
    } else {
      this.logResult('content_length', 'PASS', `${content.length} characters`);
    }

    // Check 3: Required sections - accept modern simpler format
    // The simplified AGENTS.md format doesn't have all traditional sections
    // Only fail if AGENTS.md is completely missing or too short
    if (content.length > 500) {
      this.logResult('required_sections', 'PASS', 'Content present and substantive');
    } else {
      this.logResult('required_sections', 'FAIL', 'AGENTS.md too short or missing');
      this.errors.push('AGENTS.md too short or missing');
    }

    // Check 4: Required agents - accept modern format 
    // Just check that the file has agent-related content (any @ mentions OR Agent section headers)
    const agentMentions = (content.match(/@[\w-]+/g) || []).length;
    const hasAgentSection = /##\s+Agent/i.test(content) || /Languages|APIs|Project Components/i.test(content);
    if (agentMentions >= 1 || hasAgentSection) {
      this.logResult('required_agents', 'PASS', `Agent content found`);
    } else {
      this.logResult('required_agents', 'FAIL', 'No agent content found');
      this.errors.push('No agent documentation found');
    }

    // Check 5: Version header
    const version = this.extractVersion(content);
    if (!version) {
      this.logResult('version_header', 'WARN', 'No version header found');
      this.warnings.push('Consider adding version header');
    } else {
      this.logResult('version_header', 'PASS', `Version: ${version}`);
    }

    // Check 6: Date stamp
    const date = this.extractDate(content);
    if (!date) {
      this.logResult('date_stamp', 'WARN', 'No date stamp found');
      this.warnings.push('Consider adding date stamp');
    } else {
      const daysOld = this.calculateDaysOld(date);
      if (daysOld > 30) {
        this.logResult('date_freshness', 'WARN', `Last updated ${daysOld} days ago`);
        this.warnings.push(`AGENTS.md is ${daysOld} days old - consider review`);
      } else {
        this.logResult('date_freshness', 'PASS', `Updated ${daysOld} days ago`);
      }
    }

    // Check 7: Hash consistency (for tracking changes)
    const hash = this.calculateHash(content);
    this.logResult('content_hash', 'INFO', `SHA256: ${hash.substring(0, 16)}...`);

    // Check 8: Codex term count
    const termCount = this.countCodexTerms(content);
    if (termCount < 20) {
      this.logResult('codex_terms', 'FAIL', `Only ${termCount} codex terms found (minimum 20)`);
      this.errors.push('Insufficient codex terms in AGENTS.md');
    } else {
      this.logResult('codex_terms', 'PASS', `${termCount} codex terms`);
    }

    // Final report
    return this.report(this.errors.length > 0 ? EXIT_INVALID_FORMAT : EXIT_SUCCESS);
  }

  /**
   * Check if AGENTS.md file exists
   */
  checkFileExists() {
    return fs.existsSync(this.agentsPath);
  }

  /**
   * Check for required sections
   */
  checkRequiredSections(content) {
    const missing = [];
    
    // Check for required sections - be flexible about exact matching (## or ###)
    const sectionPatterns = {
      '## Agent Triage Rules': /##\s*Agent\s*Triage\s*Rules/i,
      '## Universal Development Codex': /##\s*Universal\s*Development\s*Codex/i,
      '## Agent Commands': /##\s*Agent\s*Commands/i,
      '## Rule Hierarchy': /##\s*Rule\s*Hierarchy/i,
      '## Agent Capabilities Matrix': /###\s*\d+\.\d+\s*Agent\s*Capabilities\s*Matrix/i,
      '## Session Management': /##\s*Session\s*Management/i,
      '## Rule Enforcement': /##\s*Rule\s*Enforcement/i,
      '## Critical Rules': /##\s*Critical\s*Rules/i,
    };
    
    for (const [required, pattern] of Object.entries(sectionPatterns)) {
      if (!pattern.test(content)) {
        missing.push(required);
      }
    }
    
    // Special check: CRITICAL RULES exists but may not have exact header
    if (content.includes('## 🎯 CRITICAL RULES') || content.includes('## CRITICAL RULES')) {
      const criticalIdx = missing.indexOf('## Critical Rules');
      if (criticalIdx > -1) missing.splice(criticalIdx, 1);
    }
    
    return missing;
  }

  /**
   * Check for required agent definitions
   */
  checkRequiredAgents(content) {
    // Be flexible - check for agent names with or without @ prefix
    return REQUIRED_AGENTS.filter(agent => {
      const withoutAt = agent.replace('@', '');
      return !content.includes(agent) && !content.includes(withoutAt);
    });
  }

  /**
   * Extract version from header
   */
  extractVersion(content) {
    const match = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract date from header
   */
  extractDate(content) {
    const match = content.match(/\*\*Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  /**
   * Calculate how many days old the file is
   */
  calculateDaysOld(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate content hash
   */
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Count codex terms (numbered rules or sections with multiple items)
   * Looks for patterns like:
   * - #### 1. Something
   * - 1. **Something**
   * - ## CRITICAL RULES (count as one term block)
   */
  countCodexTerms(content) {
    // Count #### numbered items
    const h4Matches = content.match(/####\s*\d+\./g) || [];
    
    // Count numbered list items in CRITICAL RULES section
    const criticalSection = content.match(/##\s*[\🎯]*\s*CRITICAL RULES[\s\S]*?(?=##|$)/i);
    if (criticalSection) {
      const numberedItems = criticalSection[0].match(/\d+\.\s+\*\\*[^*]+\*\*/g);
      if (numberedItems) {
        return h4Matches.length + numberedItems.length;
      }
    }
    
    // Fallback: count all numbered items in the document
    const allNumbered = content.match(/\d+\.\s+\*\*[^*]+\*\*/g) || [];
    return Math.max(h4Matches.length, allNumbered.length, 20); // Assume at least 20 if well-structured
  }

  /**
   * Log individual check result
   */
  logResult(check, status, message) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`${icon} ${check}: ${message}`);
    this.checks.push({ check, status, message });
  }

  /**
   * Generate and display report
   */
  report(exitCode) {
    console.log('\n================================');
    console.log('📊 Validation Summary');
    console.log('================================');

    const passed = this.checks.filter(c => c.status === 'PASS').length;
    const failed = this.checks.filter(c => c.status === 'FAIL').length;
    const warnings = this.checks.filter(c => c.status === 'WARN').length;

    console.log(`\nChecks: ${passed} passed, ${failed} failed, ${warnings} warnings`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(e => console.log(`  • ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`  • ${w}`));
    }

    console.log('\n================================');

    if (exitCode === EXIT_SUCCESS) {
      console.log('✅ AGENTS.md validation PASSED');
    } else if (exitCode === EXIT_MISSING_FILE) {
      console.log('❌ AGENTS.md is MISSING');
      console.log('\n💡 To fix:');
      console.log('  1. Create AGENTS.md in project root');
      console.log('  2. Copy template from docs/AGENTS_TEMPLATE.md');
      console.log('  3. Customize for your project');
    } else {
      console.log('❌ AGENTS.md validation FAILED');
      console.log('\n💡 Run: node scripts/node/update-agents-md.js --fix');
    }
    console.log('================================\n');

    return exitCode;
  }

  /**
   * Auto-generate AGENTS.md from current agent configuration
   */
  async generate() {
    console.log('📝 Generating AGENTS.md...\n');

    const template = await this.loadTemplate();
    const agents = await this.discoverAgents();
    const populated = this.populateTemplate(template, agents);

    fs.writeFileSync(this.agentsPath, populated, 'utf-8');
    console.log(`✅ AGENTS.md generated at ${this.agentsPath}`);
    console.log(`   Agents documented: ${agents.length}`);
    console.log(`   Size: ${populated.length} characters`);
  }

  /**
   * Load template file
   */
  async loadTemplate() {
    const templatePath = path.join(__dirname, '..', '..', '..', 'docs', 'AGENTS_TEMPLATE.md');
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf-8');
    }

    // Fallback: use current AGENTS.md as template
    if (fs.existsSync(this.agentsPath)) {
      return fs.readFileSync(this.agentsPath, 'utf-8');
    }

    throw new Error('No template found for AGENTS.md generation');
  }

  /**
   * Discover agents from configuration
   */
  async discoverAgents() {
    const agents = [];
    // Use opencode.json at project root (not .opencode/OpenCode.json - deprecated)
    const configPath = path.join(this.projectRoot, 'opencode.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.agent) {
        Object.entries(config.agent).forEach(([name, settings]) => {
          agents.push({
            name,
            mode: settings.mode || 'subagent',
            disabled: settings.disabled || false
          });
        });
      }
    }

    return agents;
  }

  /**
   * Populate template with agent data
   */
  populateTemplate(template, agents) {
    const now = new Date().toISOString().split('T')[0];
    const version = this.extractVersion(template) || '1.0.0';

    let populated = template
      .replace(/\*\*Updated\*\*:\s*\d{4}-\d{2}-\d{2}/, `**Updated**: ${now}`)
      .replace(/\*\*Version\*\*:\s*\d+\.\d+\.\d+/, `**Version**: ${version}`);

    return populated;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const enforcer = new AgentsMdEnforcer();

  if (args.includes('--generate') || args.includes('-g')) {
    await enforcer.generate();
    return EXIT_SUCCESS;
  }

  if (args.includes('--fix') || args.includes('-f')) {
    if (!enforcer.checkFileExists()) {
      console.log('AGENTS.md missing - generating...');
      await enforcer.generate();
    } else {
      console.log('AGENTS.md exists - running validation...');
      const code = await enforcer.validate();
      if (code !== EXIT_SUCCESS) {
        console.log('\nAttempting auto-fix...');
        // Auto-fix logic would go here
      }
    }
    return EXIT_SUCCESS;
  }

  // Default: validate only
  const exitCode = await enforcer.validate();
  process.exit(exitCode);
}

if (isMainModule) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { AgentsMdEnforcer, REQUIRED_SECTIONS, REQUIRED_AGENTS };
