#!/usr/bin/env node

/**
 * Version Manager for StringRay
 * 
 * Updates version in:
 * - package.json
 * - init.sh
 * - CHANGELOG.md (auto-generates entry)
 * - README.md (updates agent/MCP/skill counts)
 * - AGENTS.md (updates agent/MCP/skill counts)
 * 
 * Usage:
 *   node scripts/node/version-manager.mjs [major|minor|patch]
 *   node scripts/node/version-manager.mjs 1.6.9
 *   node scripts/node/version-manager.mjs patch "Added new feature"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Files to update with version
const VERSION_FILES = [
  { file: 'package.json', field: 'version', pattern: /"version":\s*"[^"]+"/ },
  { file: 'init.sh', field: 'STRRAY_VERSION', pattern: /STRRAY_VERSION="[^"]+"/ }
];

/**
 * Count actual framework components
 */
function getFrameworkCounts() {
  const counts = {
    agents: 0,
    mcps: 0,
    skills: 0
  };
  
  // Count agents (.yml files in .opencode/agents/)
  const agentsDir = path.join(rootDir, '.opencode/agents');
  if (fs.existsSync(agentsDir)) {
    counts.agents = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.yml'))
      .length;
  }
  
  // Count MCP servers (.server.js files in dist/mcps/)
  const mcpsDir = path.join(rootDir, 'dist/mcps');
  if (fs.existsSync(mcpsDir)) {
    counts.mcps = fs.readdirSync(mcpsDir)
      .filter(f => f.endsWith('.server.js'))
      .length;
  } else {
    // Try node_modules path for published package
    const nodeModulesMcps = path.join(rootDir, 'node_modules/strray-ai/dist/mcps');
    if (fs.existsSync(nodeModulesMcps)) {
      counts.mcps = fs.readdirSync(nodeModulesMcps)
        .filter(f => f.endsWith('.server.js'))
        .length;
    }
  }
  
  // Count skills (directories in .opencode/skills/)
  const skillsDir = path.join(rootDir, '.opencode/skills');
  if (fs.existsSync(skillsDir)) {
    counts.skills = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory())
      .length;
  }
  
  return counts;
}

function getChangelogEntry(newVersion, changeDescription) {
  const date = new Date().toISOString().split('T')[0];
  
  let content = changeDescription || '';
  
  return `## [${newVersion}] - ${date}

### 🔄 Changes

${content ? content : '- Version bump'}

---

`;
}

function updateChangelog(newVersion, changeDescription) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let changelog = fs.readFileSync(changelogPath, 'utf-8');
  
  // Find the position after the header and insert new entry
  const headerEnd = changelog.indexOf('## [');
  if (headerEnd === -1) {
    console.log('⚠️  Could not find version header in CHANGELOG.md');
    return;
  }
  
  const newEntry = getChangelogEntry(newVersion, changeDescription);
  const newChangelog = changelog.slice(0, headerEnd) + newEntry + changelog.slice(headerEnd);
  
  fs.writeFileSync(changelogPath, newChangelog);
  console.log(`✅ Updated CHANGELOG.md`);
}

/**
 * Update README.md with actual framework counts
 */
function updateReadme(counts) {
  const readmePath = path.join(rootDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.log(`⚠️  README.md not found, skipping`);
    return;
  }
  
  let readme = fs.readFileSync(readmePath, 'utf-8');
  
  // Update agent count: [View all 23 agents →](AGENTS.md)
  readme = readme.replace(
    /\[View all \d+ agents →]\(AGENTS\.md\)/,
    `[View all ${counts.agents} agents →](AGENTS.md)`
  );
  
  // Update MCP count: "15 MCP servers" or similar patterns
  readme = readme.replace(
    /(\d+)\s+MCPs?/g,
    (match, num) => `${counts.mcps} MCPs`
  );
  
  // Update skills count
  readme = readme.replace(
    /(\d+)\s+Skills?/g,
    (match, num) => `${counts.skills} Skills`
  );
  
  // Update components line like "9 agents, 28 MCP servers, 8 interconnected pipelines"
  readme = readme.replace(
    /(\d+)\s+agents,\s*(\d+)\s+MCP servers/,
    `${counts.agents} agents, ${counts.mcps} MCP servers`
  );
  
  fs.writeFileSync(readmePath, readme);
  console.log(`✅ Updated README.md (agents: ${counts.agents}, mcps: ${counts.mcps}, skills: ${counts.skills})`);
}

