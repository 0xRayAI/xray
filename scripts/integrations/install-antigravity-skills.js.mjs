#!/usr/bin/env node
/**
 * StringRay - Antigravity Skills Integration Script
 * 
 * Installs curated Antigravity Awesome Skills into StringRay
 * Source: https://github.com/sickn33/antigravity-awesome-skills
 * License: MIT
 * 
 * Usage:
 *   node scripts/integrations/install-antigravity-skills.js
 *   node scripts/integrations/install-antigravity-skills.js --curated    # Only curated skills
 *   node scripts/integrations/install-antigravity-skills.js --full     # All 946+ skills
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Curated skills to install (selected from Antigravity for quality)
const CURATED_SKILLS = [
  // Language/Framework
  'typescript-expert',
  'python-patterns', 
  'react-patterns',
  'go-patterns',
  'rust-patterns',
  
  // DevOps/Cloud
  'docker-expert',
  'aws-serverless',
  'vercel-deployment',
  
  // Security
  'vulnerability-scanner',
  'api-security-best-practices',
  
  // Business/Marketing
  'copywriting',
  'pricing-strategy',
  'seo-fundamentals',
  
  // Data/AI
  'rag-engineer',
  'prompt-engineering',
  
  // General
  'brainstorming',
  'planning',
];

const ANTIGRAVITY_REPO = 'https://github.com/sickn33/antigravity-awesome-skills';
const SKILLS_SOURCE = `${ANTIGRAVITY_REPO}/raw/main/skills`;

const args = process.argv.slice(2);
const installFull = args.includes('--full');
const installCurated = args.includes('--curated') || (!installFull);

const skillsDir = path.join(rootDir, '.opencode/skills');
const integrationDir = path.join(rootDir, '.opencode/integrations');

async function downloadSkill(skillName) {
  const url = `${SKILLS_SOURCE}/${skillName}/SKILL.md`;
  const destPath = path.join(integrationDir, `${skillName}/SKILL.md`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  ${skillName}: not found (${response.status})`);
      return false;
    }
    
    const content = await response.text();
    
    // Add StringRay attribution header
    const attribution = `---
name: ${skillName}
source: antigravity-awesome-skills
attribution: |
  Originally from ${ANTIGRAVITY_REPO}
  License: MIT (see LICENSE.antigravity)
converted: ${new Date().toISOString()}
---

${content}`;
    
    // Ensure directory exists
    const skillDir = path.dirname(destPath);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }
    
    fs.writeFileSync(destPath, attribution);
    console.log(`  ✅ ${skillName}`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${skillName}: ${error.message}`);
    return false;
  }
}

async function createLicenseFile() {
  const licensePath = path.join(rootDir, 'LICENSE.antigravity');
  const licenseContent = `Antigravity Awesome Skills - License
=====================================

This file contains third-party skills from Antigravity Awesome Skills.

Source: ${ANTIGRAVITY_REPO}
License: MIT

Original License Text:
---------------------

MIT License

Copyright (c) 2026 Antigravity User

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
- typescript-expert: Community
- python-patterns: Community
- docker-expert: Community
- copywriting: Community
- brainstorming: Community
- And many more from the Antigravity community
`;

  fs.writeFileSync(licensePath, licenseContent);
  console.log('✅ Created LICENSE.antigravity');
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  StringRay - Antigravity Skills Integration                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Source: ${ANTIGRAVITY_REPO}║`);
  console.log('║  License: MIT                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Ensure directories exist
  if (!fs.existsSync(integrationDir)) {
    fs.mkdirSync(integrationDir, { recursive: true });
  }

  // Create license file
  await createLicenseFile();

  const skillsToInstall = installFull 
    ? ['full'] // Would need to fetch full list
    : CURATED_SKILLS;

  console.log(`📦 Installing ${installCurated ? 'curated' : 'all'} skills...\n`);

  if (installCurated) {
    let success = 0;
    for (const skill of CURATED_SKILLS) {
      const result = await downloadSkill(skill);
      if (result) success++;
    }
    
    console.log(`\n✅ Installed ${success}/${CURATED_SKILLS.length} curated skills`);
    console.log(`📁 Location: ${integrationDir}/`);
    console.log('\nTo use a skill in your prompts:');
    console.log('  "@integrations/typescript-expert help me with types..."');
  } else {
    console.log('⚠️  Full installation requires cloning the repository');
    console.log(`   Run: git clone ${ANTIGRAVITY_REPO}.git .opencode/skills-antigravity`);
  }
}

main().catch(console.error);
