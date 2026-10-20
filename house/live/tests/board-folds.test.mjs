// Mesh, stats, roster, cards, and activity start open. A saved collapse still wins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { configuredRoster } from '../app/presence.mjs';

const FEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'feed');
const ROSTER = configuredRoster({
  LIVE_FLEET_SEATS: JSON.stringify({ seats: ['seat-from-env', 'forge', 'critic', 'blinky'] }),
}, [FEED]);

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
    roster: ROSTER.names,
    roster_roles: ROSTER.roles,
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
          const side = await page.evaluate(() => {
            const probe = document.createElement('div');
            document.body.appendChild(probe);
            const paint = (prop, value) => { probe.style[prop] = value; return getComputedStyle(probe)[prop]; };
            const read = (id) => {
              const cs = getComputedStyle(document.getElementById(id));
              return { bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, open: !document.getElementById(id).classList.contains('collapsed') };
            };
            const out = {
              line: paint('borderTop', '1px solid var(--line)'),
              openBg: paint('backgroundColor', 'var(--stat-bg)'),
              hoverBg: paint('backgroundColor', 'var(--log-hover)'),
              recent: read('cardRecent'), history: read('cardHist'), work: read('trackBox'), queue: read('queueBox'),
              cloud: read('cloudFold'), stats: read('statsFold'), cards: read('cardsFold'),
            };
            probe.remove();
            return out;
          });
          const sections = [side.recent, side.history, side.work, side.queue, side.cloud, side.stats, side.cards];
          for (const row of sections) assert.equal(row.border, side.line, JSON.stringify(row));
          for (const row of [side.recent, side.history, side.work, side.queue, side.cloud]) {
            assert.equal(row.open, false);
            assert.equal(row.bg, 'rgba(0, 0, 0, 0)');
          }
          assert.equal(side.stats.bg, side.openBg);
          assert.equal(side.cards.bg, side.openBg);
          await page.hover('#queueBox');
          const hovered = await page.evaluate(() => getComputedStyle(document.getElementById('queueBox')).backgroundColor);
          assert.equal(hovered, side.hoverBg);
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

test('roster chips follow the configured seats and the theme toggle is the rightmost header control', async () => {
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
    await page.waitForFunction((n) => document.querySelectorAll('#seatGrid .seat').length === n, ROSTER.names.length);
    const before = await page.evaluate(() => {
      const panel = document.getElementById('seats').getBoundingClientRect().width;
      const grid = document.getElementById('seatGrid').getBoundingClientRect().width;
      const seats = [...document.querySelectorAll('#seatGrid .seat')].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          name: el.querySelector('.nm').textContent,
          role: (el.querySelector('.role') || {}).textContent || '',
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
          w: box.width,
          y: box.y,
        };
      });
      const nodes = Object.keys(window.LiveMesh.SATS);
      return {
        panel, grid, seats, nodes,
        rosterOpen: !document.getElementById('seats').classList.contains('collapsed'),
      };
    });
    assert.equal(before.rosterOpen, true);
    assert.ok(before.seats.length > 3, JSON.stringify(before.seats));
    assert.ok(before.nodes.includes('CloudAgents'));
    assert.deepEqual(before.seats.map((seat) => seat.name), ROSTER.names.map((name) => name.toUpperCase()));
    assert.deepEqual(before.seats.map((seat) => seat.role), ROSTER.names.map((name) => ROSTER.roles[name] || ''));
    assert.ok(before.seats.some((seat) => seat.name === 'SEAT-FROM-ENV'));
    assert.ok(before.seats.some((seat) => seat.role === 'chief of staff'));
    assert.ok(before.seats.every((seat) => seat.tag === 'DIV'));
    let rowY = before.seats[0].y;
    for (const seat of before.seats) {
      assert.ok(seat.y + 1 >= rowY, JSON.stringify(before.seats));
      rowY = Math.max(rowY, seat.y);
    }
    assert.ok(before.seats.every((seat) => seat.w > 80 && seat.w < before.panel / 2), JSON.stringify(before));
    for (const seat of before.seats) assert.doesNotMatch(seat.text, /\b(ACTIVE|WORKING|IDLE|LIVE)\b/);
    const blinky = page.locator('#seatGrid .seat', { hasText: 'BLINKY' });
    await blinky.click();
    const after = await blinky.evaluate((el) => ({
      tag: el.tagName,
      role: (el.querySelector('.role') || {}).textContent || '',
    }));
    assert.equal(after.tag, 'DIV');
    assert.equal(after.role, 'chief of staff');
    assert.equal(await page.locator('#seats').evaluate((el) => el.classList.contains('collapsed')), false);
    const toggle = await page.evaluate(() => {
      const button = document.getElementById('themeToggle');
      const header = document.querySelector('header');
      const rows = [...header.querySelectorAll('.title > *')].filter((el) => getComputedStyle(el).display !== 'none');
      const controls = [...header.querySelectorAll('button, a, input, select')];
      const box = button.getBoundingClientRect();
      const maxRow = Math.max(...rows.map((el) => el.getBoundingClientRect().right));
      const maxControl = Math.max(...controls.map((el) => el.getBoundingClientRect().right));
      return {
        last: rows[rows.length - 1] === button,
        rightOfRow: box.right >= maxRow - 1,
        rightOfControls: box.right >= maxControl - 1,
      };
    });
    assert.equal(toggle.last, true);
    assert.equal(toggle.rightOfRow, true);
    assert.equal(toggle.rightOfControls, true);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('see all history sits in the recent header and replaces the side pane', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cardHistAll');
    const place = await page.evaluate(() => {
      const btn = document.getElementById('cardHistAll');
      const sum = document.getElementById('recentSum');
      const bar = document.querySelector('#cardRecent > .fold-bar');
      const btnBox = btn.getBoundingClientRect();
      const sumBox = sum.getBoundingClientRect();
      return {
        inBar: bar.contains(btn) && bar.contains(sum),
        rightOfCount: btnBox.left >= sumBox.right - 1,
        recentOpen: !document.getElementById('cardRecent').classList.contains('collapsed'),
      };
    });
    assert.equal(place.inBar, true);
    assert.equal(place.rightOfCount, true);
    assert.equal(place.recentOpen, false);
    await page.click('#cardHistAll');
    const opened = await page.evaluate(() => {
      const wave = document.getElementById('wave');
      const shown = [...wave.children].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.id);
      const back = getComputedStyle(document.getElementById('waveHistBack'));
      return {
        hist: wave.classList.contains('hist-open'),
        shown,
        back: back.display,
        recentOpen: !document.getElementById('cardRecent').classList.contains('collapsed'),
      };
    });
    assert.equal(opened.hist, true);
    assert.deepEqual(opened.shown, ['cardHist']);
    assert.notEqual(opened.back, 'none');
    assert.equal(opened.recentOpen, false);
    await page.click('#waveHistBack');
    const closed = await page.evaluate(() => {
      const wave = document.getElementById('wave');
      const shown = [...wave.children].filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.id);
      return { hist: wave.classList.contains('hist-open'), shown };
    });
    assert.equal(closed.hist, false);
    assert.ok(closed.shown.includes('statsFold') && closed.shown.includes('cardsFold') && closed.shown.includes('cardRecent'));
    assert.equal(await page.locator('#waveHistBack').evaluate((el) => getComputedStyle(el).display), 'none');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
