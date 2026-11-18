#!/usr/bin/env node
// Rebuild missing /history and /history/cards rows from GitHub.
// Dry-run is the default. Pass --write to append. Existing archive ids are skipped.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { chooseRepos, itemFromIssue, itemFromPull, loadSeats, parseGhPages, runBackfill, runTransitionBackfill } from '../app/history-backfill.mjs';

const FEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed', 'fleet-nodes.json');

function args(argv) {
  const repos = [];
  let org = '';
  let data = process.env.MESH_DATA_DIR || '';
  let write = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') write = true;
    else if (arg === '--repo') repos.push(argv[++i] || '');
    else if (arg === '--org') org = argv[++i] || '';
    else if (arg === '--data') data = argv[++i] || '';
    else if (arg === '--help') return { help: true };
  }
  return { repos, org, data, write };
}

export function ghApi(apiPath) {
  const res = spawnSync('gh', ['api', '--paginate', apiPath], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
  if (res.status !== 0) throw new Error((res.stderr || 'gh api failed').trim().slice(0, 300));
  return parseGhPages(res.stdout);
}

function orgRepos(org) {
  return ghApi(`orgs/${org}/repos?per_page=100&type=all`)
    .filter(repo => repo && repo.full_name && repo.archived !== true)
    .map(repo => repo.full_name);
}

function collectorRepos() {
  return String(process.env.COLLECTOR_REPOS || '').split(/\s+/).filter(Boolean);
}

export async function fetchItems(repo) {
  const issues = ghApi(`repos/${repo}/issues?state=all&per_page=100`);
  const pulls = ghApi(`repos/${repo}/pulls?state=all&per_page=100`);
  const items = [];
  for (const issue of issues) {
    const item = itemFromIssue(repo, issue);
    if (item) items.push(item);
  }
  for (const pull of pulls) {
    const item = itemFromPull(repo, pull);
    if (item) items.push(item);
  }
  return items;
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (opts.help) {
    console.log('usage: backfill-history.mjs [--data DIR] [--repo owner/name ...] [--org name] [--write]');
    return;
  }
  const org = opts.org || (opts.repos.length || collectorRepos().length ? '' : (process.env.COLLECTOR_ORG || '0xRayAI'));
  const listed = org ? orgRepos(org) : [];
  const repos = chooseRepos({
    repos: opts.repos,
    collectorRepos: opts.repos.length || opts.org ? [] : collectorRepos(),
    orgRepos: listed,
  });
  if (!repos.length) throw new Error('no repos');
  if (!opts.data) throw new Error('--data or MESH_DATA_DIR is required');
  const report = await runBackfill({
    repos, dataDir: opts.data, write: opts.write, fetchItems, seats: loadSeats(FEED), keepItems: true,
  });
  const items = report.items || [];
  delete report.items;
  let collector = [];
  try {
    const feed = JSON.parse(fs.readFileSync(path.join(opts.data, 'feed', 'github-events.json'), 'utf8'));
    if (feed && Array.isArray(feed.events)) collector = feed.events;
  } catch { /* no collector store */ }
  const transitions = runTransitionBackfill({
    dataDir: opts.data, items, collector, write: opts.write,
  });
  report.transitions = transitions.rows;
  report.transitions_appended = transitions.appended;
  report.unrestored_days = transitions.unrestored;
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  });
}
