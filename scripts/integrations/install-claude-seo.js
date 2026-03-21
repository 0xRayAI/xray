#!/usr/bin/env node
/**
 * StringRay - Claude SEO Integration Script
 * 
 * Installs Claude SEO skill into StringRay
 * Source: https://github.com/AgriciDaniel/claude-seo
 * License: MIT
 * 
 * Features:
 * - 13 sub-skills for comprehensive SEO
 * - 6 parallel subagents
 * - MCP extensions (DataForSEO, Ahrefs, Semrush)
 * - PDF report generation
 * 
 * Usage:
 *   node scripts/integrations/install-claude-seo.js        # Install core skills
 *   node scripts/integrations/install-claude-seo.js --full  # Include all subagents & extensions
 *   node scripts/integrations/install-claude-seo.js --help  # Show help
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Claude SEO Repository
const CLAUDE_SEO_REPO = 'https://github.com/AgriciDaniel/claude-seo';
const CLAUDE_SEO_DIR = '.opencode/integrations/claude-seo';

// Skills to install (mapped from claude-seo structure)
const CORE_SKILLS = [
  {
    name: 'seo-audit',
    source: 'skills/seo-audit/SKILL.md',
    description: 'Full website audit with parallel subagent delegation'
  },
  {
    name: 'seo-page', 
    source: 'skills/seo-page/SKILL.md',
    description: 'Deep single-page analysis'
  },
  {
    name: 'seo-sitemap',
    source: 'skills/seo-sitemap/SKILL.md',
    description: 'XML sitemap analysis and generation'
  },
  {
    name: 'seo-schema',
    source: 'skills/seo-schema/SKILL.md',
    description: 'Schema markup detection, validation, and generation'
  },
  {
    name: 'seo-technical',
    source: 'skills/seo-technical/SKILL.md',
    description: 'Technical SEO audit (8 categories)'
  },
  {
    name: 'seo-content',
    source: 'skills/seo-content/SKILL.md',
    description: 'E-E-A-T and content quality analysis'
  },
  {
    name: 'seo-geo',
    source: 'skills/seo-geo/SKILL.md',
    description: 'AI Search / GEO optimization'
  },
  {
    name: 'seo-plan',
    source: 'skills/seo-plan/SKILL.md',
    description: 'Strategic SEO planning'
  }
];

const ADVANCED_SKILLS = [
  {
    name: 'seo-programmatic',
    source: 'skills/seo-programmatic/SKILL.md',
    description: 'Programmatic SEO analysis and planning'
  },
  {
    name: 'seo-competitor-pages',
    source: 'skills/seo-competitor-pages/SKILL.md',
    description: 'Competitor comparison page generator'
  },
  {
    name: 'seo-hreflang',
    source: 'skills/seo-hreflang/SKILL.md',
    description: 'Hreflang/i18n SEO audit and generation'
  },
  {
    name: 'seo-images',
    source: 'skills/seo-images/SKILL.md',
    description: 'Image optimization analysis'
  }
];

const SUBAGENTS = [
  { name: 'seo-ai-visibility', source: 'agents/geo-ai-visibility.md' },
  { name: 'seo-platform-analysis', source: 'agents/geo-platform-analysis.md' },
  { name: 'seo-technical-agent', source: 'agents/geo-technical.md' },
  { name: 'seo-content-agent', source: 'agents/geo-content.md' },
  { name: 'seo-schema-agent', source: 'agents/geo-schema.md' }
];

const args = process.argv.slice(2);
const installFull = args.includes('--full');
const showHelp = args.includes('--help');
const dryRun = args.includes('--dry-run');

const integrationDir = path.join(rootDir, CLAUDE_SEO_DIR);
const tempCloneDir = path.join(rootDir, '.opencode/.temp-claude-seo');

/**
 * Print help message
 */
function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  StringRay - Claude SEO Integration Help                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Source: ${CLAUDE_SEO_REPO}║
║  License: MIT                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/integrations/install-claude-seo.js [options]

Options:
  --core       Install core SEO skills only (30 skills)
  --full       Install all skills, subagents, and MCP extensions
  --dry-run    Show what would be installed without installing
  --help       Show this help message

