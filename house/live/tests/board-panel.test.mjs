// Desktop board: the card list keeps height when the lower sections are long.
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
  const cards = [];
  for (let i = 0; i < 40; i++) {
    const beat = now - 60_000;
    cards.push({
      key: `example/app#${i + 1}`,
      repo: 'example/app',
      number: i + 1,
      kind: 'pr',
      state: 'parked',
      stage: 'open',
      title: `card ${i + 1}`,
      owner: 'blinky',
      packet_ok: true,
      last_beat_t: beat,
      beats: [{ t: beat, what: 'opened' }],
    });
  }
  const queue = [];
  for (let i = 0; i < 40; i++) queue.push({ id: `q${i}`, type: 'line', seat: 'blinky', title: `waiting ${i} ${'reply '.repeat(12)}` });
  const items = [];
  for (let i = 0; i < 24; i++) items.push({ lane: 'lane', label: 'track', title: `work ${i} ${'item '.repeat(8)}` });
  return {
    generated_at: new Date(now).toISOString(),
    cursor: 'board-panel',
    events: [],
    queue,
    track: { items },
    freshness: {
      github_latest_ct: new Date(now).toISOString(),
      cards_at: new Date(now).toISOString(),
      github_card_latest_ct: new Date(now).toISOString(),
    },
    board: { updated_ct: new Date(now).toISOString(), cards, stats: { open_total: 40 } },
  };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
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
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('desktop wave body keeps a visible card when forty cards sit above a long queue', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const el = document.getElementById('waveBody');
      return el && el.querySelector('.wcard');
    }, null, { timeout: 8000 });
    const metrics = await page.evaluate(() => {
      const el = document.getElementById('waveBody');
      const card = el.querySelector('.wcard');
      const style = getComputedStyle(el);
      return {
        clientHeight: el.clientHeight,
        cards: el.querySelectorAll('.wcard').length,
        flex: style.flex,
        minHeight: style.minHeight,
        cardHeight: card ? card.getBoundingClientRect().height : 0,
      };
    });
    assert.equal(metrics.cards, 40, JSON.stringify(metrics));
    assert.ok(metrics.clientHeight > 0, JSON.stringify(metrics));
    const card = page.locator('#waveBody .wcard').first();
    await card.scrollIntoViewIfNeeded();
    assert.equal(await card.isVisible(), true);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
