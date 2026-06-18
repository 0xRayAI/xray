#!/usr/bin/env node

/**
 * Version Manager for xray
 * 
 * Updates version in:
 * - package.json
 * - CHANGELOG.md (auto-generates from git commits since last tag)
 * - README.md (updates agent/MCP/skill counts)
 * - AGENTS.md (updates agent/MCP/skill counts)
 * 
 * Auto-generates changelog from git commits using conventional commit format.
 * Usage:
 *   node scripts/node/version-manager.mjs [major|minor|patch]
 *   node scripts/node/version-manager.mjs [major|minor|patch] "Custom description"
 *   node scripts/node/version-manager.mjs [major|minor|patch] --tag
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Files to update with version
const VERSION_FILES = [
  { file: 'package.json', field: 'version', pattern: /"version":\s*"[^"]+"/ }
];

// Commit types for changelog grouping
const COMMIT_TYPES = {
  feat: { emoji: '✨', title: 'Features', prefix: 'feat:' },
  fix: { emoji: '🐛', title: 'Bug Fixes', prefix: 'fix:' },
  docs: { emoji: '📚', title: 'Documentation', prefix: 'docs:' },
  chore: { emoji: '🔧', title: 'Maintenance', prefix: 'chore:' },
  refactor: { emoji: '♻️', title: 'Refactoring', prefix: 'refactor:' },
  perf: { emoji: '⚡', title: 'Performance', prefix: 'perf:' },
  test: { emoji: '🧪', title: 'Tests', prefix: 'test:' },
  style: { emoji: '💎', title: 'Styles', prefix: 'style:' },
  ci: { emoji: '👷', title: 'CI/CD', prefix: 'ci:' },
  build: { emoji: '📦', title: 'Builds', prefix: 'build:' },
  revert: { emoji: '⏪', title: 'Reverts', prefix: 'revert:' }
};

/**
 * Get the last git tag (most recent version)
 */
function getLastGitTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"', {
      cwd: rootDir,
      encoding: 'utf-8'
    }).trim();
    return tag || 'v0.0.0';
  } catch {
    return 'v0.0.0';
  }
}

/**
 * Extract commits since the last tag
 */
function getCommitsSinceLastTag() {
  const lastTag = getLastGitTag();
  console.log(`📊 Found last tag: ${lastTag}`);
  
  try {
    // Get commits since last tag with conventional format
    const commits = execSync(
      `git log ${lastTag}..HEAD --oneline --format="%s||%h"`,
      { cwd: rootDir, encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);
    
    return commits.map(commit => {
      const [message, hash] = commit.split('||');
      return { message: message.trim(), hash: hash.trim() };
    });
  } catch (error) {
    // If no tags or error, get all commits from initial commit
    console.log('⚠️  Could not get commits from tag, using all commits');
    const commits = execSync(
      `git log --oneline --format="%s||%h" -n 50`,
      { cwd: rootDir, encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);
    
    return commits.map(commit => {
      const [message, hash] = commit.split('||');
      return { message: message.trim(), hash: hash.trim() };
    });
  }
}

/**
 * Parse commits and group by type
 */
function parseCommitsByType(commits) {
  const grouped = {
    feat: [],
    fix: [],
    docs: [],
    chore: [],
    refactor: [],
    perf: [],
    test: [],
    style: [],
    ci: [],
    build: [],
    revert: [],
    other: []
  };
  
  for (const commit of commits) {
    const message = commit.message.toLowerCase();
    let matched = false;
    
    for (const [type, config] of Object.entries(COMMIT_TYPES)) {
      if (message.startsWith(config.prefix)) {
        grouped[type].push(commit);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      grouped.other.push(commit);
    }
  }
  
  return grouped;
}

/**
 * Generate changelog content from commits
 */
function generateChangelogFromCommits(commits) {
  const grouped = parseCommitsByType(commits);
  const sections = [];
  
  // Build sections in preferred order
  const typeOrder = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'style', 'ci', 'build', 'chore', 'revert'];
  
  for (const type of typeOrder) {
    if (grouped[type].length > 0) {
      const config = COMMIT_TYPES[type];
      const items = grouped[type].map(c => `- ${c.message} (${c.hash})`).join('\n');
      sections.push(`### ${config.emoji} ${config.title}\n${items}`);
    }
  }
  
  // Add other/unclassified if any
  if (grouped.other.length > 0 && grouped.other.length <= 5) {
    const items = grouped.other.map(c => `- ${c.message} (${c.hash})`).join('\n');
    sections.push(`### 🔎 Other Changes\n${items}`);
  }
  
  return sections.join('\n\n') || '- Version bump';
}

/**
 * Count actual framework components
 */
function getFrameworkCounts() {
  const counts = {
    agents: 0,
    mcps: 0,
    skills: 0
  };
  
  // Count agents (.yml files in src/opencode/agents/ — source of truth)
  const agentsDir = path.join(rootDir, 'src/opencode/agents');
  if (fs.existsSync(agentsDir)) {
    counts.agents = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.yml'))
      .length;
  }
  
  // Consumer MCP count from .mcp.json SSOT (7 servers), not internal dist/mcps inventory
  const mcpJsonPath = path.join(rootDir, '.mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      const servers = mcpJson.mcpServers || mcpJson.servers || {};
      counts.mcps = Object.keys(servers).length;
    } catch {
      counts.mcps = 7;
    }
  } else {
    counts.mcps = 7;
  }
  
  // Count skills (directories in src/skills/ with SKILL.md)
  const skillsDir = path.join(rootDir, 'src/skills');
  if (fs.existsSync(skillsDir)) {
    counts.skills = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory())
      .filter(f => fs.existsSync(path.join(skillsDir, f, 'SKILL.md')))
      .length;
  }
  
  return counts;
}

