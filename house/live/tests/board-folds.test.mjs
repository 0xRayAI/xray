// Mesh, stats, roster, cards, and activity start open. A saved collapse still wins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const OPEN = ['mesh', 'stats', 'roster', 'cards', 'activity'];
const CLOSED = ['cloud', 'recent', 'history', 'work', 'queue'];

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const body = JSON.stringify({
    generated_at: new Date().toISOString(),
    cursor: 'folds',
    events: [],
    queue: [],
    track: { items: [] },
    cloud_agents: [],
    board: { updated_ct: new Date().toISOString(), cards: [], stats: { open_total: 0 } },
  });
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/live-events.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(body); return; }
      if (url.pathname === '/history/cards') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"cards":[]}'); return; }
      if (url.pathname === '/history') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"days":[],"events":[]}'); return; }
      const rel = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = path.normalize(path.join(PUB, rel));
      if (!file.startsWith(PUB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing'); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function readFolds(ids) {
  return ids.map((id) => {
    const fold = document.querySelector(`[data-fold="${id}"]`);
    const body = fold.querySelector('.fold-body');
    const head = fold.querySelector('.fold-head');
    return {
      id,
      collapsed: fold.classList.contains('collapsed'),
      expanded: head.getAttribute('aria-expanded'),
      shown: getComputedStyle(body).display,
    };
  });
}

test('mesh, stats, roster, cards, and activity start open in both themes', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [1280, 390]) {
      for (const theme of ['dark', 'light']) {
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
        await page.addInitScript(() => {
          if (sessionStorage.getItem('folds-cleared')) return;
          localStorage.removeItem('bifrost-folds');
          localStorage.removeItem('bifrost-activity');
          localStorage.removeItem('bifrost-theme');
          sessionStorage.setItem('folds-cleared', '1');
        });
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction((want) => document.documentElement.getAttribute('data-theme') === want && document.querySelectorAll('[data-fold]').length >= 10, theme);
        const rows = await page.evaluate(readFolds, OPEN.concat(CLOSED));
        const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
        for (const id of OPEN) {
          assert.equal(byId[id].collapsed, false, `${theme} ${width} ${id}`);
          assert.equal(byId[id].expanded, 'true', `${theme} ${width} ${id}`);
          assert.notEqual(byId[id].shown, 'none', `${theme} ${width} ${id}`);
        }
        for (const id of CLOSED) {
          assert.equal(byId[id].collapsed, true, `${theme} ${width} ${id}`);
          assert.equal(byId[id].expanded, 'false', `${theme} ${width} ${id}`);
          assert.equal(byId[id].shown, 'none', `${theme} ${width} ${id}`);
        }
        const visible = await page.evaluate(() => ({
          wave: document.getElementById('wave').classList.contains('collapsed'),
          stats: getComputedStyle(document.getElementById('waveStats')).display,
          cards: getComputedStyle(document.getElementById('waveBody')).display,
          log: getComputedStyle(document.getElementById('log')).display,
        }));
        assert.equal(visible.wave, false, `${theme} ${width}`);
        assert.notEqual(visible.stats, 'none', `${theme} ${width}`);
        assert.notEqual(visible.cards, 'none', `${theme} ${width}`);
        assert.notEqual(visible.log, 'none', `${theme} ${width}`);
        if (width === 1280 && theme === 'dark') {
          const cards = await page.evaluate(() => {
            const body = document.getElementById('waveBody');
            const cs = getComputedStyle(body);
            const wave = getComputedStyle(document.getElementById('wave'));
            return { max: cs.maxHeight, flex: cs.flexGrow, min: parseFloat(cs.minHeight), height: body.clientHeight, wave: wave.height };
          });
          assert.equal(cards.max, 'none');
          assert.equal(cards.flex, '1');
          assert.ok(cards.min >= 220, JSON.stringify(cards));
          assert.ok(cards.height > 256, JSON.stringify(cards));
          assert.equal(cards.wave, '720px');
        }
        await page.close();
      }
    }

    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('folds-cleared')) return;
      localStorage.removeItem('bifrost-folds');
      localStorage.removeItem('bifrost-activity');
      sessionStorage.setItem('folds-cleared', '1');
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-fold="cards"]') && !document.querySelector('[data-fold="cards"]').classList.contains('collapsed'));
    await page.evaluate(() => {
      localStorage.setItem('bifrost-folds', JSON.stringify({ cards: 'closed', stats: 'closed', roster: 'closed' }));
      localStorage.removeItem('bifrost-activity');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-fold="mesh"]'));
    const saved = await page.evaluate(readFolds, ['mesh', 'stats', 'roster', 'cards', 'activity']);
    const savedBy = Object.fromEntries(saved.map((row) => [row.id, row]));
    assert.equal(savedBy.cards.collapsed, true);
    assert.equal(savedBy.stats.collapsed, true);
    assert.equal(savedBy.roster.collapsed, true);
    assert.equal(savedBy.mesh.collapsed, false);
    assert.equal(savedBy.activity.collapsed, false);
    await page.evaluate(() => {
      localStorage.removeItem('bifrost-folds');
      localStorage.setItem('bifrost-activity', 'collapsed');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('[data-fold="activity"]').classList.contains('collapsed'));
    const legacy = await page.evaluate(readFolds, ['mesh', 'stats', 'cards', 'activity']);
    const legacyBy = Object.fromEntries(legacy.map((row) => [row.id, row]));
    assert.equal(legacyBy.activity.collapsed, true);
    assert.equal(legacyBy.activity.shown, 'none');
    assert.equal(legacyBy.mesh.collapsed, false);
    assert.equal(legacyBy.stats.collapsed, false);
    assert.equal(legacyBy.cards.collapsed, false);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('roster seat headers toggle and stay compact while the roster starts open', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      localStorage.removeItem('bifrost-folds');
      localStorage.removeItem('bifrost-activity');
    });
    await page.route('**/site-config.js', (route) => route.fulfill({
      contentType: 'text/javascript',
      path: path.join(path.dirname(PUB), '..', 'site', 'public', 'site-config.js'),
    }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#seatGrid .seat').length === 4);
    const before = await page.evaluate(() => {
      const panel = document.getElementById('seats').getBoundingClientRect().width;
      const grid = document.getElementById('seatGrid').getBoundingClientRect().width;
      const seats = [...document.querySelectorAll('#seatGrid .seat')].map((el) => {
        const box = el.getBoundingClientRect();
        return { name: el.querySelector('.nm').textContent, w: box.width, y: box.y, open: el.getAttribute('aria-expanded') };
      });
      return {
        panel, grid, seats,
        rosterOpen: !document.getElementById('seats').classList.contains('collapsed'),
      };
    });
    assert.equal(before.rosterOpen, true);
    assert.deepEqual(before.seats.map((seat) => seat.name), ['BLINKY', 'CRITIC', 'FORGE', 'MILL']);
    assert.ok(before.seats.every((seat) => seat.open === 'false'));
    assert.ok(before.seats.every((seat) => Math.abs(seat.y - before.seats[0].y) < 2), JSON.stringify(before.seats));
    assert.ok(before.seats.every((seat) => seat.w < before.grid / 2 && seat.w < before.panel / 2), JSON.stringify(before));
    const blinky = page.locator('#seatGrid .seat', { hasText: 'BLINKY' });
    await blinky.click();
    const opened = await blinky.evaluate((el) => ({
      open: el.getAttribute('aria-expanded'),
      role: (el.querySelector('.role') || {}).textContent || '',
      w: el.getBoundingClientRect().width,
      panel: document.getElementById('seats').getBoundingClientRect().width,
    }));
    assert.equal(opened.open, 'true');
    assert.equal(opened.role, 'chief of staff');
    assert.ok(opened.w < opened.panel / 2, JSON.stringify(opened));
    assert.equal(await page.locator('#seatGrid .seat', { hasText: 'CRITIC' }).getAttribute('aria-expanded'), 'false');
    await blinky.click();
    const closed = await blinky.evaluate((el) => ({
      open: el.getAttribute('aria-expanded'),
      role: el.querySelector('.role') ? 'present' : '',
    }));
    assert.equal(closed.open, 'false');
    assert.equal(closed.role, '');
    assert.equal(await page.locator('#seats').evaluate((el) => el.classList.contains('collapsed')), false);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
