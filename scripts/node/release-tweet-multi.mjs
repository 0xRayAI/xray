#!/usr/bin/env node

/**
 * Multi-Release Tweet Generator for StringRay
 * 
 * Generates tweets for multiple recent releases, not just last one.
 * This allows @growth-strategist to pick the best story to tell.
 * 
 * Usage:
 *   node scripts/node/release-tweet-multi.mjs
 *   node scripts/node/release-tweet-multi.mjs --preview
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Commit types for formatting
const COMMIT_TYPES = {
  feat: { emoji: '✨', label: 'New Features' },
  fix: { emoji: '🐛', label: 'Bug Fixes' },
  perf: { emoji: '⚡', label: 'Performance' },
  refactor: { emoji: '♻️', label: 'Refactoring' },
  docs: { emoji: '📚', label: 'Documentation' },
  test: { emoji: '🧪', label: 'Tests' },
  chore: { emoji: '🔧', label: 'Maintenance' },
  security: { emoji: '🔒', label: 'Security' },
  build: { emoji: '📦', label: 'Builds' }
};

/**
 * Get the last N git tags (sorted by version, most recent first)
 * Simple approach: get all tags, filter for v1.7.x format
 */
function getLastNTags(count = 5) {
  try {
    const allTags = execSync('git tag -l', {
      cwd: rootDir,
      encoding: 'utf-8'
    }).trim().split('\n').map(t => t.trim()).filter(Boolean);
    
    // Filter to only v1.7.x format tags
    const versionTags = allTags.filter(tag => {
      return tag.startsWith('v1.7.');
    });
    
    return versionTags.slice(0, count);
  } catch {
    console.error('[ERROR] Failed to get tags:', e.message || String(e));
    return [];
  }
}

/**
 * Extract commits between two tags
 */
