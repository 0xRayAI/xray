// Board face: tiles, lanes, rewind, roster, themes. Screenshots land in the artifact dir.
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
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  return {
    generated_at: iso(now),
    cursor: 'board-face',
    events: [
      { id: 'e1', t_ct: iso(now - 60000), kind: 'pr_open', from: 'forge', to: 'GitHub', label: 'opened #3', repo: 'example/app', number: 3 },
      { id: 'e2', t_ct: iso(now - 30000), kind: 'merged', from: 'critic', to: 'GitHub', label: 'merged #2', repo: 'example/app', number: 2 },
    ],
    queue: [
      { id: 'n1', type: 'nudge', seat: 'blinky', title: 'ack the handoff', t_ct: iso(now - 3600000) },
      { id: 'q1', type: 'packet', seat: 'forge', title: 'needs a review', t_ct: iso(now - 7200000) },
    ],
    track: { items: [
      { lane: 'blinky', lanes: ['blinky'], label: 'acked', phase: 'acked', title: 'handoff' },
      { lane: 'forge', lanes: ['forge'], label: 'working', phase: 'woken', title: 'real task' },
    ] },
    freshness: { github_latest_ct: iso(now), cards_at: iso(now), github_card_latest_ct: iso(now) },
    cloud_agents: [
      { bcId: 'bc-fresh00001', seat: 'forge', state: 'running', updated_ct: iso(now - 60000), card: '' },
      { bcId: 'bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f', seat: 'forge', state: 'stale', updated_ct: '2026-10-18T17:30:55-05:00', card: 'example/app#3' },
    ],
    fleet: { seats: { forge: { active: true, working: true, working_via: 'cloud' }, blinky: { active: false, working: false }, critic: { active: false, working: false }, mill: { active: false, working: false } }, cloud: { active: true, working: true, open_agents: ['bc-fresh00001'] } },
    board: {
      updated_ct: iso(now),
      stats: {
        issues_opened_24h: 1, issues_opened_24h_ids: ['example/app#1'],
        issues_closed_24h: 0, issues_closed_24h_ids: [],
        prs_opened_24h: 2, prs_opened_24h_ids: ['example/app#2', 'example/app#3'],
        prs_merged_24h: 1, prs_merged_24h_ids: ['example/app#2'],
        prs_closed_unmerged_24h: 0, prs_closed_unmerged_24h_ids: [],
        issues_open: 1, prs_open: 1, open_total: 2,
      },
      cards: [
        { key: 'example/app#2', repo: 'example/app', number: 2, kind: 'pr', state: 'closed', stage: 'done', title: 'Merged one', owner: 'forge', merged_by: 'critic', packet_ok: true, last_beat_t: now - 30000, beats: [{ t: now - 30000, what: 'merged' }] },
        { key: 'example/app#3', repo: 'example/app', number: 3, kind: 'pr', state: 'live', stage: 'open', title: 'Still open', owner: 'mill', packet_ok: true, last_beat_t: now - 60000, beats: [{ t: now - 60000, what: 'opened' }] },
        { key: 'example/app#1', repo: 'example/app', number: 1, kind: 'issue', state: 'live', stage: 'open', title: 'Live issue', owner: 'blinky', packet_ok: true, last_beat_t: now - 120000, beats: [{ t: now - 120000, what: 'opened' }] },
      ],
    },
  };
}

