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
    assert.match(pop.detail, /live/);
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
