// Mesh and wave share one height. Kanban spans the page. The roster name roll stays on main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const ART = (() => {
  const preferred = '/opt/cursor/artifacts';
  try {
    fs.mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), 'board-layout-artifacts');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
})();

function feed() {
  const now = new Date().toISOString();
  return {
    generated_at: now,
    cursor: 'board-layout',
    events: [],
    queue: [],
    track: { items: [] },
    freshness: { github_latest_ct: now, cards_at: now, github_card_latest_ct: now },
    fleet: {
      seats: {
        Builder: { active: true, working: true },
        Reviewer: { active: false, working: false },
      },
      working: { Builder: { via: 'prompt' } },
    },
    board: {
      updated_ct: now,
      stats: {
        issues_opened_24h: 0, issues_closed_24h: 0, prs_opened_24h: 1, prs_merged_24h: 0,
        prs_closed_unmerged_24h: 0, issues_open: 0, prs_open: 1, open_total: 1,
      },
      cards: [
        { key: 'example/app#3', repo: 'example/app', number: 3, kind: 'pr', state: 'live', stage: 'open', title: 'Layout card', owner: 'forge', packet_ok: true, last_beat_t: Date.now(), beats: [{ t: Date.now(), what: 'opened' }] },
      ],
    },
  };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
  const body = JSON.stringify(feed());
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/live-events.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(body);
        return;
      }
      const rel = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = path.normalize(path.join(PUB, rel));
      if (!file.startsWith(PUB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end('missing'); return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function layoutOf() {
  const mesh = document.getElementById('meshPanel').getBoundingClientRect();
  const wave = document.getElementById('wave').getBoundingClientRect();
  const kanban = document.getElementById('kanban').getBoundingClientRect();
  const split = document.querySelector('.split').getBoundingClientRect();
  const roster = document.getElementById('seats').getBoundingClientRect();
  const canvas = document.getElementById('mesh').getBoundingClientRect();
  const play = document.getElementById('play');
  const rewind = play.getBoundingClientRect();
  const stats = document.getElementById('statsFold').getBoundingClientRect();
  const ambient = document.getElementById('ambient');
  const meshEl = document.getElementById('meshPanel');
  return {
    top: Math.abs(mesh.top - wave.top),
    bottom: Math.abs(mesh.bottom - wave.bottom),
    kanbanLeft: Math.abs(kanban.left - split.left),
    kanbanRight: Math.abs(kanban.right - split.right),
    kanbanWider: kanban.width > mesh.width + 40,
    rosterInside: meshEl.contains(document.getElementById('seats')),
    rewindInside: meshEl.contains(play),
    statsAbove: mesh.top - stats.bottom,
    statsOutsideWave: !document.getElementById('wave').contains(document.getElementById('statsFold')),
    rosterTop: roster.top - mesh.top,
    rosterAboveCanvas: canvas.top - roster.bottom,
    rewindGap: mesh.bottom - rewind.bottom,
    kanbanOutside: !document.querySelector('.split').contains(document.getElementById('kanban')),
    rosterH: roster.height,
    replay: !!(play && ambient && document.getElementById('spectrumPill')),
    mesh: { top: mesh.top, bottom: mesh.bottom, left: mesh.left, right: mesh.right },
    wave: { top: wave.top, bottom: wave.bottom, left: wave.left, right: wave.right },
    kanban: { left: kanban.left, right: kanban.right, width: kanban.width },
  };
}

test('mesh and wave align and kanban spans the page', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [1280, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 1400 }, deviceScaleFactor: 1 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#seatGrid .seat.live .dot'), null, { timeout: 8000 });
      const box = await page.evaluate(layoutOf);
      assert.ok(box.top <= 4, JSON.stringify(box));
      assert.ok(box.bottom <= 4, JSON.stringify(box));
      assert.ok(box.kanbanLeft <= 4 && box.kanbanRight <= 4, JSON.stringify(box));
      assert.equal(box.rosterInside, true);
      assert.equal(box.rewindInside, true);
      assert.equal(box.statsOutsideWave, true);
      assert.equal(box.kanbanOutside, true);
      assert.equal(box.kanbanWider, true);
      assert.ok(box.rosterH > 40, JSON.stringify(box));
      assert.ok(box.rosterTop > 0 && box.rosterTop < 80, JSON.stringify(box));
      assert.ok(box.rosterAboveCanvas >= -1, JSON.stringify(box));
      assert.ok(box.rewindGap >= -1 && box.rewindGap < 24, JSON.stringify(box));
      assert.ok(box.statsAbove >= -1 && box.statsAbove < 24, JSON.stringify(box));
      assert.equal(box.replay, true);
      await page.screenshot({ path: path.join(ART, `board-layout-${width}.png`), fullPage: true });
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
