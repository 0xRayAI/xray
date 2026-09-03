#!/usr/bin/env node

/**
 * Foundry stamper — JSON version fields + CHANGELOG only.
 *
 * Does NOT bump package.json (reconcile-version.mjs is the one bumper).
 * Does NOT rewrite markdown prose (validate-release-docs.mjs verifies).
 *
 * Usage:
 *   node scripts/node/version-manager.mjs --artifacts-only
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
 * @param {string} [baseDir]
 */
export function getFrameworkCounts(baseDir = rootDir) {
  const counts = {
    agents: 0,
    mcps: 0,
    skills: 0,
    codexTerms: 68,
  };
  
  // Count agents (.yml files in src/opencode/agents/ — source of truth)
  const agentsDir = path.join(baseDir, 'src/opencode/agents');
  if (fs.existsSync(agentsDir)) {
    counts.agents = fs.readdirSync(agentsDir)
      .filter(f => f.endsWith('.yml'))
      .length;
  }
  
  // Consumer MCP count from .mcp.json SSOT (7 servers), not internal dist/mcps inventory
  const mcpJsonPath = path.join(baseDir, '.mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      const servers = mcpJson.mcpServers || mcpJson.servers || {};
      const xrayServers = Object.keys(servers).filter((name) => name.startsWith('xray-'));
      counts.mcps = xrayServers.length || 7;
    } catch {
      counts.mcps = 7;
    }
  } else {
    counts.mcps = 7;
  }
  
  // Count skills (directories in src/skills/ with SKILL.md)
  const skillsDir = path.join(baseDir, 'src/skills');
  if (fs.existsSync(skillsDir)) {
    counts.skills = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory())
      .filter(f => fs.existsSync(path.join(skillsDir, f, 'SKILL.md')))
      .length;
  }

  const codexPath = path.join(baseDir, 'xray/codex.json');
  if (fs.existsSync(codexPath)) {
    try {
      const codex = JSON.parse(fs.readFileSync(codexPath, 'utf-8'));
      const terms = codex.terms && typeof codex.terms === 'object' ? Object.keys(codex.terms) : [];
      if (terms.length > 0) counts.codexTerms = terms.length;
    } catch {
      /* keep default */
    }
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

/** Markdown prose is verified, not rewritten. */

export const DOCS_SITE_HEADER_FILES = [
  'docs-site/docs/index.md',
  'docs-site/docs/introduction.md',
  'docs-site/docs/guides/getting-started.md',
  'docs-site/docs/full-reference.md',
  'docs-site/docs/architecture/GROK_GUIDE.md',
  'docs-site/docs/mcp/README.md',
  'docs-site/docs/agents/README.md',
];

/** Line identity (major.minor). Patch belongs in CHANGELOG + package.json only. */
export function eraFromVersion(version) {
  const parts = String(version).split('.');
  return `${parts[0] || '0'}.${parts[1] || '0'}`;
}

export function buildDocsHeader(_counts, version) {
  return `**${eraFromVersion(version)}** — a suit that survives the context window`;
}



function updatePluginJsonVersion(newVersion) {
  const pluginPath = path.join(rootDir, '.grok-plugin/plugin.json');
  if (!fs.existsSync(pluginPath)) return;
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));
  plugin.version = newVersion;
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
  console.log(`✅ Updated .grok-plugin/plugin.json (version: ${newVersion})`);
}

function updateJsonVersionField(relPath, newVersion) {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) return;
  const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
  data.version = newVersion;
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
}

function updateFeaturesJsonVersion(newVersion) {
  updateJsonVersionField('xray/features.json', newVersion);
}

function updateOpenclawPluginVersion(newVersion) {
  updateJsonVersionField('src/integrations/openclaw/plugin/xray-pre-tool/package.json', newVersion);
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
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
    'docs-site/docs/index.md',
    'docs-site/docs/introduction.md',
    'docs-site/docs/guides/getting-started.md',
    'docs-site/docs/full-reference.md',
    'docs-site/docs/guides/integrations.md',
    'docs-site/docs/guides/features-since-3.1.md',
    'docs-site/docs/guides/features-json.md',
    'docs-site/docs/guides/memory-routing.md',
    'docs-site/docs/guides/aside-context.md',
    'docs-site/docs/guides/repertoire.md',
    'docs-site/docs/guides/consumer-migration.md',
    'docs-site/docs/mcp/README.md',
    'docs-site/docs/agents/README.md',
    'docs-site/docs/architecture/GROK_GUIDE.md',
    'docs-site/sidebars.ts',
    'xray/features.json',
  ];
  return candidates.filter((rel) => fs.existsSync(path.join(rootDir, rel)));
}

/** Update CHANGELOG + README + AGENTS (+ consumer/docs) for current package.json version (no bump). */
function updateReleaseArtifactsOnly(changeDescription = '') {
  const current = getCurrentVersion();
  const counts = getFrameworkCounts();
  process.stdout.write(`Release artifacts for v${current} (JSON + CHANGELOG only)\n`);
  process.stdout.write(`counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills\n`);
  updateChangelog(current, changeDescription);
  updatePluginJsonVersion(current);
  updateFeaturesJsonVersion(current);
  updateOpenclawPluginVersion(current);
  runReleaseDocsValidation();
  process.stdout.write(`Release artifacts updated for v${current}\n`);
}

function runReleaseDocsValidation() {
  try {
    execSync('node scripts/node/validate-release-docs.mjs', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch {
    console.error('\n❌ Release artifact docs failed validation — fix before tagging\n');
    process.exit(1);
  }
}

function refuseBump(reason) {
  process.stderr.write(`${reason}\n`);
  process.stderr.write('One bumper: node scripts/node/reconcile-version.mjs [patch|minor|major] --apply\n');
  process.stderr.write('Then stamp:  node scripts/node/version-manager.mjs --artifacts-only\n');
  process.stderr.write('Ship:        node scripts/node/release.mjs [patch|minor|major]\n');
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`Current version: ${getCurrentVersion()}\n`);
    process.stdout.write('Usage: node scripts/node/version-manager.mjs --artifacts-only\n');
    process.stdout.write('Bump is refused. Use reconcile-version.mjs --apply, then this stamper.\n');
    process.exit(0);
  }

  if (args.includes('--artifacts-only')) {
    updateReleaseArtifactsOnly('');
    return;
  }

  const bumpish = args.find(
    (a) =>
      a === '--tag' ||
      a === '-t' ||
      a === 'major' ||
      a === 'minor' ||
      a === 'patch' ||
      /^\d+\.\d+\.\d+/.test(a),
  );
  if (bumpish) {
    refuseBump(`version-manager does not bump or tag (got ${bumpish}).`);
  }

  refuseBump('version-manager is artifacts-only. Pass --artifacts-only.');
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main();
}