function getCommitsBetweenTags(fromTag, toTag) {
  try {
    const commits = execSync(
      `git log ${fromTag}..${toTag} --oneline --format="%s||%h"`,
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

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

/**
 * Categorize commits by type
 */
function categorizeCommits(commits) {
  const categorized = {
    feat: [],
    fix: [],
    perf: [],
    refactor: [],
    docs: [],
    test: [],
    chore: [],
    security: [],
    build: []
  };
  
  for (const commit of commits) {
    const msg = commit.message.toLowerCase();
    
    if (msg.startsWith('feat:')) {
      categorized.feat.push(commit);
    } else if (msg.startsWith('fix:')) {
      categorized.fix.push(commit);
    } else if (msg.startsWith('perf:') || msg.startsWith('performance:')) {
      categorized.perf.push(commit);
    } else if (msg.startsWith('refactor:')) {
      categorized.refactor.push(commit);
    } else if (msg.startsWith('docs:')) {
      categorized.docs.push(commit);
    } else if (msg.startsWith('test:')) {
      categorized.test.push(commit);
    } else if (msg.startsWith('chore:') || msg.startsWith('release:') || msg.startsWith('bump')) {
      categorized.chore.push(commit);
    } else if (msg.startsWith('security:')) {
      categorized.security.push(commit);
    } else if (msg.startsWith('build:')) {
      categorized.build.push(commit);
    }
  }
  
  return categorized;
}

/**
 * Generate tweet text for a specific version
 */
function generateTweetForVersion(version, commits) {
  // Strip 'v' prefix from version tag if present
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  
  const categorized = categorizeCommits(commits);
  
  // Build tweet parts
  const parts = [`🚀 StringRay v${cleanVersion} released!`];
  
  // Build tweet parts - basic release notice if no meaningful commits
  const hasMeaningfulCommits = commits.length > 0 && 
    (categorized.feat.length > 0 || categorized.fix.length > 0 || 
     categorized.perf.length > 0 || categorized.security.length > 0 || 
     categorized.docs.length > 0);
  
  if (!hasMeaningfulCommits) {
    parts.push(`✅ Ready for production!`);
  }
  
  // Key highlights (max 3 for tweet)
  const highlights = [];
  
  if (categorized.feat.length > 0) {
    const feat = categorized.feat[0].message
      .replace(/^feat:\s*/i, '')
      .replace(/\(.*\)/, '') // Remove parenthetical notes
      .trim()
      .slice(0, 50);
    highlights.push(`✨ ${feat}`);
  }
  
  if (categorized.fix.length > 0) {
    const fix = categorized.fix[0].message
      .replace(/^fix:\s*/i, '')
      .replace(/\(.*\)/, '')
      .trim()
      .slice(0, 50);
    highlights.push(`🐛 ${fix}`);
  }
  
  if (categorized.perf.length > 0) {
    highlights.push(`⚡ Performance boost`);
  }
  
  if (categorized.security.length > 0) {
    highlights.push(`🔒 Security fix`);
  }
  
  if (hasMeaningfulCommits && highlights.length > 0) {
    parts.push(highlights.join(' | '));
  }
  
  // Stats
  const stats = [];
  if (categorized.feat.length) stats.push(`${categorized.feat.length} features`);
  if (categorized.fix.length) stats.push(`${categorized.fix.length} fixes`);
  if (categorized.perf.length) stats.push(`perf`);
  if (categorized.security.length) stats.push(`security`);
  
  if (hasMeaningfulCommits && stats.length > 0) {
    parts.push(`\n📊 ${stats.join(' | ')}`);
  }
  
  // Hashtags and link
  parts.push('\n#StringRay #AI #DevTools');
  parts.push('🔗 https://github.com/htafolla/stringray');
  
  return parts.join('\n\n');
}

/**
 * Format commits for display
 */
function formatCommits(commits) {
  return commits.map(commit => {
    const message = commit.message || '';
    const hash = commit.hash || '';
    const cleanMsg = message.replace(/^(feat|fix|docs|test|chore|security|perf|build|refactor):\s*/i, '').trim();
    const shortHash = hash.slice(0, 7);
    return `- ${cleanMsg} (${shortHash})`;
  }).join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const previewOnly = args.includes('--preview') || args.includes('-p');
  
  console.log('\n' + '='.repeat(50));
  console.log('🐦 Multi-Release Tweet Generator for StringRay');
  console.log('='.repeat(50));
  
  const currentVersion = getCurrentVersion();
  const tags = getLastNTags(5);
  
  if (tags.length === 0) {
    console.log(`📌 Current version: ${currentVersion}`);
    console.log('\nNo recent v1.7.x tags found.');
    console.log('Need at least one tagged v1.7.x release.');
    console.log('Run: npm run release:patch --tag first.');
    process.exit(1);
  }
  
  console.log(`\n📦 Current version: ${currentVersion}`);
  console.log(`\n🏷 Found ${tags.length} recent v1.7.x tags:\n${tags.map(t => `  - ${t}`).join('\n')}`);
  
  // Calculate commit ranges for each tag
  const releases = [];
  let prevTag = null;
  
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    
    if (prevTag === null) {
      // First tag - use commits back to HEAD
      releases.push({
        version: tag,
        cleanVersion: tag.startsWith('v') ? tag.slice(1) : tag,
        commits: getCommitsBetweenTags(tag, 'HEAD')
      });
    } else {
      releases.push({
        version: tag,
        cleanVersion: tag.startsWith('v') ? tag.slice(1) : tag,
        commits: getCommitsBetweenTags(prevTag, tag)
      });
    }
    
    prevTag = tag;
  }
  
  console.log(`\n📊 Generated ${releases.length} release summaries:\n`);
  
  // Display each release
  for (const release of releases) {
    const tweet = generateTweetForVersion(release.cleanVersion, release.commits);
    
    console.log('\n' + '─'.repeat(45));
    console.log(`📌 Version: ${release.cleanVersion}`);
    console.log(`📝 Commits: ${release.commits.length}`);
    console.log('\n--- Commit Summary ---');
    console.log(formatCommits(release.commits));
    console.log('\n--- Tweet Preview ---');
    console.log(tweet);
    console.log('─'.repeat(45));
  }
  
  if (previewOnly) {
    console.log('\n✅ Preview mode - tweets not generated to file.');
    console.log('   Remove --preview to save.\n');
  } else {
    // Save tweets to file
    const tweetsDir = path.join(rootDir, 'tweets');
    if (!fs.existsSync(tweetsDir)) {
      fs.mkdirSync(tweetsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(tweetsDir, `tweets-${timestamp}.json`);
    
    const tweetData = {
      generated: timestamp,
      version: currentVersion,
      releases: releases.map(r => ({
        version: r.version,
        commitCount: r.commits.length,
        tweet: generateTweetForVersion(r.cleanVersion, r.commits),
        commits: r.commits.map(c => ({
          message: c.message,
          hash: c.hash
        }))
      }))
    };
    
    fs.writeFileSync(filename, JSON.stringify(tweetData, null, 2) + '\n');
    
    console.log(`\n✅ Saved tweets to: ${filename}`);
    console.log(`\n📋 Total commits across all releases: ${releases.reduce((sum, r) => sum + r.commits.length, 0)}`);
    console.log('\n🎯 @growth-strategist: Choose which version to tweet about!');
  }
}

main();