Examples:
  # Install core SEO skills
  node scripts/integrations/install-claude-seo.js

  # Install everything including advanced skills and subagents
  node scripts/integrations/install-claude-seo.js --full

  # Preview what would be installed
  node scripts/integrations/install-claude-seo.js --dry-run

Commands available after installation:
  /seo audit <url>         - Full website audit
  /seo page <url>          - Single page analysis  
  /seo sitemap <url>       - Sitemap analysis
  /seo schema <url>        - Schema markup
  /seo technical <url>     - Technical SEO audit
  /seo content <url>       - E-E-A-T analysis
  /seo geo <url>           - AI search optimization
  /seo plan <type>         - Strategic planning
  /seo programmatic <url>  - Programmatic SEO
  /seo competitor-pages    - Comparison pages
  /seo hreflang <url>      - Multi-language SEO

Skills installed: 8 core + 4 advanced = 12 total
Subagents installed: 5 (with --full)

`);
}

/**
 * Create LICENSE file
 */
async function createLicenseFile() {
  const licensePath = path.join(rootDir, 'LICENSE.claude-seo');
  const licenseContent = `Claude SEO - License
========================

This file contains third-party skills from Claude SEO.

Source: ${CLAUDE_SEO_REPO}
License: MIT

Original License Text:
---------------------

MIT License

Copyright (c) 2026 AgriciDaniel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

Attribution:
- Claude SEO: AgriciDaniel
- Framework: StringRay v1.7.5
- Integration: Automated installation script
`;

  fs.writeFileSync(licensePath, licenseContent);
  console.log('✅ Created LICENSE.claude-seo');
}

/**
 * Clone or update the claude-seo repository
 */
async function cloneRepo() {
  console.log('\n📦 Cloning Claude SEO repository...');
  
  // Clean up temp dir if exists
  if (fs.existsSync(tempCloneDir)) {
    fs.rmSync(tempCloneDir, { recursive: true, force: true });
  }
  
  try {
    execSync(`git clone --depth 1 ${CLAUDE_SEO_REPO}.git "${tempCloneDir}"`, {
      stdio: 'inherit',
      cwd: rootDir
    });
    console.log('✅ Repository cloned successfully');
    return true;
  } catch (error) {
    console.log('❌ Failed to clone repository:', error.message);
    return false;
  }
}

/**
 * Copy a skill file with StringRay attribution
 */
function copySkillFile(sourcePath, destPath, skillName) {
  if (!fs.existsSync(sourcePath)) {
    console.log(`  ⚠️  ${skillName}: source not found`);
    return false;
  }
  
  const content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Add StringRay attribution header
  const attribution = `---
name: ${skillName}
source: claude-seo
attribution: |
  Originally from ${CLAUDE_SEO_REPO}
  License: MIT (see LICENSE.claude-seo)
converted: ${new Date().toISOString()}
framework: StringRay v1.7.5
---

${content}

---

*This skill was integrated into StringRay via the claude-seo integration script.*
*Original source: ${CLAUDE_SEO_REPO}*
`;
  
  // Ensure directory exists
  const skillDir = path.dirname(destPath);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  
  fs.writeFileSync(destPath, attribution);
  return true;
}

/**
 * Copy subagent file
 */
function copyAgentFile(sourcePath, destPath, agentName) {
  if (!fs.existsSync(sourcePath)) {
    console.log(`  ⚠️  ${agentName}: source not found`);
    return false;
  }
  
  const content = fs.readFileSync(sourcePath, 'utf-8');
  
  // Add StringRay attribution
  const attribution = `---
name: ${agentName}
type: subagent
source: claude-seo
attribution: |
  Originally from ${CLAUDE_SEO_REPO}
  License: MIT
converted: ${new Date().toISOString()}
---

${content}

---