const historyCards = {
  cards: [{ id: 'example/app#2', owner: 'forge', state: 'closed', verb: 'merged', title: 'Merged one', number: 2, updated_ct: '2026-10-20T07:00:00-05:00', closed_ct: '2026-10-20T07:00:00-05:00' }],
};

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
  const body = JSON.stringify(feed());
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/live-events.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(body); return; }
      if (url.pathname === '/history/cards') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(historyCards)); return; }
      if (url.pathname === '/history') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ days: ['2026-10-20'], events: [] })); return; }
      const rel = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = path.normalize(path.join(PUB, rel));
      if (!file.startsWith(PUB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing'); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function contrast(fg, bg) {
  const nums = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lin = (c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const L = (rgb) => { const [r, g, b] = nums(rgb); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const a = L(fg); const b = L(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('the board face keeps the contract in both themes', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('bifrost-theme-cleared')) return;
      localStorage.removeItem('bifrost-theme');
      sessionStorage.setItem('bifrost-theme-cleared', '1');
    });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#waveBody .wcard'), null, { timeout: 8000 });
    await page.waitForFunction(() => (document.querySelector('#cardRecentList') || {}).textContent.includes('merged'), null, { timeout: 8000 });
    for (const id of ['mesh', 'stats', 'roster', 'cards', 'cloud', 'recent', 'history', 'work', 'queue']) {
      const head = page.locator(`[data-fold="${id}"].collapsed > .fold-head`);
      if (await head.count()) await head.click();
    }

    const face = await page.evaluate(() => {
      const text = (sel) => (document.querySelector(sel) || {}).textContent || '';
      const openCloud = text('#cloudBody .wcards.cloud');
      const doneCloud = text('#cloudBody .wcards.cloud-done');
      const waiting = [...document.querySelectorAll('#waveBody .wsub')].map(el => el.textContent);
      const mergedCard = document.querySelector('#waveBody .wcard[data-key="example/app#2"]');
      const openCard = document.querySelector('#waveBody .wcard[data-key="example/app#3"]');
      const mesh = document.getElementById('meshPanel').getBoundingClientRect();
      const slider = document.getElementById('slider').getBoundingClientRect();
      const names = [...document.querySelectorAll('.seat .nm')].map(el => el.textContent);
      const roster = [...document.querySelectorAll('#seatGrid .seat')].map(el => {
        const nm = el.querySelector('.nm');
        const cs = getComputedStyle(nm);
        return {
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
          title: nm.title,
          ellipsis: cs.textOverflow,
          nowrap: cs.whiteSpace,
          idle: el.classList.contains('idle'),
          pulse: el.querySelector('.dot').classList.contains('blink'),
        };
      });
      const activity = document.getElementById('activity');
      const log = getComputedStyle(document.getElementById('log'));
      const recent = text('#cardRecentList');
      const track = text('#trackList');
      const queue = text('#queueList');
      const tiles = [...document.querySelectorAll('.wstat')].map(el => ({ pressed: el.getAttribute('aria-pressed'), label: el.textContent }));
      const edge = openCard ? getComputedStyle(openCard).borderLeftColor : '';
      const mill = getComputedStyle(document.documentElement).getPropertyValue('--seat-mill').trim();
      const ids = [...document.querySelectorAll('#log li')].map(li => li.textContent);
      return {
        openCloud, doneCloud, waiting, mergedParent: mergedCard && mergedCard.parentElement.className,
        sliderInside: slider.top >= mesh.top - 1 && slider.bottom <= mesh.bottom + 1 && slider.left >= mesh.left - 1 && slider.right <= mesh.right + 1,
        names, roster,
        activityCollapsed: activity.classList.contains('collapsed'),
        logDisplay: log.display, logMax: log.maxHeight, logOverflow: log.overflowY,
        recent, track, queue, tiles, edge, mill, ids,
        theme: document.documentElement.getAttribute('data-theme'),
      };
    });
    assert.equal(face.theme, 'dark');
    assert.match(face.openCloud, /bc-fresh00001/);
    assert.doesNotMatch(face.openCloud, /bc-8450c4aa/);
    assert.match(face.doneCloud, /bc-8450c4aa/);
    assert.ok(face.waiting.some(row => row.startsWith('in review')));
    assert.ok(!face.waiting.some(row => row.startsWith('waiting') && face.mergedParent && face.mergedParent.includes('done') === false));
    assert.match(face.mergedParent, /done/);
    assert.equal(face.sliderInside, true);
    assert.ok(face.names.every(name => !name.includes('·')));
    assert.ok(face.roster.length > 0);
    const stateWord = /\b(active|idle|working|live|silent)\b/i;
    for (const row of face.roster) {
      assert.equal(row.text, row.title.toUpperCase());
      assert.equal(row.ellipsis, 'ellipsis');
      assert.equal(row.nowrap, 'nowrap');
      assert.doesNotMatch(row.text, stateWord);
      assert.equal(row.pulse, !row.idle);
    }
    const clipped = await page.evaluate(() => {
      const nm = document.querySelector('#seatGrid .nm');
      const saved = { text: nm.textContent, title: nm.title };
      const full = 'A VERY LONG SEAT NAME THAT MUST TRUNCATE ON THE ROSTER';
      nm.textContent = full;
      nm.title = full;
      const out = { title: nm.title, clipped: nm.scrollWidth > nm.clientWidth + 1, text: nm.parentElement.textContent.trim() };
      nm.textContent = saved.text;
      nm.title = saved.title;
      return out;
    });
    assert.equal(clipped.title, clipped.text);
    assert.equal(clipped.clipped, true);
    assert.equal(face.activityCollapsed, true);
    assert.equal(face.logDisplay, 'none');
    assert.match(face.recent, /merged/);
    assert.match(face.recent, /CT/);
    assert.match(face.recent, /forge/);
    assert.doesNotMatch(face.track, /blinky/);
    assert.match(face.track, /forge · working · real task/);
    assert.doesNotMatch(face.queue, /nudge/);
    assert.match(face.queue, /forge · packet · needs a review/);
    assert.ok(face.tiles.some(tile => tile.label.includes('PRs merged') && tile.label.includes('1')));
    assert.equal(new Set(face.ids).size, face.ids.length);
    const millParts = face.mill.split(/[,\s]+/).filter(Boolean).map(Number);
    assert.match(face.edge, new RegExp(millParts.slice(0, 3).join(',\\s*')));

    await page.screenshot({ path: path.join(ART, 'board-desktop-dark.png'), fullPage: true });
    await page.click('.wstat:has-text("PRs merged")');
    await page.waitForFunction(() => document.querySelector('.wstat.on'));
    const filtered = await page.evaluate(() => ({
      pressed: document.querySelector('.wstat.on').getAttribute('aria-pressed'),
      keys: [...document.querySelectorAll('#waveBody .wcard[data-key]')].map(el => el.dataset.key),
    }));
    assert.equal(filtered.pressed, 'true');
    assert.deepEqual(filtered.keys.filter(k => k.startsWith('example/')), ['example/app#2']);

    const samples = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { fg: cs.color, bg: cs.backgroundColor, sel };
      };
      return [pick('body'), pick('.wcard .witem'), pick('.wstat small'), pick('.seat .nm'), pick('.wbadge')].filter(Boolean);
    });
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    for (const row of samples) {
      const bg = !row.bg || row.bg === 'rgba(0, 0, 0, 0)' || row.bg === 'transparent' ? bodyBg : row.bg;
      const ratio = contrast(row.fg, bg);
      assert.ok(ratio >= 4.5, `${row.sel} contrast ${ratio.toFixed(2)} fg ${row.fg} bg ${bg}`);
    }

    await page.click('#themeToggle');
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
    assert.equal(await page.evaluate(() => localStorage.getItem('bifrost-theme')), 'light');
    const lightSamples = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const item = getComputedStyle(document.querySelector('.wcard .witem'));
      return { bodyFg: body.color, bodyBg: body.backgroundColor, itemFg: item.color, itemBg: item.backgroundColor };
    });
    assert.ok(contrast(lightSamples.bodyFg, lightSamples.bodyBg) >= 4.5);
    assert.ok(contrast(lightSamples.itemFg, lightSamples.itemBg) >= 4.5);
    await page.screenshot({ path: path.join(ART, 'board-desktop-light.png'), fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light' && document.querySelector('#waveBody .wcard'));
    assert.equal(await page.evaluate(() => localStorage.getItem('bifrost-theme')), 'light');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#waveToggle');
    await page.screenshot({ path: path.join(ART, 'board-mobile-light.png'), fullPage: true });
    await page.click('#themeToggle');
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
    await page.screenshot({ path: path.join(ART, 'board-mobile-dark.png'), fullPage: true });

    await page.click('#activityToggle');
    const opened = await page.evaluate(() => ({
      collapsed: document.getElementById('activity').classList.contains('collapsed'),
      stored: localStorage.getItem('bifrost-activity'),
      max: getComputedStyle(document.getElementById('log')).maxHeight,
      overflow: getComputedStyle(document.getElementById('log')).overflowY,
    }));
    assert.equal(opened.collapsed, false);
    assert.equal(opened.stored, 'open');
    assert.equal(opened.max, '256px');
    assert.equal(opened.overflow, 'auto');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('the roster renders no state text', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#seatGrid .seat'));
    const head = page.locator('[data-fold="roster"].collapsed > .fold-head');
    if (await head.count()) await head.click();
    const rows = await page.evaluate(() => [...document.querySelectorAll('#seatGrid .seat')].map(el => ({
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      html: el.innerHTML,
      title: el.querySelector('.nm').title,
    })));
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.equal(row.html.includes('class="st"'), false);
      assert.equal(row.text, row.title.toUpperCase());
      assert.doesNotMatch(row.text, /\b(active|idle|working|live|silent)\b/i);
      assert.doesNotMatch(row.text, /·/);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
