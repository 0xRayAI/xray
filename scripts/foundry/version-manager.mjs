#!/usr/bin/env node

/**
 * Foundry stamper — JSON version fields, CHANGELOG, and the present-tense patch-pin strip.
 *
 * Does NOT bump package.json (reconcile-version.mjs advances the next cut).
 * Does NOT publish.
 * Strips every present-tense patch pin from shipped guides and shipped OP-PROC.
 * Does NOT edit Station, NOTES, dest, or node_modules.
 *
 * Usage:
 *   npx @0xray/foundry stamp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { isXrayExoRepo, millScript, resolveMillRoot } from './mill-root.mjs';

const rootDir = resolveMillRoot();

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
    try {
      const commits = execSync(
        `git log --oneline --format="%s||%h" -n 50`,
        { cwd: rootDir, encoding: 'utf-8' }
      ).trim().split('\n').filter(Boolean);
      return commits.map(commit => {
        const [message, hash] = commit.split('||');
        return { message: message.trim(), hash: hash.trim() };
      });
    } catch {
      return [];
    }
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
export function getFrameworkCounts(baseDir = resolveMillRoot()) {
  const counts = {
    agents: 0,
    mcps: 0,
    skills: 0,
    codexTerms: 0,
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
      counts.mcps = xrayServers.length;
    } catch {
      counts.mcps = isXrayExoRepo(baseDir) ? 7 : 0;
    }
  } else {
    counts.mcps = isXrayExoRepo(baseDir) ? 7 : 0;
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
  const newEntry = getChangelogEntry(newVersion, changeDescription);

  if (!fs.existsSync(changelogPath)) {
    fs.writeFileSync(changelogPath, `# Changelog\n\n${newEntry}`);
    process.stdout.write('Created CHANGELOG.md\n');
    return;
  }

  let changelog = fs.readFileSync(changelogPath, 'utf-8');

  if (changelogHasVersion(newVersion)) {
    console.log(`ℹ️  CHANGELOG.md already has [${newVersion}] — skipping duplicate entry`);
    return;
  }
  
  const unreleasedHead = changelog.match(/^## \[Unreleased\][^\n]*/m);
  let headerEnd = changelog.indexOf('## [');
  if (unreleasedHead && typeof unreleasedHead.index === 'number') {
    const rest = changelog.slice(unreleasedHead.index + unreleasedHead[0].length);
    const next = rest.search(/\n## \[/);
    headerEnd =
      next === -1
        ? changelog.length
        : unreleasedHead.index + unreleasedHead[0].length + next + 1;
  }
  if (headerEnd === -1) {
    fs.writeFileSync(changelogPath, `${changelog.trimEnd()}\n\n${newEntry}`);
    process.stdout.write('Updated CHANGELOG.md\n');
    return;
  }

  const newChangelog = changelog.slice(0, headerEnd) + newEntry + changelog.slice(headerEnd);
  
  fs.writeFileSync(changelogPath, newChangelog);
  console.log(`✅ Updated CHANGELOG.md`);
}

/** Kernel headers stay era text. Patch refs are stripped from the shipped set below. */

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
  updateJsonVersionField('.xray/features.json', newVersion);
}

function updatePackageLockVersion(newVersion) {
  const full = path.join(rootDir, 'package-lock.json');
  if (!fs.existsSync(full)) return;
  const raw = fs.readFileSync(full, 'utf-8');
  const lock = JSON.parse(raw);
  const previous = typeof lock.version === 'string' ? lock.version : '';
  if (previous === newVersion && lock.packages?.['']?.version === newVersion) return;
  const lines = raw.split('\n');
  let rootDone = false;
  let pkgDone = false;
  const next = lines.map((line) => {
    if (!rootDone && line === `  "version": "${previous}",`) {
      rootDone = true;
      return `  "version": "${newVersion}",`;
    }
    if (rootDone && !pkgDone && line === `      "version": "${previous}",`) {
      pkgDone = true;
      return `      "version": "${newVersion}",`;
    }
    return line;
  });
  if (!rootDone || !pkgDone) return;
  fs.writeFileSync(full, next.join('\n'));
}

