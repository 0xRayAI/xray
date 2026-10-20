// Every board section starts collapsed, opens from its header, and remembers that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const IDS = ['mesh', 'stats', 'roster', 'cards', 'cloud', 'recent', 'history', 'work', 'queue', 'activity'];

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

test('board sections start collapsed and keep one shared open state', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
      await page.addInitScript(() => {
        if (sessionStorage.getItem('folds-cleared')) return;
        localStorage.removeItem('bifrost-folds');
        localStorage.removeItem('bifrost-activity');
        sessionStorage.setItem('folds-cleared', '1');
      });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelectorAll('[data-fold]').length >= 10);
      const start = await page.evaluate((ids) => ids.map((id) => {
        const fold = document.querySelector(`[data-fold="${id}"]`);
        const body = fold.querySelector('.fold-body');
        const head = fold.querySelector('.fold-head');
        return {
          id,
          collapsed: fold.classList.contains('collapsed'),
          expanded: head.getAttribute('aria-expanded'),
          shown: getComputedStyle(body).display,
        };
      }), IDS);
      for (const row of start) {
        assert.equal(row.collapsed, true, row.id);
        assert.equal(row.expanded, 'false', row.id);
        assert.equal(row.shown, 'none', row.id);
      }
      await page.click('[data-fold="cards"] > .fold-head');
      const open = await page.evaluate(() => {
        const fold = document.querySelector('[data-fold="cards"]');
        const body = fold.querySelector('.fold-body');
        const cs = getComputedStyle(body);
        return {
          collapsed: fold.classList.contains('collapsed'),
          expanded: fold.querySelector('.fold-head').getAttribute('aria-expanded'),
          max: cs.maxHeight,
          overflow: cs.overflowY,
          stored: JSON.parse(localStorage.getItem('bifrost-folds') || '{}').cards,
        };
      });
      assert.equal(open.collapsed, false);
      assert.equal(open.expanded, 'true');
      assert.equal(open.max, '256px');
      assert.equal(open.overflow, 'auto');
      assert.equal(open.stored, 'open');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('[data-fold="cards"]') && !document.querySelector('[data-fold="cards"]').classList.contains('collapsed'));
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
