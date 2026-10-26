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
      { id: 'e-merge9', t_ct: iso(now - 25000), kind: 'merged', from: 'forge', to: 'Bifrost', label: 'merged #9', repo: 'example/app', number: 9 },
      { id: 'e-approve9', t_ct: iso(now - 20000), kind: 'critic_pass', from: 'critic', to: 'GitHub', label: 'approved #9', repo: 'example/app', number: 9 },
      { id: 'ci-forge', t_ct: iso(now - 20000), kind: 'workflow_run', from: 'CI', to: 'GitHub', credit: 'forge', label: 'run tests' },
      { id: 'ci-blaze', t_ct: iso(now - 10000), kind: 'check_run', from: 'CI', to: 'GitHub', credit: 'Blaze', label: 'run lint' },
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
      { bcId: 'bc-fresh00001', seat: 'forge', state: 'running', updated_ct: iso(now - 60000), card: '', label: 'no card' },
      { bcId: 'bc-92de28a2', seat: 'forge', state: 'running', updated_ct: iso(now - 30000), card: '0xRayAI/xray#502', url: 'https://github.com/0xRayAI/xray/pull/502' },
      { bcId: 'bc-8450c4aa-ed0a-5fb3-9748-f09a044c848f', seat: 'forge', state: 'stale', updated_ct: '2026-10-18T17:30:55-05:00', card: 'example/app#3' },
    ],
    fleet: { seats: { forge: { active: true, working: true, working_via: 'cloud' }, blinky: { active: false, working: false }, critic: { active: false, working: false }, mill: { active: false, working: false } }, cloud: { active: true, working: true, open_agents: ['bc-fresh00001'] } },
    board: {
      updated_ct: iso(now),
      stats: {
        issues_opened_24h: 1, issues_opened_24h_ids: ['example/app#1'],
        issues_closed_24h: 0, issues_closed_24h_ids: [],
        prs_opened_24h: 2, prs_opened_24h_ids: ['example/app#2', 'example/app#3'],
        prs_merged_24h: 2, prs_merged_24h_ids: ['example/app#2', 'example/app#9'],
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

function serve(payload, files) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
  const body = JSON.stringify(payload || feed());
  const extra = files || {};
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/live-events.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(body); return; }
      if (url.pathname === '/history/cards') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(historyCards)); return; }
      if (url.pathname === '/history') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ days: ['2026-10-20'], events: [] })); return; }
      if (extra[url.pathname]) {
        res.writeHead(200, { 'content-type': types[path.extname(extra[url.pathname])] || 'text/javascript' });
        res.end(fs.readFileSync(extra[url.pathname]));
        return;
      }
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
      localStorage.removeItem('bifrost-card-group');
      sessionStorage.setItem('bifrost-theme-cleared', '1');
    });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#waveBody .wcard'), null, { timeout: 8000 });
    const card = page.locator('#waveBody .wcard[data-key="example/app#3"]');
    const restBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    await card.hover();
    const hoverBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    await card.evaluate((el) => el.classList.add('open'));
    const openBg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    await card.evaluate((el) => el.classList.remove('open'));
    const gap = (a, b) => {
      const n = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const [ar, ag, ab] = n(a);
      const [br, bgc, bb] = n(b);
      return Math.abs(ar - br) + Math.abs(ag - bgc) + Math.abs(ab - bb);
    };
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
    assert.ok(gap(hoverBg, restBg) >= 24, JSON.stringify({ restBg, hoverBg }));
    assert.ok(gap(openBg, restBg) >= 24, JSON.stringify({ restBg, openBg }));
    assert.notEqual(hoverBg, restBg);
    assert.notEqual(openBg, restBg);
    await page.waitForFunction(() => (document.querySelector('#cardRecentList') || {}).textContent.includes('merged'), null, { timeout: 8000 });
    await page.screenshot({ path: path.join(ART, 'board-open-desktop.png'), fullPage: true });
    for (const id of ['mesh', 'stats', 'roster', 'cards', 'cloud', 'recent', 'history', 'work', 'queue']) {
      const head = page.locator(`[data-fold="${id}"].collapsed .fold-head`);
      if (await head.count()) await head.click();
    }

    const face = await page.evaluate(() => {
      const text = (sel) => (document.querySelector(sel) || {}).textContent || '';
      const openCloud = text('#cloudBody .wcards.cloud');
      const doneCloud = text('#cloudBody .wcards.cloud-done');
      const waiting = [...document.querySelectorAll('#waveBody .wgroup, #waveBody .wsub')].map(el => el.textContent);
      const mergedCard = document.querySelector('#waveBody .wcard[data-key="example/app#2"]');
      const openCard = document.querySelector('#waveBody .wcard[data-key="example/app#3"]');
      const mesh = document.getElementById('meshPanel').getBoundingClientRect();
      const header = document.querySelector('main > header').getBoundingClientRect();
      const slider = document.getElementById('slider').getBoundingClientRect();
      const names = [...document.querySelectorAll('.seat .nm')].map(el => el.textContent);
      const roster = [...document.querySelectorAll('#seatGrid .seat')].map(el => {
        const nm = el.querySelector('.nm');
        const role = el.querySelector('.role');
        const cs = getComputedStyle(nm);
        return {
          tag: el.tagName,
          text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
          title: nm.title,
          role: role ? role.textContent : '',
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
      const whos = [...document.querySelectorAll('#log li')].map(li => (li.querySelector('.who') || {}).textContent || '');
      const linked = document.querySelector('#cloudBody a.wbadge.cloud');
      const fresh = document.querySelector('#cloudBody .wcard[data-key="bc-fresh00001"]');
      return {
        openCloud, doneCloud, waiting, mergedParent: mergedCard && mergedCard.parentElement.className,
        whos,
        cloudHref: linked ? linked.getAttribute('href') : '',
        cloudBadge: linked ? linked.textContent : '',
        freshText: fresh ? fresh.textContent : '',
        freshBadge: fresh ? fresh.querySelectorAll('a.wbadge.cloud, .wbadge.cloud').length : -1,
        sliderInside: slider.top >= header.top - 1 && slider.bottom <= header.bottom + 1 && slider.height > 0 && getComputedStyle(document.querySelector('main > header')).position === 'sticky',
        sliderBox: { top: slider.top, bottom: slider.bottom, height: slider.height, headerTop: header.top, headerBottom: header.bottom, meshTop: mesh.top },
        names, roster,
        activityCollapsed: activity.classList.contains('collapsed'),
        logDisplay: log.display, logMax: log.maxHeight, logOverflow: log.overflowY,
        recent, track, queue, tiles, edge, mill, ids,
        theme: document.documentElement.getAttribute('data-theme'),
      };
    });
    assert.equal(face.theme, 'dark');
    assert.match(face.openCloud, /bc-fresh00001/);
    assert.match(face.openCloud, /no card/);
    assert.doesNotMatch(face.openCloud, /card missing/);
    assert.equal(face.freshBadge, 0);
    assert.match(face.freshText, /no card/);
    assert.equal(face.cloudBadge, '0xRayAI/xray#502');
    assert.equal(face.cloudHref, 'https://github.com/0xRayAI/xray/pull/502');
    assert.ok(face.whos.includes('forge'), JSON.stringify(face.whos));
    assert.ok(face.whos.includes('Blaze'), JSON.stringify(face.whos));
    assert.doesNotMatch(face.openCloud, /bc-8450c4aa/);
    assert.match(face.doneCloud, /bc-8450c4aa/);
    assert.ok(face.waiting.some(row => row.startsWith('in review')));
    assert.ok(!face.waiting.some(row => row.startsWith('waiting') && face.mergedParent && face.mergedParent.includes('done') === false));
    assert.match(face.mergedParent, /done/);
    assert.equal(face.sliderInside, true, JSON.stringify(face.sliderBox));
    assert.ok(face.names.every(name => !name.includes('·')));
    assert.ok(face.roster.length > 0);
    const stateWord = /\b(active|idle|working|live|silent)\b/i;
    for (const row of face.roster) {
      assert.equal(row.tag, 'BUTTON');
      assert.equal(row.text, row.title.toUpperCase());
      assert.equal(row.role, '');
      assert.equal(row.ellipsis, 'ellipsis');
      assert.equal(row.nowrap, 'nowrap');
      assert.doesNotMatch(row.text, stateWord);
      assert.equal(row.pulse, false);
    }
    const clipped = await page.evaluate(() => {
      const nm = document.querySelector('#seatGrid .nm');
      const saved = { text: nm.textContent, title: nm.title };
      const full = 'A VERY LONG SEAT NAME THAT MUST TRUNCATE ON THE ROSTER';
      nm.textContent = full;
      nm.title = full;
      const out = { title: nm.title, clipped: nm.scrollWidth > nm.clientWidth + 1, text: nm.textContent.trim() };
      nm.textContent = saved.text;
      nm.title = saved.title;
      return out;
    });
    assert.equal(clipped.title, clipped.text);
    assert.equal(clipped.clipped, true);
    assert.equal(face.activityCollapsed, false);
    assert.notEqual(face.logDisplay, 'none');
    assert.equal(face.logMax, '256px');
    assert.equal(face.logOverflow, 'auto');
    assert.match(face.recent, /merged/);
    assert.match(face.recent, /CT/);
    assert.match(face.recent, /forge/);
    assert.doesNotMatch(face.track, /blinky/);
    assert.match(face.track, /forge · working · real task/);
    assert.doesNotMatch(face.queue, /nudge/);
    assert.match(face.queue, /forge · packet · needs a review/);
    assert.ok(face.tiles.some(tile => tile.label.includes('PRs merged') && tile.label.includes('2')));
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
    assert.deepEqual(filtered.keys.filter(k => k.startsWith('example/')), ['example/app#2', 'example/app#9']);
    const mergedNine = await page.evaluate(() => {
      const el = document.querySelector('#waveBody .wcard[data-key="example/app#9"]');
      const badge = el && el.querySelector('.wbadge.state');
      return { state: badge ? badge.textContent : '', text: el ? el.textContent : '' };
    });
    assert.equal(mergedNine.state, 'closed');
    assert.match(mergedNine.text, /merged #9/);
    assert.doesNotMatch(mergedNine.text, /approved #9/);

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
    if (await page.locator('#wave.collapsed').count()) await page.click('#waveToggle');
    await page.screenshot({ path: path.join(ART, 'board-mobile-light.png'), fullPage: true });
    await page.click('#themeToggle');
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
    await page.screenshot({ path: path.join(ART, 'board-mobile-dark.png'), fullPage: true });

    await page.click('#activityToggle');
    const closedAct = await page.evaluate(() => ({
      collapsed: document.getElementById('activity').classList.contains('collapsed'),
      stored: localStorage.getItem('bifrost-activity'),
    }));
    assert.equal(closedAct.collapsed, true);
    assert.equal(closedAct.stored, 'collapsed');
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
      tag: el.tagName,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      html: el.innerHTML,
      title: el.querySelector('.nm').title,
      role: (el.querySelector('.role') || {}).textContent || '',
    })));
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.equal(row.tag, 'BUTTON');
      assert.equal(row.html.includes('class="st"'), false);
      assert.equal(row.html.includes('class="role"'), false);
      assert.equal(row.text, row.title.toUpperCase());
      assert.equal(row.role, '');
      assert.doesNotMatch(row.text, /\b(active|idle|working|live|silent)\b/i);
      assert.doesNotMatch(row.text, /·/);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

function statFeed() {
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const ev = (id, kind, number, ago, extra) => Object.assign({
    id, t_ct: iso(now - ago), kind, from: 'forge', to: 'GitHub', repo: 'Example/App', number,
    label: kind + ' Example/App#' + number,
  }, extra);
  return {
    generated_at: iso(now),
    cursor: 'stat-tiles',
    events: [
      ev('o1', 'issue_open', 1, 1000),
      ev('c1', 'issue_close', 2, 2000),
      ev('p1', 'pr_open', 10, 3000),
      ev('m1', 'merged', 11, 4000, { merged_by: 'cursor[bot]' }),
      ev('u1', 'pr_close', 12, 5000),
    ],
    queue: [],
    track: { items: [] },
    cloud_agents: [],
    fleet: { seats: {} },
    board: {
      updated_ct: iso(now),
      stats: {
        issues_opened_24h: 1, issues_opened_24h_ids: ['Example/App#1'],
        issues_closed_24h: 1, issues_closed_24h_ids: ['Example/App#2'],
        prs_opened_24h: 2, prs_opened_24h_ids: ['Example/App#10', 'Example/App#11'],
        prs_merged_24h: 1, prs_merged_24h_ids: ['Example/App#11'],
        prs_closed_unmerged_24h: 1, prs_closed_unmerged_24h_ids: ['Example/App#12'],
        issues_open: 1, prs_open: 1, open_total: 2,
        open_total_ids: ['Example/App#1', 'Example/App#10'],
        owner_prompts_24h: 0, owner_prompts_24h_ids: [], owner_prompts_24h_bytes: 0,
      },
      cards: [
        { key: 'example/app#1', repo: 'Example/App', number: 1, kind: 'issue', state: 'live', stage: 'open', title: 'Opened issue', owner: 'forge', packet_ok: true, last_beat_t: now - 1000, beats: [{ t: now - 1000, what: 'opened' }] },
        { key: 'example/app#10', repo: 'Example/App', number: 10, kind: 'pr', state: 'live', stage: 'open', title: 'Opened PR', owner: 'forge', packet_ok: true, last_beat_t: now - 3000, beats: [{ t: now - 3000, what: 'opened' }] },
      ],
    },
  };
}

test('each stat tile lists the items its count includes', async () => {
  const server = await serve(statFeed());
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#waveStats .wstat').length === 7, null, { timeout: 8000 });
    const head = page.locator('[data-fold="stats"].collapsed > .fold-head, [data-fold="cards"].collapsed > .fold-head');
    const n = await head.count();
    for (let i = 0; i < n; i++) await head.nth(i).click();
    const rows = await page.evaluate(() => {
      return [...document.querySelectorAll('#waveStats .wstat')].map((tile) => {
        tile.click();
        const keys = [...document.querySelectorAll('#waveBody .wcards.stat .wcard')].map(el => el.dataset.key);
        return { label: tile.querySelector('small').textContent, count: Number(tile.querySelector('b').textContent), keys };
      });
    });
    assert.equal(rows.length, 7);
    for (const row of rows) assert.equal(row.keys.length, row.count, row.label);
    const byLabel = Object.fromEntries(rows.map(row => [row.label, row.keys]));
    assert.deepEqual(byLabel['issues opened 24h'], ['example/app#1']);
    assert.deepEqual(byLabel['issues closed 24h'], ['example/app#2']);
    assert.deepEqual(byLabel['PRs opened 24h'], ['example/app#10', 'example/app#11']);
    assert.deepEqual(byLabel['PRs merged 24h'], ['example/app#11']);
    assert.deepEqual(byLabel['PRs closed unmerged 24h'], ['example/app#12']);
    assert.deepEqual(byLabel['open now'], ['example/app#1', 'example/app#10']);
    assert.deepEqual(byLabel['owner prompts'], []);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('an activity row expands to the full note and collapses again', async () => {
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const full = 'FULL NOTE the row keeps closed until the activity item is opened';
  const longPrompt = 'look at the whole handoff. '.repeat(8).trim();
  const payload = feed();
  payload.events = [
    { id: 'prompt1', t_ct: iso(now - 20000), kind: 'seat_prompt', from: 'Blaze', to: 'forge', note: longPrompt, label: 'Blaze → forge: ' + longPrompt },
    { id: 'ci1', t_ct: iso(now - 10000), kind: 'workflow_run', from: 'CI', to: 'GitHub', credit: 'Blaze', label: 'run lint', repo: 'example/app', number: 9 },
    { id: 'note1', t_ct: iso(now - 5000), kind: 'comment', from: 'forge', to: 'GitHub', label: 'short label', note: full, repo: 'example/app', number: 3, source: 'https://github.com/example/app/pull/3' },
  ];
  const overlay = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'public', 'site-config.js');
  const server = await serve(payload, { '/site-config.js': overlay });
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const row = page.locator('#log li[data-id="note1"]');
    await row.waitFor({ timeout: 8000 });
    const note = row.locator('.log-note');
    assert.equal(await note.isVisible(), false);
    assert.equal(await row.locator('a').first().textContent(), 'short label');
    await row.locator('.who').click();
    assert.equal(await row.getAttribute('aria-expanded'), 'true');
    assert.equal(await note.isVisible(), true);
    assert.equal(await note.textContent(), full);
    fs.mkdirSync(ART, { recursive: true });
    await row.scrollIntoViewIfNeeded();
    await row.screenshot({ path: path.join(ART, 'activity-row-open.png') });
    const meta = await row.locator('.log-meta').textContent();
    assert.match(meta, /FORGE/);
    assert.match(meta, /CT/);
    const card = row.locator('a.log-card');
    assert.equal(await card.textContent(), 'example/app#3');
    assert.equal(await card.getAttribute('href'), 'https://github.com/example/app/pull/3');
    await page.evaluate(() => {
      document.querySelector('#log li[data-id="note1"] a.log-card').addEventListener('click', (ev) => ev.preventDefault());
    });
    await card.click();
    assert.equal(await row.getAttribute('aria-expanded'), 'true');
    await note.click();
    assert.equal(await row.getAttribute('aria-expanded'), 'false');
    assert.equal(await note.isVisible(), false);
    const prompt = page.locator('#log li[data-id="prompt1"]');
    assert.equal(await prompt.locator('.prompt-line').textContent().then(t => t.endsWith('…')), true);
    assert.equal(await prompt.locator('.log-note').isVisible(), false);
    await prompt.locator('.when').click();
    assert.equal(await prompt.locator('.log-note').textContent(), 'Blaze → forge: ' + longPrompt);
    assert.equal(await row.getAttribute('aria-expanded'), 'false');
    const ci = page.locator('#log li[data-id="ci1"]');
    await ci.locator('.who').click();
    assert.match(await ci.locator('.log-meta').textContent(), /Blaze/);
    assert.equal(await ci.locator('a.log-card').getAttribute('href'), 'https://github.com/example/app/pull/9');
    assert.equal(await prompt.getAttribute('aria-expanded'), 'true');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('an active seat name rolls across two frames and an idle seat name does not', async () => {
  const payload = feed();
  payload.events = [];
  payload.fleet = {
    seats: {
      Reviewer: { active: true, working: false },
      Tester: { active: false, working: false },
    },
    cloud: { active: false, working: false },
  };
  const server = await serve(payload);
  const base = `http://127.0.0.1:${server.address().port}/index.html?replay=0`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const views = window.LIVE_SEAT_VIEWS && window.LIVE_SEAT_VIEWS.chip;
      return !!(views && views.Reviewer && views.Reviewer.lit === true && views.Tester && views.Tester.lit === false);
    }, null, { timeout: 8000 });
    const sample = () => page.evaluate(() => {
      function one(word) {
        const nm = [...document.querySelectorAll('#seatGrid .nm')].find((el) => el.textContent === word);
        const seat = nm.closest('.seat');
        const anims = nm.getAnimations();
        const a = anims[0];
        return {
          live: seat.classList.contains('live'),
          idle: seat.classList.contains('idle'),
          count: anims.length,
          name: a ? a.animationName : '',
          time: a && a.currentTime != null ? Number(a.currentTime) : null,
          play: a ? a.playState : '',
        };
      }
      return { reviewer: one('REVIEWER'), tester: one('TESTER') };
    });
    const frame1 = await sample();
    await page.evaluate(() => new Promise((resolve) => { setTimeout(resolve, 250); }));
    const frame2 = await sample();
    assert.equal(frame1.reviewer.live, true, JSON.stringify(frame1));
    assert.equal(frame1.tester.idle, true, JSON.stringify(frame1));
    assert.equal(frame1.reviewer.count, 1, JSON.stringify(frame1));
    assert.equal(frame1.reviewer.name, 'nm-roll');
    assert.equal(frame1.reviewer.play, 'running');
    assert.equal(frame1.tester.count, 0, JSON.stringify(frame1));
    assert.equal(frame2.tester.count, 0, JSON.stringify(frame2));
    assert.notEqual(frame2.reviewer.time, frame1.reviewer.time, JSON.stringify({ frame1, frame2 }));
    fs.mkdirSync(ART, { recursive: true });
    await page.locator('#seats').screenshot({ path: path.join(ART, 'roster-name-roll.png') });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const views = window.LIVE_SEAT_VIEWS && window.LIVE_SEAT_VIEWS.chip;
      return !!(views && views.Reviewer && views.Reviewer.lit === true);
    }, null, { timeout: 8000 });
    const still = await page.evaluate(() => {
      const nm = [...document.querySelectorAll('#seatGrid .nm')].find((el) => el.textContent === 'REVIEWER');
      const cs = getComputedStyle(nm);
      return { count: nm.getAnimations().length, color: cs.color, image: cs.backgroundImage };
    });
    assert.equal(still.count, 0, JSON.stringify(still));
    assert.equal(still.image, 'none', JSON.stringify(still));
    assert.match(still.color, /255,\s*176,\s*120/, JSON.stringify(still));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
