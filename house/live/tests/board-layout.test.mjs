// Mesh and wave share one height, kanban spans the page, the roster dot blinks, the working name rolls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const ART = '/opt/cursor/artifacts';

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
  const play = document.getElementById('play');
  const ambient = document.getElementById('ambient');
  return {
    top: Math.abs(mesh.top - wave.top),
    bottom: Math.abs(mesh.bottom - wave.bottom),
    kanbanLeft: Math.abs(kanban.left - split.left),
    kanbanRight: Math.abs(kanban.right - split.right),
    kanbanWider: kanban.width > mesh.width + 40,
    rosterInside: document.getElementById('meshPanel').contains(document.getElementById('seats')),
    kanbanOutside: !document.querySelector('.split').contains(document.getElementById('kanban')),
    rosterGap: mesh.bottom - roster.bottom,
    rosterH: roster.height,
    replay: !!(play && ambient && document.getElementById('spectrumPill')),
    mesh: { top: mesh.top, bottom: mesh.bottom, left: mesh.left, right: mesh.right },
    wave: { top: wave.top, bottom: wave.bottom, left: wave.left, right: wave.right },
    kanban: { left: kanban.left, right: kanban.right, width: kanban.width },
  };
}

test('mesh and wave align, kanban spans the page, the working dot blinks, the name rolls', async () => {
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
      await page.waitForFunction(() => document.querySelector('#seatGrid .seat.working .dot'), null, { timeout: 8000 });
      const box = await page.evaluate(layoutOf);
      assert.ok(box.top <= 4, JSON.stringify(box));
      assert.ok(box.bottom <= 4, JSON.stringify(box));
      assert.ok(box.kanbanLeft <= 4 && box.kanbanRight <= 4, JSON.stringify(box));
      assert.equal(box.rosterInside, true);
      assert.equal(box.kanbanOutside, true);
      assert.equal(box.kanbanWider, true);
      assert.ok(box.rosterH > 40, JSON.stringify(box));
      assert.ok(box.rosterGap < 24, JSON.stringify(box));
      assert.equal(box.replay, true);
      await page.screenshot({ path: path.join(ART, `board-layout-${width}.png`), fullPage: true });
      await page.close();
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const dot = document.querySelector('#seatGrid .seat.working .dot');
      if (!dot) return false;
      const anim = getComputedStyle(dot);
      return dot.classList.contains('blink') && anim.animationName === 'live-blink' && anim.animationDuration === '1.1s';
    }, null, { timeout: 8000 });
    const blink = await page.evaluate(() => {
      const seat = document.querySelector('#seatGrid .seat.working');
      const dot = seat.querySelector('.dot');
      const idle = document.querySelector('#seatGrid .seat.idle .dot');
      const anims = dot.getAnimations();
      anims.forEach((a) => { a.pause(); a.currentTime = 0; });
      const atStart = getComputedStyle(dot).opacity;
      anims.forEach((a) => { a.currentTime = 550; });
      const atMid = getComputedStyle(dot).opacity;
      const idleAnim = getComputedStyle(idle);
      return {
        name: seat.getAttribute('aria-label'),
        atStart, atMid,
        idleName: idleAnim.animationName,
        idleBlink: idle.classList.contains('blink'),
      };
    });
    assert.equal(blink.name, 'Builder working');
    assert.ok(Math.abs(Number(blink.atStart) - Number(blink.atMid)) > 0.3, JSON.stringify(blink));
    assert.equal(blink.idleBlink, false);
    assert.equal(blink.idleName, 'none');
    await page.locator('#seatGrid .seat.working').screenshot({ path: path.join(ART, 'roster-blink-mid.png') });
    await page.evaluate(() => {
      const dot = document.querySelector('#seatGrid .seat.working .dot');
      dot.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; });
    });
    await page.locator('#seatGrid .seat.working').screenshot({ path: path.join(ART, 'roster-blink-start.png') });
    await page.close();

    const stillPage = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 1 });
    await stillPage.emulateMedia({ reducedMotion: 'reduce' });
    await stillPage.goto(base, { waitUntil: 'domcontentloaded' });
    await stillPage.waitForFunction(() => document.querySelector('#seatGrid .seat.working'), null, { timeout: 8000 });
    await stillPage.waitForTimeout(400);
    const still = await stillPage.evaluate(() => {
      const canvas = document.getElementById('mesh');
      const fit = window.LIVE_FIT;
      const L = window.LiveMesh;
      if (!fit || !canvas) return null;
      const ctx = canvas.getContext('2d');
      function strip(key) {
        const xy = L.SATS[key];
        const fs = Math.max(1, 0.55 / (canvas.clientWidth / 920));
        const nameY = xy[1] + 18 + 4 + 2 * fs + 8 * fs;
        const y = Math.round(fit.y + nameY * fit.scale);
        const x0 = Math.round(fit.x + (xy[0] - 36) * fit.scale);
        const row = ctx.getImageData(Math.max(0, x0), Math.max(0, y), 72, 3).data;
        let sig = 0;
        for (let i = 0; i < row.length; i++) sig = (Math.imul(sig, 33) + row[i]) >>> 0;
        return sig;
      }
      return { forge: strip('Builder'), blinky: strip('Reviewer') };
    });
    await stillPage.waitForTimeout(600);
    const moved = await stillPage.evaluate(() => {
      const canvas = document.getElementById('mesh');
      const fit = window.LIVE_FIT;
      const L = window.LiveMesh;
      const ctx = canvas.getContext('2d');
      function strip(key) {
        const xy = L.SATS[key];
        const fs = Math.max(1, 0.55 / (canvas.clientWidth / 920));
        const nameY = xy[1] + 18 + 4 + 2 * fs + 8 * fs;
        const y = Math.round(fit.y + nameY * fit.scale);
        const x0 = Math.round(fit.x + (xy[0] - 36) * fit.scale);
        const row = ctx.getImageData(Math.max(0, x0), Math.max(0, y), 72, 3).data;
        let sig = 0;
        for (let i = 0; i < row.length; i++) sig = (Math.imul(sig, 33) + row[i]) >>> 0;
        return sig;
      }
      const text = document.body.innerText || '';
      return { forge: strip('Builder'), blinky: strip('Reviewer'), workingWord: text.includes('working') };
    });
    assert.ok(still && moved);
    assert.notEqual(still.forge, moved.forge, JSON.stringify({ still, moved }));
    assert.equal(still.blinky, moved.blinky, JSON.stringify({ still, moved }));
    assert.equal(moved.workingWord, false);
    await stillPage.locator('#mesh').screenshot({ path: path.join(ART, 'name-wave-a.png') });
    await stillPage.waitForTimeout(600);
    await stillPage.locator('#mesh').screenshot({ path: path.join(ART, 'name-wave-b.png') });
    await stillPage.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