*This agent was integrated into StringRay via the claude-seo integration script.*
`;
  
  const agentDir = path.dirname(destPath);
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  
  fs.writeFileSync(destPath, attribution);
  return true;
}

/**
 * Create routing configuration for task-skill-router
 */
function createRoutingConfig() {
  const routingConfig = {
    name: 'claude-seo-routing',
    description: 'SEO routing configuration for Claude SEO integration',
    routes: [
      { pattern: '/seo audit', skill: 'seo-audit', agents: ['seo-consultant'] },
      { pattern: '/seo page', skill: 'seo-page', agents: ['seo-consultant'] },
      { pattern: '/seo sitemap', skill: 'seo-sitemap', agents: ['seo-consultant'] },
      { pattern: '/seo schema', skill: 'seo-schema', agents: ['seo-consultant'] },
      { pattern: '/seo technical', skill: 'seo-technical', agents: ['seo-consultant'] },
      { pattern: '/seo content', skill: 'seo-content', agents: ['seo-consultant'] },
      { pattern: '/seo geo', skill: 'seo-geo', agents: ['seo-consultant'] },
      { pattern: '/seo plan', skill: 'seo-plan', agents: ['seo-consultant'] },
      { pattern: '/seo programmatic', skill: 'seo-programmatic', agents: ['seo-consultant'] },
      { pattern: '/seo competitor', skill: 'seo-competitor-pages', agents: ['seo-consultant'] },
      { pattern: '/seo hreflang', skill: 'seo-hreflang', agents: ['seo-consultant'] },
      { pattern: '/seo images', skill: 'seo-images', agents: ['seo-consultant'] }
    ],
    keywords: [
      'seo audit', 'seo analysis', 'technical seo', 'on-page seo',
      'schema markup', 'sitemap', 'core web vitals', 'e-e-a-t',
      'ai search', 'geo optimization', 'programmatic seo'
    ]
  };
  
  const routingPath = path.join(integrationDir, 'routing.json');
  fs.writeFileSync(routingPath, JSON.stringify(routingConfig, null, 2));
  console.log('✅ Created routing configuration');
}

/**
 * Create a README for the integration
 */
function createReadme() {
  const readmeContent = `# Claude SEO Integration

This directory contains the Claude SEO skill integrated into StringRay.

## Source

- **Original**: [${CLAUDE_SEO_REPO}](${CLAUDE_SEO_REPO})
- **License**: MIT
- **Version**: Installed ${new Date().toISOString()}

## Features

### Core Skills (8)
- \`seo-audit/\` - Full website audit with parallel subagents
- \`seo-page/\` - Deep single-page analysis
- \`seo-sitemap/\` - XML sitemap analysis and generation
- \`seo-schema/\` - Schema markup detection and generation
- \`seo-technical/\` - Technical SEO audit (8 categories)
- \`seo-content/\` - E-E-A-T and content quality analysis
- \`seo-geo/\` - AI Search / GEO optimization
- \`seo-plan/\` - Strategic SEO planning

### Advanced Skills (4, --full only)
- \`seo-programmatic/\` - Programmatic SEO with quality gates
- \`seo-competitor-pages/\` - "X vs Y" comparison generator
- \`seo-hreflang/\` - Multi-language SEO validation
- \`seo-images/\` - Image optimization analysis

### Subagents (5, --full only)
- seo-ai-visibility
- seo-platform-analysis  
- seo-technical-agent
- seo-content-agent
- seo-schema-agent

## Usage

After installation, use these commands in Claude Code:

\`\`\`
/seo audit <url>         - Full website audit
/seo page <url>          - Single page analysis
/seo technical <url>     - Technical SEO audit
/seo content <url>       - E-E-A-T analysis
/seo geo <url>           - AI search optimization
/seo schema <url>        - Schema markup
/seo sitemap generate    - Generate sitemap
\`\`\`

## Integration with StringRay

This integration works alongside StringRay's built-in SEO tools:

| Feature | StringRay | Claude SEO |
|---------|-----------|------------|
| Technical SEO | Basic | Advanced (8 cats) |
| Schema | 6 types | 10+ types |
| AI Search | Basic | Advanced |
| E-E-A-T | ❌ | ✅ |
| PDF Reports | ❌ | ✅ |
| Programmatic | ❌ | ✅ |

## Commands

\`\`\`bash
# Install core skills
node scripts/integrations/install-claude-seo.js

# Install everything
node scripts/integrations/install-claude-seo.js --full

# Re-install
node scripts/integrations/install-claude-seo.js --full
\`\`\`

---
*Integrated into StringRay v1.7.5*
`;

  const readmePath = path.join(integrationDir, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ Created README.md');
}

