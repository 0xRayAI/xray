// Read-only kanban sits above activity. A card click opens the timeline. The GitHub link stays on the face.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');

function boardFeed() {
  const now = Date.now();
  const beat = now - 60_000;
  const cards = [
    {
      key: 'example/app#3', repo: 'example/app', number: 3, kind: 'pr', state: 'live', stage: 'review',
      title: 'Review me', owner: 'mill', packet_ok: true, url: 'https://github.com/example/app/pull/3',
      packet: { acceptance: 'tests green', 'next owner': 'reviewer' },
      last_beat_t: beat, beats: [{ t: beat, what: 'opened' }],
    },
    {
      key: 'example/app#1', repo: 'example/app', number: 1, kind: 'issue', state: 'live', stage: 'open',
      title: 'Open issue', owner: 'blinky', packet_ok: true,
      last_beat_t: beat, beats: [{ t: beat, what: 'opened' }],
    },
    {
      key: 'example/app#2', repo: 'example/app', number: 2, kind: 'pr', state: 'closed', stage: 'merge',
      title: 'Already merged', owner: 'forge', packet_ok: true,
      last_beat_t: beat, beats: [{ t: beat, what: 'merged' }],
    },
  ];
  return {
    generated_at: new Date(now).toISOString(),
    cursor: 'kanban',
    events: [{
      id: 'ev-link-1',
      t_ct: new Date(now - 5000).toISOString(),
      kind: 'comment',
      from: 'blinky',
      repo: 'example/app',
      number: 3,
      label: 'see the pull request',
      source: 'https://github.com/example/app/pull/3#issuecomment-1',
    }],
    queue: [],
    track: { items: [] },
    cloud_agents: [{
      bcId: 'bc-review-3',
      seat: 'critic',
      card: 'example/app#3',
      state: 'running',
      updated_ct: new Date(now).toISOString(),
    }],
    freshness: {
      github_latest_ct: new Date(now).toISOString(),
      cards_at: new Date(now).toISOString(),
      github_card_latest_ct: new Date(now).toISOString(),
    },
    board: { updated_ct: new Date(now).toISOString(), cards, stats: { open_total: 2 } },
  };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const body = JSON.stringify(boardFeed());
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

test('kanban renders above activity, opens a card, and keeps the GitHub link on the face', async () => {
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#kanbanBoard .wcard'), null, { timeout: 8000 });
    const place = await page.evaluate(() => {
      const kanban = document.getElementById('kanban');
      const activity = document.getElementById('activity');
      const following = Node.DOCUMENT_POSITION_FOLLOWING;
      return {
        kanbanBeforeActivity: (kanban.compareDocumentPosition(activity) & following) !== 0,
        kanbanTop: kanban.getBoundingClientRect().top,
        activityTop: activity.getBoundingClientRect().top,
        review: document.querySelector('#kanbanBoard [data-stage="review"] .wcard')?.dataset.key || '',
        open: document.querySelector('#kanbanBoard [data-stage="open"] .wcard')?.dataset.key || '',
        done: document.querySelector('#kanbanBoard [data-stage="done"] .wcard')?.dataset.key || '',
      };
    });
    assert.equal(place.kanbanBeforeActivity, true);
    assert.ok(place.kanbanTop < place.activityTop, JSON.stringify(place));
    assert.equal(place.review, 'example/app#3');
    assert.equal(place.open, 'example/app#1');
    assert.equal(place.done, 'example/app#2');

    const link = page.locator('#kanbanBoard [data-stage="review"] a.wgh');
    assert.equal(await link.getAttribute('href'), 'https://github.com/example/app/pull/3');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.equal(await link.getAttribute('rel'), 'noopener');
    const issue = page.locator('#kanbanBoard [data-stage="open"] a.wgh');
    assert.equal(await issue.getAttribute('href'), 'https://github.com/example/app/issues/1');

    const waveDetail = page.locator('#waveBody .wcard[data-key="example/app#3"] .wdetail');
    const waveText = (await waveDetail.textContent()).replace(/\s+/g, ' ').trim();
    const waveHrefs = await waveDetail.locator('a').evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    await page.locator('#kanbanBoard [data-stage="review"] .witem').click();
    await page.waitForFunction(() => document.getElementById('cardPop')?.open);
    const pop = await page.evaluate(() => ({
      title: document.getElementById('cardPopTitle').textContent,
      detail: (document.getElementById('cardPopDetail').textContent || '').replace(/\s+/g, ' ').trim(),
      hrefs: [...document.querySelectorAll('#cardPopDetail a')].map((a) => a.getAttribute('href')),
      card: new URL(location.href).searchParams.get('card'),
    }));
    assert.match(pop.title, /Review me/);
    assert.match(pop.detail, /opened/);
    assert.match(pop.detail, /tests green/);
    assert.match(pop.detail, /mill/);
    assert.match(pop.detail, /Live/);
    assert.match(pop.detail, /bc-review-3/);
    assert.equal(pop.detail, waveText);
    assert.deepEqual(pop.hrefs, waveHrefs);
    assert.deepEqual(pop.hrefs, [
      'https://github.com/example/app/pull/3',
      'https://cursor.com/agents/bc-review-3',
    ]);
    assert.equal(pop.card, 'example/app#3');
    assert.equal(await page.locator('#cardPop').isVisible(), true);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('cardPop').open);
    await page.locator('#waveBody .wcard[data-key="example/app#3"] .witem').click();
    await page.waitForFunction(() => {
      const card = document.querySelector('#waveBody .wcard[data-key="example/app#3"]');
      const detail = card && card.querySelector('.wdetail');
      return card && card.classList.contains('open') && detail && getComputedStyle(detail).display !== 'none';
    });
    const expanded = await page.locator('#waveBody .wcard[data-key="example/app#3"] .wdetail').evaluate((el) => ({
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      fields: [...el.querySelectorAll('dt')].map((dt) => dt.textContent),
      hrefs: [...el.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    }));
    assert.equal(await page.locator('#cardPop').evaluate((el) => el.open), false);
    assert.equal(expanded.text, pop.detail);
    assert.deepEqual(expanded.hrefs, pop.hrefs);
    assert.deepEqual(expanded.fields, ['owner', 'status', 'acceptance', 'next owner']);
    assert.match(expanded.text, /opened/);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('cardPop').open && !new URL(location.href).searchParams.get('card'));

    await page.goto(`${base}?card=${encodeURIComponent('example/app#1')}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('cardPop')?.open, null, { timeout: 8000 });
    assert.match(await page.locator('#cardPopTitle').textContent(), /Open issue/);
    await page.mouse.click(8, 8);
    await page.waitForFunction(() => !document.getElementById('cardPop').open);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

async function linkFace(page, selector) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible' });
  const rest = await el.evaluate((node) => {
    const cs = getComputedStyle(node);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const paint = (value) => { probe.style.color = value; return getComputedStyle(probe).color; };
    const out = {
      color: cs.color,
      focus: paint('var(--focus)'),
      decoration: cs.textDecorationLine,
      cursor: cs.cursor,
    };
    probe.remove();
    return out;
  });
  await el.hover();
  const hover = await el.evaluate((node) => getComputedStyle(node).color);
  return { ...rest, hover };
}

function assertLink(face, label) {
  const marked = face.decoration.includes('underline') || face.color === face.focus;
  assert.equal(marked, true, label + ' ' + JSON.stringify(face));
  assert.equal(face.cursor, 'pointer', label);
  assert.notEqual(face.hover, face.color, label + ' hover ' + JSON.stringify(face));
}

test('kanban, wave, and activity links read as links in both themes', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.addInitScript(() => { localStorage.removeItem('bifrost-theme'); });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction((want) => document.documentElement.getAttribute('data-theme') === want && document.querySelector('#kanbanBoard a.wgh') && document.querySelector('#log a[href]'), theme);
      assertLink(await linkFace(page, '#kanbanBoard a.wgh'), theme + ' kanban');
      assertLink(await linkFace(page, '#waveBody a.wgh'), theme + ' wave');
      assertLink(await linkFace(page, '#log a[href]'), theme + ' activity');
      await page.locator('#kanbanBoard [data-stage="review"] .witem').click();
      await page.waitForFunction(() => document.getElementById('cardPop')?.open);
      assertLink(await linkFace(page, '#cardPopDetail a.wgh'), theme + ' detail');
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

function scrollFeed() {
  const now = Date.now();
  const beat = now - 60_000;
  const cards = [];
  for (let i = 0; i < 20; i++) {
    cards.push({
      key: `example/app#${100 + i}`,
      repo: 'example/app',
      number: 100 + i,
      kind: 'pr',
      state: 'live',
      stage: 'review',
      title: `Review card ${i} ${'line '.repeat(6)}`,
      owner: 'mill',
      packet_ok: true,
      url: `https://github.com/example/app/pull/${100 + i}`,
      last_beat_t: beat - i,
      beats: [{ t: beat - i, what: 'opened' }],
    });
  }
  for (let i = 0; i < 8; i++) {
    cards.push({
      key: `example/app#${200 + i}`,
      repo: 'example/app',
      number: 200 + i,
      kind: 'pr',
      state: 'parked',
      stage: 'open',
      title: `Parked card ${i}`,
      owner: 'blinky',
      packet_ok: true,
      last_beat_t: beat - i,
      beats: [{ t: beat - i, what: 'parked' }],
    });
  }
  cards.push({
    key: 'example/app#9',
    repo: 'example/app',
    number: 9,
    kind: 'pr',
    state: 'closed',
    stage: 'done',
    title: 'Closed card',
    owner: 'forge',
    packet_ok: true,
    last_beat_t: beat,
    beats: [{ t: beat, what: 'merged' }],
  });
  return {
    generated_at: new Date(now).toISOString(),
    cursor: 'kanban-scroll',
    events: [],
    queue: [],
    track: { items: [] },
    freshness: {
      github_latest_ct: new Date(now).toISOString(),
      cards_at: new Date(now).toISOString(),
      github_card_latest_ct: new Date(now).toISOString(),
    },
    board: { updated_ct: new Date(now).toISOString(), cards, stats: { open_total: 28 } },
  };
}

