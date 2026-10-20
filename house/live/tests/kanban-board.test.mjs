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
    events: [],
    queue: [],
    track: { items: [] },
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

    await page.locator('#kanbanBoard [data-stage="review"] .witem').click();
    await page.waitForFunction(() => document.getElementById('cardPop')?.open);
    const pop = await page.evaluate(() => ({
      title: document.getElementById('cardPopTitle').textContent,
      beats: document.getElementById('cardPopBeats').textContent,
      fields: document.getElementById('cardPopFields').textContent,
      card: new URL(location.href).searchParams.get('card'),
    }));
    assert.match(pop.title, /Review me/);
    assert.match(pop.beats, /opened/);
    assert.match(pop.fields, /tests green/);
    assert.equal(pop.card, 'example/app#3');
    assert.equal(await page.locator('#cardPop').isVisible(), true);

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