/**
 * Update AGENTS.md with actual framework counts
 */
function updateAgentsMd(counts) {
  const agentsPath = path.join(rootDir, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    console.log(`⚠️  AGENTS.md not found, skipping`);
    return;
  }
  
  let agentsMd = fs.readFileSync(agentsPath, 'utf-8');
  
  // Update header counts like "StringRay - 23 Agents, 39 MCPs, 52 Skills"
  agentsMd = agentsMd.replace(
    /StringRay\s*-\s*\d+\s+Agents/,
    `StringRay - ${counts.agents} Agents`
  );
  
  agentsMd = agentsMd.replace(
    /\d+\s+MCPs?/g,
    `${counts.mcps} MCPs`
  );
  
  agentsMd = agentsMd.replace(
    /\d+\s+Skills?/g,
    `${counts.skills} Skills`
  );
  
  fs.writeFileSync(agentsPath, agentsMd);
  console.log(`✅ Updated AGENTS.md`);
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

function parseVersion(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  };
}

function bumpVersion(current, type) {
  const v = parseVersion(current);
  
  switch (type) {
    case 'major':
      v.major++;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor++;
      v.patch = 0;
      break;
    case 'patch':
      v.patch++;
      break;
    default:
      // Assume it's a specific version
      return type;
  }
  
  return `${v.major}.${v.minor}.${v.patch}`;
}

function updateVersion(newVersion, changeDescription = '') {
  console.log(`\n📦 Updating version to ${newVersion}\n`);
  
  // Update package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated package.json`);
  
  // Update init.sh
  const initPath = path.join(rootDir, 'init.sh');
  let initContent = fs.readFileSync(initPath, 'utf-8');
  initContent = initContent.replace(
    /STRRAY_VERSION="[^"]+"/,
    `STRRAY_VERSION="${newVersion}"`
  );
  fs.writeFileSync(initPath, initContent);
  console.log(`✅ Updated init.sh`);
  
  // Update CHANGELOG.md
  updateChangelog(newVersion, changeDescription);
  
  // Get actual framework counts and update documentation
  const counts = getFrameworkCounts();
  console.log(`\n📊 Framework counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills`);
  
  updateReadme(counts);
  updateAgentsMd(counts);
  
  console.log(`\n🎉 Version updated to ${newVersion}\n`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    const current = getCurrentVersion();
    console.log(`\n📌 Current version: ${current}`);
    console.log(`\nUsage:`);
    console.log(`  node scripts/node/version-manager.mjs [major|minor|patch] [description]`);
    console.log(`  node scripts/node/version-manager.mjs 1.6.9 "Description of changes"`);
    console.log(`\nExamples:`);
    console.log(`  node scripts/node/version-manager.mjs patch  # 1.6.8 -> 1.6.9`);
    console.log(`  node scripts/node/version-manager.mjs minor  # 1.6.8 -> 1.7.0`);
    console.log(`  node scripts/node/version-manager.mjs major  # 1.6.8 -> 2.0.0`);
    console.log(`  node scripts/node/version-manager.mjs patch "Added new MCP server"  # with changelog entry`);
    process.exit(0);
  }
  
  const current = getCurrentVersion();
  const type = args[0];
  const changeDescription = args[1] || '';  const newVersion = bumpVersion(current, type);
  
  console.log(`\n📌 Current version: ${current}`);
  console.log(`📌 Bumping: ${type}`);
  if (changeDescription) {
    console.log(`📌 Changes: ${changeDescription}`);
  }
  
  updateVersion(newVersion, changeDescription);
}

main();