function serveFeed(feed) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const body = JSON.stringify(feed);
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

test('column headers stay visible after the card area scrolls', async () => {
  const server = await serveFeed(scrollFeed());
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1040, height: 900 } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#kanbanBoard [data-stage="review"] .wcard').length >= 20, null, { timeout: 8000 });

    const scrolled = await page.evaluate(() => {
      const board = document.getElementById('kanbanBoard');
      const col = board.querySelector('[data-stage="review"]');
      const list = col.querySelector('.wcards');
      const head = col.querySelector('h3');
      const pageHead = document.querySelector('main > header').getBoundingClientRect();
      const bar = document.querySelector('main > header .mesh-controls').getBoundingClientRect();
      const headBefore = head.getBoundingClientRect().top;
      const cardBefore = list.querySelector('.wcard').getBoundingClientRect().top;
      const topsBefore = [...board.querySelectorAll('h3')].map((h) => h.getBoundingClientRect().top);
      list.scrollTop = list.scrollHeight;
      const headAfter = head.getBoundingClientRect();
      const cardAfter = list.querySelector('.wcard').getBoundingClientRect().top;
      const boardBox = board.getBoundingClientRect();
      const topsAfter = [...board.querySelectorAll('h3')].map((h) => Math.round(h.getBoundingClientRect().top));
      const pageHeadAfter = document.querySelector('main > header').getBoundingClientRect();
      const barAfter = document.querySelector('main > header .mesh-controls').getBoundingClientRect();
      board.scrollLeft = board.scrollWidth;
      const columns = [...board.querySelectorAll('.kanban-col')].map((node) => {
        const h = node.querySelector('h3').getBoundingClientRect();
        const box = node.getBoundingClientRect();
        return {
          stage: node.dataset.stage,
          text: node.querySelector('h3').textContent,
          headTop: h.top,
          headLeft: h.left,
          colLeft: box.left,
          colRight: box.right,
          headRight: h.right,
        };
      });
      const done = board.querySelector('[data-stage="done"] h3').getBoundingClientRect();
      const boardNow = board.getBoundingClientRect();
      const wave = document.getElementById('waveBody');
      wave.scrollTop = wave.scrollHeight;
      const waveBox = wave.getBoundingClientRect();
      const stuck = [...wave.querySelectorAll('.wgroup')].filter((g) => {
        const r = g.getBoundingClientRect();
        return r.top >= waveBox.top - 1 && r.top <= waveBox.top + 8 && r.bottom > waveBox.top + 8;
      }).map((g) => g.textContent);
      return {
        overflowX: board.scrollWidth > board.clientWidth + 8,
        listScroll: list.scrollTop,
        cardMoved: cardBefore - cardAfter > 40,
        headTopDelta: Math.abs(headAfter.top - headBefore),
        headVisible: headAfter.top >= boardBox.top - 1 && headAfter.bottom <= boardBox.bottom && headAfter.bottom > boardBox.top,
        topsBefore,
        topsAfter,
        pageHeadTop: pageHead.top,
        pageHeadStill: Math.abs(pageHeadAfter.top - pageHead.top) < 1 && pageHeadAfter.bottom > 0 && pageHeadAfter.top < window.innerHeight,
        barStill: Math.abs(barAfter.top - bar.top) < 1 && barAfter.bottom > 0 && barAfter.top < window.innerHeight && barAfter.height > 0,
        columns,
        doneInBoard: done.left >= boardNow.left - 1 && done.right <= boardNow.right + 2 && done.top >= boardNow.top - 1 && done.bottom <= boardNow.bottom + 1,
        waveScroll: wave.scrollTop,
        stuck,
      };
    });

    assert.equal(scrolled.overflowX, true, JSON.stringify({ overflowX: scrolled.overflowX }));
    assert.ok(scrolled.listScroll > 40, JSON.stringify({ listScroll: scrolled.listScroll }));
    assert.equal(scrolled.cardMoved, true, JSON.stringify({ cardMoved: scrolled.cardMoved }));
    assert.ok(scrolled.headTopDelta < 1, JSON.stringify({ headTopDelta: scrolled.headTopDelta }));
    assert.equal(scrolled.headVisible, true, JSON.stringify(scrolled));
    const spread = Math.max(...scrolled.topsAfter) - Math.min(...scrolled.topsAfter);
    assert.ok(spread < 2, JSON.stringify(scrolled.topsAfter));
    assert.equal(scrolled.pageHeadStill, true, JSON.stringify(scrolled));
    assert.equal(scrolled.barStill, true, JSON.stringify(scrolled));
    for (const col of scrolled.columns) {
      assert.match(col.text, /\(\d+\)$/, col.stage);
      assert.ok(Math.abs(col.headLeft - col.colLeft) < 16, JSON.stringify(col));
      assert.ok(col.headRight <= col.colRight + 1, JSON.stringify(col));
    }
    const aligned = scrolled.columns.map((col) => Math.round(col.headTop));
    assert.ok(Math.max(...aligned) - Math.min(...aligned) < 2, JSON.stringify(aligned));
    assert.equal(scrolled.doneInBoard, true, JSON.stringify(scrolled.columns));
    assert.ok(scrolled.waveScroll > 40, JSON.stringify({ waveScroll: scrolled.waveScroll }));
    assert.ok(scrolled.stuck.length >= 1, JSON.stringify(scrolled.stuck));
    assert.match(scrolled.stuck[0], /\(\d+\)/);

    await page.locator('#kanbanBoard').screenshot({ path: '/opt/cursor/artifacts/kanban-column-headers.png' });
    await page.locator('#wave').screenshot({ path: '/opt/cursor/artifacts/wave-status-header.png' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const pinned = await page.evaluate(() => {
      const head = document.querySelector('main > header').getBoundingClientRect();
      const bar = document.querySelector('main > header .mesh-controls').getBoundingClientRect();
      const h1 = document.querySelector('main > header h1').getBoundingClientRect();
      return {
        headTop: head.top,
        headBottom: head.bottom,
        barTop: bar.top,
        barBottom: bar.bottom,
        h1Top: h1.top,
        h1Bottom: h1.bottom,
        view: window.innerHeight,
      };
    });
    assert.ok(pinned.headTop <= 1, JSON.stringify(pinned));
    assert.ok(pinned.h1Bottom > 0 && pinned.h1Top < pinned.view, JSON.stringify(pinned));
    assert.ok(pinned.barTop >= pinned.headTop && pinned.barBottom <= pinned.headBottom + 1, JSON.stringify(pinned));
    assert.ok(pinned.barBottom > 0 && pinned.barTop < pinned.view, JSON.stringify(pinned));

    await page.screenshot({ path: '/opt/cursor/artifacts/kanban-headers-stuck.png', fullPage: false });
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