function getChangelogEntry(newVersion, changeDescription) {
  const date = new Date().toISOString().split('T')[0];
  
  // If manual description provided, use it; otherwise auto-generate from commits
  let content;
  if (changeDescription) {
    content = changeDescription;
  } else {
    // Auto-generate from git commits
    console.log('📝 No description provided, auto-generating from git commits...');
    const commits = getCommitsSinceLastTag();
    console.log(`📊 Found ${commits.length} commits since last release`);
    content = generateChangelogFromCommits(commits);
  }
  
  return `## [${newVersion}] - ${date}

### 🔄 Changes

${content}

---

`;
}

function changelogHasVersion(newVersion) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return false;
  const changelog = fs.readFileSync(changelogPath, 'utf-8');
  return new RegExp(`^## \\[${newVersion.replace(/\./g, '\\.')}\\]`, 'm').test(changelog);
}

function updateChangelog(newVersion, changeDescription) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let changelog = fs.readFileSync(changelogPath, 'utf-8');

  if (changelogHasVersion(newVersion)) {
    console.log(`ℹ️  CHANGELOG.md already has [${newVersion}] — skipping duplicate entry`);
    return;
  }
  
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
 * Update README.md with actual framework counts and version
 */
function updateReadme(counts, newVersion) {
  const readmePath = path.join(rootDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.log(`⚠️  README.md not found, skipping`);
    return;
  }
  
  let readme = fs.readFileSync(readmePath, 'utf-8');

  // Update header line: **v3.4.1** — 42 agents · 45 skills · 7 MCP servers · ...
  readme = readme.replace(
    /^\*\*v[\d.]+\*\* — \d+ agents · \d+ skills · \d+ MCP servers? · \d+ codex terms(?: · [\d,]+ tests)?/m,
    `**v${newVersion}** — ${counts.agents} agents · ${counts.skills} skills · ${counts.mcps} MCP servers · 68 codex terms · 3,226 tests`
  );
  
  // Update version badge: [![Version](https://img.shields.io/badge/version-1.6.x-blue...)]
  readme = readme.replace(
    /img.shields.io\/badge\/version-[\d.]+/,
    `img.shields.io/badge/version-${newVersion}`
  );
  
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
  console.log(`✅ Updated README.md (version: ${newVersion}, agents: ${counts.agents}, mcps: ${counts.mcps}, skills: ${counts.skills})`);
}