function updateOpenclawPluginVersion(newVersion) {
  updateJsonVersionField('src/integrations/openclaw/plugin/xray-pre-tool/package.json', newVersion);
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

/**
 * Shipped guides whose present-tense patch ref the stamper removes.
 * Historical headings (features-since) stay. Seat memory is not in this list.
 */
export const SHIPPED_GUIDE_STRIP_FILES = [
  'README.md',
  'AGENTS.md',
  'AGENTS-consumer.md',
  'SKILLS.md',
  'llms.txt',
  'docs-site/docs/index.md',
  'docs-site/docs/introduction.md',
  'docs-site/docs/full-reference.md',
  'docs-site/docs/architecture/v4-now.md',
  'docs-site/docs/architecture/v4-vision.md',
  'docs-site/docs/guides/memory-wake.md',
  'docs-site/docs/guides/memory-routing.md',
  'docs-site/docs/guides/repertoire.md',
  'docs-site/docs/guides/station-vs-repertoire.md',
  'docs-site/docs/guides/getting-started.md',
  'docs-site/docs/guides/integrations.md',
  'docs-site/docs/guides/consumer-migration.md',
  'docs-site/docs/guides/aside-context.md',
  'docs-site/docs/mcp/README.md',
  'docs-site/docs/agents/README.md',
  'grok-bot/AGENTS.md',
];

/** Shipped OP-PROC. Station, NOTES, and dest are not procedure files the stamper may edit. */
export const SHIPPED_OP_PROC_STRIP_FILES = [
  'grok-bot/ops/LEAD-CADENCE.md',
  'src/skills/orchestrator/SKILL.md',
  'grok-bot/skills/ship-ready-mill-gate/SKILL.md',
];

export function patchRefStripRelPaths() {
  return [...SHIPPED_GUIDE_STRIP_FILES, ...SHIPPED_OP_PROC_STRIP_FILES];
}

/** Seat-local memory and installed trees. The stamper never writes these. */
export function isPatchRefStripRefused(relPath) {
  const norm = path.posix.normalize(String(relPath).replace(/\\/g, '/')).replace(/^\.\//, '');
  const parts = norm.split('/').filter((part) => part !== '' && part !== '.');
  if (parts[parts.length - 1] === 'NOTES.md') return true;
  if (parts.includes('node_modules')) return true;
  const xrayAt = parts.indexOf('.xray');
  if (xrayAt !== -1 && parts[xrayAt + 1] === 'state') return true;
  return false;
}

/**
 * Remove every present-tense patch pin from prose. Stamps in CHANGELOG
 * headings stay, because this does not match `## [x.y.z]`.
 * `version` must be semver or the call is a no-op. The pins removed are
 * not limited to that version.
 * @param {string} content
 * @param {string} version
 */
export function stripPatchRefText(content, version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return content;
  const semver = '\\d+\\.\\d+\\.\\d+';
  const patterns = [
    new RegExp(`0xray@${semver}\\b`, 'g'),
    new RegExp(`npm is \\*\\*${semver}\\*\\*`, 'g'),
    new RegExp(`Product \\*\\*${semver}\\*\\* is on npm`, 'g'),
    new RegExp(`Do not republish ${semver}\\b`, 'g'),
    new RegExp(`This cut is \\*\\*${semver}\\*\\*`, 'g'),
    new RegExp(`This cut is ${semver}\\b`, 'g'),
  ];
  let next = content;
  for (const re of patterns) next = next.replace(re, '');
  return next.replace(/[ \t]{2,}/g, ' ');
}

/**
 * @param {string} baseDir
 * @param {string} rel
 * @param {string} version
 * @returns {boolean} true when the file changed
 */
export function stripPatchRefFile(baseDir, rel, version) {
  if (isPatchRefStripRefused(rel)) return false;
  const full = path.resolve(baseDir, rel);
  const relToBase = path.relative(baseDir, full);
  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) return false;
  if (isPatchRefStripRefused(relToBase.split(path.sep).join('/'))) return false;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
  const before = fs.readFileSync(full, 'utf8');
  const after = stripPatchRefText(before, version);
  if (after === before) return false;
  fs.writeFileSync(full, after);
  return true;
}

/**
 * Strip every present-tense patch pin from shipped guides and shipped OP-PROC under baseDir.
 * `version` must be semver or the call is a no-op.
 * Refuses `.xray/state/**`, NOTES, dest curated_signals.json, and node_modules.
 * Does not bump. Does not publish.
 * @param {string} baseDir
 * @param {string} version
 * @returns {string[]} relative paths that changed
 */
export function stripLivePatchRefs(baseDir, version) {
  const changed = [];
  for (const rel of patchRefStripRelPaths()) {
    if (stripPatchRefFile(baseDir, rel, version)) changed.push(rel);
  }
  return changed;
}

/** Paths written by release artifact updates (existing files only). */
export function getReleaseArtifactPaths(baseDir = resolveMillRoot()) {
  const candidates = [
    'package.json',
    'CHANGELOG.md',
    'README.md',
    'AGENTS.md',
    'AGENTS-consumer.md',
    'SKILLS.md',
    'llms.txt',
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
    '.xray/features.json',
    'package-lock.json',
    'docs/PIPELINE-FACET-SNAPSHOT.json',
    'src/integrations/openclaw/plugin/xray-pre-tool/package.json',
  ];
  return candidates.filter((rel) => fs.existsSync(path.join(baseDir, rel)));
}

/** Stamp JSON + CHANGELOG, then strip every present-tense patch pin from shipped guides and OP-PROC. No bump. No publish. */
function updateReleaseArtifactsOnly(changeDescription = '') {
  const current = getCurrentVersion();
  const counts = getFrameworkCounts();
  process.stdout.write(`Release artifacts for v${current} (JSON + CHANGELOG; strip shipped guides and OP-PROC)\n`);
  process.stdout.write(`counts: ${counts.agents} agents, ${counts.mcps} MCPs, ${counts.skills} skills\n`);
  updateChangelog(current, changeDescription);
  updatePluginJsonVersion(current);
  updateFeaturesJsonVersion(current);
  updatePackageLockVersion(current);
  updateOpenclawPluginVersion(current);
  const stripped = stripLivePatchRefs(rootDir, current);
  if (stripped.length > 0) {
    process.stdout.write(`Stripped present-tense patch pins from ${stripped.join(', ')}\n`);
  }
  runReleaseDocsValidation();
  process.stdout.write(`Release artifacts updated for v${current}\n`);
}

function runReleaseDocsValidation() {
  try {
    execSync(`${JSON.stringify(process.execPath)} ${JSON.stringify(millScript('validate-release-docs.mjs'))}`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, FOUNDRY_ROOT: rootDir },
    });
  } catch {
    console.error('\n❌ Release artifact docs failed validation — fix before tagging\n');
    process.exit(1);
  }
}

function refuseBump(reason) {
  process.stderr.write(`${reason}\n`);
  process.stderr.write('One bumper: npx @0xray/foundry reconcile [patch|minor|major] --apply\n');
  process.stderr.write('Then stamp:  npx @0xray/foundry stamp\n');
  process.stderr.write('Ship:        npx @0xray/foundry release [patch|minor|major]\n');
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`Current version: ${getCurrentVersion()}\n`);
    process.stdout.write('Usage: npx @0xray/foundry stamp\n');
    process.stdout.write('Bump is refused. Reconcile advances the next cut, then this stamper runs.\n');
    process.stdout.write('The stamper strips every present-tense patch pin from shipped guides and shipped OP-PROC.\n');
    process.stdout.write('It does not edit Station, NOTES, dest, or node_modules. It does not publish.\n');
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