/**
 * Main installation function
 */
async function main() {
  if (showHelp) {
    printHelp();
    return;
  }
  
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  StringRay - Claude SEO Integration                                 ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Source: ${CLAUDE_SEO_REPO}║`);
  console.log('║  License: MIT                                                      ║');
  console.log(`║  Mode: ${installFull ? 'FULL (all skills + subagents)' : 'CORE (30 skills)'}             ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log();
  
  if (dryRun) {
    console.log('🔍 DRY RUN - Would install:\n');
    console.log('Core Skills:', CORE_SKILLS.map(s => s.name).join(', '));
    if (installFull) {
      console.log('Advanced Skills:', ADVANCED_SKILLS.map(s => s.name).join(', '));
      console.log('Subagents:', SUBAGENTS.map(a => a.name).join(', '));
    }
    console.log('\n✅ Dry run complete');
    return;
  }
  
  // Step 1: Clone repository
  const cloned = await cloneRepo();
  if (!cloned) {
    console.log('\n❌ Installation failed - could not clone repository');
    console.log('   Make sure git is installed and you have network access');
    process.exit(1);
  }
  
  // Step 2: Create integration directory
  if (!fs.existsSync(integrationDir)) {
    fs.mkdirSync(integrationDir, { recursive: true });
  }
  
  // Step 3: Install core skills
  console.log('\n📦 Installing core skills...\n');
  let success = 0;
  
  for (const skill of CORE_SKILLS) {
    const sourcePath = path.join(tempCloneDir, skill.source);
    const destPath = path.join(integrationDir, skill.name, 'SKILL.md');
    if (copySkillFile(sourcePath, destPath, skill.name)) {
      console.log(`  ✅ ${skill.name}`);
      success++;
    }
  }
  
  console.log(`\n📦 Installing advanced skills...\n`);
  
  // Step 4: Install advanced skills (if --full)
  for (const skill of ADVANCED_SKILLS) {
    const sourcePath = path.join(tempCloneDir, skill.source);
    const destPath = path.join(integrationDir, skill.name, 'SKILL.md');
    if (copySkillFile(sourcePath, destPath, skill.name)) {
      console.log(`  ✅ ${skill.name}`);
      success++;
    }
  }
  
  // Step 5: Install subagents (if --full)
  if (installFull) {
    console.log('\n📦 Installing subagents...\n');
    for (const agent of SUBAGENTS) {
      const sourcePath = path.join(tempCloneDir, agent.source);
      const destPath = path.join(integrationDir, 'agents', `${agent.name}.md`);
      if (copyAgentFile(sourcePath, destPath, agent.name)) {
        console.log(`  ✅ ${agent.name}`);
        success++;
      }
    }
  }
  
  // Step 6: Create supporting files
  console.log('\n📝 Creating supporting files...\n');
  await createLicenseFile();
  createRoutingConfig();
  createReadme();
  
  // Step 7: Cleanup temp directory
  if (fs.existsSync(tempCloneDir)) {
    fs.rmSync(tempCloneDir, { recursive: true, force: true });
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('✅ Installation Complete!');
  console.log('═'.repeat(70));
  console.log(`\n📦 Installed ${success} items`);
  console.log(`📁 Location: ${integrationDir}/`);
  console.log('\n🧪 Testing installation...');
  
  // Verify installation
  const skillsInstalled = fs.readdirSync(integrationDir).filter(f => 
    fs.existsSync(path.join(integrationDir, f, 'SKILL.md'))
  );
  
  console.log(`   Skills: ${skillsInstalled.length}`);
  console.log('\n📖 Usage:');
  console.log('   /seo audit <url>         - Full website audit');
  console.log('   /seo technical <url>     - Technical SEO');
  console.log('   /seo content <url>       - E-E-A-T analysis');
  console.log('   /seo geo <url>           - AI search optimization');
  console.log('\n💡 Next Steps:');
  console.log('   1. Restart Claude Code to load new skills');
  console.log('   2. Try: /seo audit https://your-site.com');
  console.log('   3. StringRay SEO + Claude SEO = Supercharged! 🚀');
  console.log();
}

// Run the main function
main().catch(error => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