const DOCS_SITE_HEADER_FILES = [
  'docs-site/docs/README.md',
  'docs-site/docs/index.md',
  'docs-site/docs/introduction.md',
  'docs-site/docs/guides/getting-started.md',
  'docs-site/docs/full-reference.md',
];

function buildDocsHeader(counts, newVersion) {
  return `**v${newVersion}** — ${counts.agents} agents · ${counts.skills} skills · ${counts.mcps} MCP servers · 68 codex terms · 3,226 tests`;
}

function syncDocsSiteHeaders(counts, newVersion) {
  const header = buildDocsHeader(counts, newVersion);
  const headerRe = /^\*{0,2}v?[\d.]*\*{0,2}\s*—?\s*\d+ agents · \d+ skills · \d+ MCP servers? · \d+ codex terms(?: · [\d,]+ tests)?/m;
  for (const rel of DOCS_SITE_HEADER_FILES) {
    const filePath = path.join(rootDir, rel);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf-8');
    if (headerRe.test(content)) {
      content = content.replace(headerRe, header);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${rel} header`);
    }
  }
}

function updatePluginJsonVersion(newVersion) {
  const pluginPath = path.join(rootDir, '.grok-plugin/plugin.json');
  if (!fs.existsSync(pluginPath)) return;
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));
  plugin.version = newVersion;
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
  console.log(`✅ Updated .grok-plugin/plugin.json (version: ${newVersion})`);
}

function updateConsumerAgentsHeader(newVersion, counts) {
  const consumerPath = path.join(rootDir, 'AGENTS-consumer.md');
  if (!fs.existsSync(consumerPath)) return;
  let content = fs.readFileSync(consumerPath, 'utf-8');
  content = content.replace(
    /^\*\*v[\d.]+\*\* — \d+ MCP servers · \d+ skills · \d+ codex terms/m,
    `**v${newVersion}** — ${counts.mcps} MCP servers · ${counts.skills} skills · 68 codex terms`
  );
  fs.writeFileSync(consumerPath, content);
  console.log(`✅ Updated AGENTS-consumer.md version header`);
}

function applyAgentCountUpdates(content, counts) {
  let agentsMd = content;

  // Legacy header count update (min compat for old consumer AGENTS.md files only; xray v2 YML SSOT primary)
  agentsMd = agentsMd.replace(
    /0xRay\s*2\.0\s*-\s*\d+\s+Agents|0xRay\s*-\s*\d+\s+Agents/,
    `xray v2 - ${counts.agents} Agents`
  );

  agentsMd = agentsMd.replace(/\d+\s+MCPs?/g, `${counts.mcps} MCPs`);
  agentsMd = agentsMd.replace(/\d+\s+Skills?/g, `${counts.skills} Skills`);

  return agentsMd;
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

  fs.writeFileSync(agentsPath, applyAgentCountUpdates(fs.readFileSync(agentsPath, 'utf-8'), counts));
  console.log(`✅ Updated AGENTS.md`);
}

function updateAgentsConsumerMd(counts) {
  const agentsPath = path.join(rootDir, 'AGENTS-consumer.md');
  if (!fs.existsSync(agentsPath)) {
    console.log(`⚠️  AGENTS-consumer.md not found, skipping`);
    return;
  }

  fs.writeFileSync(agentsPath, applyAgentCountUpdates(fs.readFileSync(agentsPath, 'utf-8'), counts));
  console.log(`✅ Updated AGENTS-consumer.md`);
}

function updateDocsReadme(newVersion) {
  const docsReadmePath = path.join(rootDir, 'docs/README.md');
  if (!fs.existsSync(docsReadmePath)) {
    console.log(`⚠️  docs/README.md not found, skipping`);
    return;
  }

  let readme = fs.readFileSync(docsReadmePath, 'utf-8');
  readme = readme.replace(
    /img.shields.io\/badge\/version-[\d.]+/,
    `img.shields.io/badge/version-${newVersion}`
  );
  fs.writeFileSync(docsReadmePath, readme);
  console.log(`✅ Updated docs/README.md (version: ${newVersion})`);
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
  
  // init.sh legacy version key no longer updated (final xray cutover - no historical scaffolding)
  updateDocsReadme(newVersion);

  // Update UVM's own version string
  const uvmPath = path.join(rootDir, 'scripts/node/universal-version-manager.js');
  if (fs.existsSync(uvmPath)) {
    let uvmContent = fs.readFileSync(uvmPath, 'utf-8');
    uvmContent = uvmContent.replace(
      /version:\s*"[0-9]+\.[0-9]+\.[0-9]+"/,
      `version: "${newVersion}"`
    );
    uvmContent = uvmContent.replace(
      /lastUpdated:\s*"[0-9]{4}-[0-9]{2}-[0-9]{2}"/,
      `lastUpdated: "${new Date().toISOString().split('T')[0]}"`
    );
    fs.writeFileSync(uvmPath, uvmContent);
    console.log(`✅ Updated UVM version: ${newVersion}`);
  }
  
  // Update CHANGELOG.md
  updateChangelog(newVersion, changeDescription);
  
  // Get actual framework counts and update documentation
  const counts = getFrameworkCounts();
  console.log(`\n📊 Framework counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills`);
  
  updateReadme(counts, newVersion);
  syncDocsSiteHeaders(counts, newVersion);
  updatePluginJsonVersion(newVersion);
  updateConsumerAgentsHeader(newVersion, counts);
  updateAgentsMd(counts);
  updateAgentsConsumerMd(counts);
  
  console.log(`\n🎉 Version updated to ${newVersion}\n`);
}

function createGitTag(version, message) {
  try {
    // Create annotated tag
    const tagName = `v${version}`;
    const tagMessage = message || `Release ${version}`;
    
    execSync(`git tag -a ${tagName} -m "${tagMessage}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ Created git tag: ${tagName}`);
    
    // Push tag to remote
    execSync(`git push origin ${tagName}`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ Pushed tag to origin: ${tagName}`);
    
    return true;
  } catch (error) {
    console.log(`⚠️  Failed to create git tag: ${error.message}`);
    return false;
  }
}

/** Paths written by release artifact updates (existing files only). */
export function getReleaseArtifactPaths() {
  const candidates = [
    'package.json',
    'CHANGELOG.md',
    'README.md',
    'AGENTS.md',
    'AGENTS-consumer.md',
    'SKILLS.md',
    '.grok-plugin/plugin.json',
    'docs/README.md',
    'docs-site/docs/README.md',
    'docs-site/docs/index.md',
    'docs-site/docs/introduction.md',
    'docs-site/docs/guides/getting-started.md',
    'docs-site/docs/full-reference.md',
    'docs-site/docs/guides/integrations.md',
    'docs-site/docs/guides/features-since-3.1.md',
    'docs-site/docs/guides/features-json.md',
    'docs-site/docs/guides/memory-routing.md',
    'docs-site/docs/guides/repertoire.md',
    'docs-site/docs/guides/consumer-migration.md',
    'docs-site/docs/mcp/README.md',
    'docs-site/docs/agents/README.md',
    'docs-site/sidebars.ts',
  ];
  return candidates.filter((rel) => fs.existsSync(path.join(rootDir, rel)));
}

/** Update CHANGELOG + README + AGENTS (+ consumer/docs) for current package.json version (no bump). */
function updateReleaseArtifactsOnly(changeDescription = '') {
  const current = getCurrentVersion();
  console.log(`\n📌 Release artifacts for v${current}\n`);
  const counts = getFrameworkCounts();
  console.log(`📊 Framework counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills`);
  updateChangelog(current, changeDescription);
  updateReadme(counts, current);
  syncDocsSiteHeaders(counts, current);
  updatePluginJsonVersion(current);
  updateConsumerAgentsHeader(current, counts);
  updateDocsReadme(current);
  updateAgentsMd(counts);
  updateAgentsConsumerMd(counts);
  console.log(`\n✅ Release artifacts updated for v${current}\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--artifacts-only')) {
    updateReleaseArtifactsOnly('');
    return;
  }
  
  // Handle --help flag first
  if (args.includes('--help') || args.includes('-h')) {
    const current = getCurrentVersion();
    console.log(`\n📌 Current version: ${current}`);
    console.log(`\nUsage:`);
    console.log(`  node scripts/node/version-manager.mjs [major|minor|patch] [description]`);
    console.log(`  node scripts/node/version-manager.mjs 1.6.9 "Description of changes"`);
    console.log(`  node scripts/node/version-manager.mjs patch --tag  # auto-changelog + git tag`);
    console.log(`  node scripts/node/version-manager.mjs --artifacts-only  # CHANGELOG/README/AGENTS/docs`);
    console.log(`\nExamples:`);
    console.log(`  node scripts/node/version-manager.mjs patch  # 1.6.8 -> 1.6.9 (auto-generates changelog from git)`);
    console.log(`  node scripts/node/version-manager.mjs minor  # 1.6.8 -> 1.7.0`);
    console.log(`  node scripts/node/version-manager.mjs major  # 1.6.8 -> 2.0.0`);
    console.log(`  node scripts/node/version-manager.mjs patch "Manual description"  # use custom changelog`);
    console.log(`  node scripts/node/version-manager.mjs patch --tag  # changelog + git tag`);
    process.exit(0);
  }

  // When called with no arguments (npm version lifecycle hook), npm has already
  // bumped package.json. Just propagate the current version to other files.
  const current = getCurrentVersion();
  let type = args[0];
  let changeDescription = '';
  let createTag = false;

  if (!type) {
    // No bump type — this is a lifecycle hook call. Don't re-bump.
    // Just update CHANGELOG, README, AGENTS.md with the current version.
    console.log(`\n📌 Lifecycle mode — propagating current version: ${current}\n`);
    const counts = getFrameworkCounts();
    console.log(`📊 Framework counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills`);
    updateChangelog(current, '');
    updateReadme(counts, current);
    syncDocsSiteHeaders(counts, current);
    updatePluginJsonVersion(current);
    updateConsumerAgentsHeader(current, counts);
    updateDocsReadme(current);
    updateAgentsMd(counts);
    updateAgentsConsumerMd(counts);

    // Update UVM's own version string to match package.json
    const uvmPath = path.join(rootDir, 'scripts/node/universal-version-manager.js');
    if (fs.existsSync(uvmPath)) {
      let uvmContent = fs.readFileSync(uvmPath, 'utf-8');
      uvmContent = uvmContent.replace(
        /version:\s*"[0-9]+\.[0-9]+\.[0-9]+"/,
        `version: "${current}"`
      );
      uvmContent = uvmContent.replace(
        /lastUpdated:\s*"[0-9]{4}-[0-9]{2}-[0-9]{2}"/,
        `lastUpdated: "${new Date().toISOString().split('T')[0]}"`
      );
      fs.writeFileSync(uvmPath, uvmContent);
      console.log(`✅ Updated UVM version: ${current}`);
    }

    console.log(`\n🎉 Version propagated: ${current}\n`);
    return;
  }

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--tag' || args[i] === '-t') {
      createTag = true;
    } else {
      changeDescription = args[i];
    }
  }

  const newVersion = bumpVersion(current, type);

  console.log(`\n📌 Current version: ${current}`);
  console.log(`📌 Bumping: ${type}`);
  if (changeDescription) {
    console.log(`📌 Changes: ${changeDescription}`);
  }
  if (createTag) {
    console.log(`📌 Will create git tag`);
  }
  
  updateVersion(newVersion, changeDescription);
  
  // Create git tag if requested
  if (createTag) {
    createGitTag(newVersion, changeDescription);
  }
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main();
}
