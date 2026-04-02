#!/usr/bin/env node

/**
 * Release Tweet Generator for StringRay
 * 
 * Format: Title • 5 tidy bullets with emojis • quip before/after • hashtags
 * 
 * Usage:
 *   node scripts/node/release-tweet.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function getLatestTag() {
  try {
    const allTags = execSync('git tag -l --sort=-version:refname', {
      cwd: rootDir,
      encoding: 'utf-8'
    }).trim().split('\n').filter(Boolean);
    return allTags[0] || null;
  } catch {
    return null;
  }
}

function getPreviousTag() {
  try {
    const allTags = execSync('git tag -l --sort=-version:refname', {
      cwd: rootDir,
      encoding: 'utf-8'
    }).trim().split('\n').filter(Boolean);
    return allTags[1] || null;
  } catch {
    return null;
  }
}

function getCommitsBetweenTags(fromTag, toTag) {
  try {
    if (!fromTag) return [];
    const commits = execSync(
      `git log ${fromTag}..${toTag} --oneline --format="%s"`,
      { cwd: rootDir, encoding: 'utf-8' }
    ).trim().split('\n').filter(Boolean);
    return commits;
  } catch {
    return [];
  }
}

function extractBulletPoints(commits) {
  const bullets = [];
  const seen = new Set();
  
  for (const commit of commits) {
    // Clean commit message - remove type prefix and extra details
    let msg = commit.replace(/^(feat|fix|perf|security|release|chore|refactor|test|docs|build):\s*/i, '').trim();
    msg = msg.replace(/\(.*\)/, '').replace(/\[.*\]/, '').trim(); // Remove parens/brackets
    
    if (seen.has(msg)) continue;
    seen.add(msg);
    
    // Pick emoji based on content
    let emoji = '📦';
    const lower = msg.toLowerCase();
    if (lower.includes('add') || lower.includes('new') || lower.includes('introduce')) emoji = '✨';
    else if (lower.includes('fix') || lower.includes('bug') || lower.includes('resolve')) emoji = '🐛';
    else if (lower.includes('improve') || lower.includes('enhance') || lower.includes('update')) emoji = '⚡';
    else if (lower.includes('test') || lower.includes('validator')) emoji = '✅';
    else if (lower.includes('security') || lower.includes('protect')) emoji = '🔒';
    else if (lower.includes('codex') || lower.includes('term') || lower.includes('enforce')) emoji = '⚖️';
    else if (lower.includes('orchestrat') || lower.includes('agent')) emoji = '🎯';
    
    // Truncate if long
    const shortMsg = msg.length > 35 ? msg.substring(0, 32) + '...' : msg;
    bullets.push(`${emoji} ${shortMsg}`);
    
    if (bullets.length >= 5) break;
  }
  
  // Pad with generic if not enough
  while (bullets.length < 5) {
    bullets.push(`📦 improved stability and performance`);
  }
  
  return bullets;
}

function generateTweet(version) {
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  const previousTag = getPreviousTag();
  const commits = getCommitsBetweenTags(previousTag, version);
  const bullets = extractBulletPoints(commits);
  
  const quips = [
    "Your dev workflow just got an upgrade.",
    "Because your code deserves better.",
    "Build smarter, not harder.",
    "Less wrestling with agents, more shipping.",
    "Zero shortcuts. Pure functionality.",
  ];
  const quip = quips[Math.floor(Math.random() * quips.length)];
  
  const titles = [
    `v${cleanVersion} dropped`,
    `StringRay ${cleanVersion} arrived`,
    `Fresh ${cleanVersion} just dropped`,
    `${cleanVersion}. Let's go.`,
  ];
  const title = titles[Math.floor(Math.random() * titles.length)];
  
  const lines = [
    `🚀 ${title}`,
    '',
    bullets.join('\n'),
    '',
    `${quip} 🚀`,
    '',
    '#StringRay #AI #DevTools #OpenSource'
  ];
  
  return lines.join('\n');
}

function main() {
  console.log('\n🐦 Release Tweet Generator\n');
  
  const latestTag = getLatestTag();
  if (!latestTag) {
    console.log('❌ No git tags found. Run release first.');
    process.exit(1);
  }
  
  console.log(`📦 Version: ${latestTag}`);
  
  const tweet = generateTweet(latestTag);
  
  console.log('\n' + '─'.repeat(45));
  console.log(tweet);
  console.log('─'.repeat(45));
  console.log(`\n📊 Length: ${tweet.length}/280 chars`);
  
  const tweetsDir = path.join(rootDir, 'tweets');
  if (!fs.existsSync(tweetsDir)) {
    fs.mkdirSync(tweetsDir, { recursive: true });
  }
  
  const filename = path.join(tweetsDir, `tweet-${latestTag}.txt`);
  fs.writeFileSync(filename, tweet + '\n', 'utf-8');
  console.log(`✅ Saved: ${filename}\n`);
}

main();