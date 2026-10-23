// Dig: hide the board, come back, and a 304 must still refresh ages and the health strip.
// Soft force only. No location.reload.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const T0 = Date.parse('2026-10-23T16:00:00.000Z');

function feed() {
  const iso = (ms) => new Date(ms).toISOString();
  const beat = T0 - 10000;
  return {
    generated_at: iso(beat),
    cursor: 'show-1',
    events: [
      { id: 'e1', t_ct: iso(beat), kind: 'pr_open', from: 'forge', to: 'GitHub', label: 'opened #3', repo: 'example/app', number: 3 },
    ],
    queue: [],
    track: { items: [] },
    freshness: { github_latest_ct: iso(beat), cards_at: iso(T0), github_card_latest_ct: iso(beat) },
    cloud_agents: [],
    fleet: { seats: { forge: { active: true, working: false } } },
    board: {
      updated_ct: iso(T0),
      stats: {
        issues_opened_24h: 0, issues_closed_24h: 0, prs_opened_24h: 1, prs_merged_24h: 0,
        prs_closed_unmerged_24h: 0, owner_prompts_24h: 0, open_total: 1,
        issues_opened_24h_ids: [], issues_closed_24h_ids: [], prs_opened_24h_ids: ['example/app#3'],
        prs_merged_24h_ids: [], prs_closed_unmerged_24h_ids: [], owner_prompts_24h_ids: [],
      },
      cards: [
        { key: 'example/app#3', repo: 'example/app', number: 3, kind: 'pr', state: 'live', stage: 'open', title: 'Still open', owner: 'forge', packet_ok: true, last_beat_t: beat, beats: [{ t: beat, what: 'opened' }] },
      ],
    },
  };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
  const body = JSON.stringify(feed());
  const hits = [];
  let stale = false;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/live-events.json') {
      const hit = { url: req.url, inm: req.headers['if-none-match'] || '', stale };
      hits.push(hit);
      if (stale) { res.writeHead(304); res.end(); return; }
      res.writeHead(200, { 'content-type': 'application/json', etag: '"show-1"' });
      res.end(body);
      return;
    }
    if (url.pathname === '/history' || url.pathname === '/history/cards') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(url.pathname === '/history' ? '{"days":[],"events":[]}' : '{"cards":[]}');
      return;
    }
    const rel = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.normalize(path.join(PUB, rel));
    if (!file.startsWith(PUB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('missing'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, hits, arm304() { stale = true; } }));
  });
}

async function face(page) {
  return page.evaluate(() => ({
    age: (document.querySelector('#waveBody .wage') || {}).textContent || '',
    fresh: (document.querySelector('#freshText') || {}).textContent || '',
    boot: window.__boot || 0,
    hidden: document.hidden,
  }));
}

async function waitFace(page, pred) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < 5000) {
    last = await face(page);
    if (pred(last)) return last;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error('board face stayed ' + JSON.stringify(last));
}

async function setHidden(page, hidden) {
  await page.evaluate((flag) => {
    if (!document.__visHook) {
      let hiddenFlag = false;
      Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return hiddenFlag; } });
      Object.defineProperty(Document.prototype, 'visibilityState', {
        configurable: true,
        get() { return hiddenFlag ? 'hidden' : 'visible'; },
      });
      document.__visHook = (v) => { hiddenFlag = !!v; };
    }
    document.__visHook(flag);
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('hide then show refreshes ages and the health strip when the feed answers 304', async () => {
  const { server, hits, arm304 } = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html?replay=0`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.clock.install({ time: T0 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { window.__boot = 1; });
    await page.clock.runFor(200);
    const opened = await waitFace(page, (row) => row.age === '0m' && row.fresh === 'Updated just now');
    assert.equal(opened.age, '0m');
    assert.equal(opened.fresh, 'Updated just now');
    const full = hits.filter((hit) => hit.url.startsWith('/live-events.json') && !hit.stale);
    assert.equal(full.length, 1, JSON.stringify(hits));
    assert.ok(full.every((hit) => !hit.url.includes('since=')), JSON.stringify(full));

    arm304();
    await setHidden(page, true);
    assert.equal((await face(page)).hidden, true);
    // Jump the clock without firing timers or frames. A hidden tab must keep the painted ages.
    await page.clock.setFixedTime(T0 + 120000);
    const frozen = await face(page);
    assert.equal(frozen.age, '0m', JSON.stringify(frozen));
    assert.equal(frozen.fresh, 'Updated just now');

    const beforeShow = hits.length;
    await setHidden(page, false);
    const shown = await waitFace(page, (row) => row.age === '2m' && row.fresh === 'Updated 2 min ago');
    assert.equal(shown.age, '2m');
    assert.equal(shown.fresh, 'Updated 2 min ago');
    assert.equal(shown.boot, 1, 'show refreshes in place');
    const showHits = hits.slice(beforeShow).filter((hit) => hit.url.startsWith('/live-events.json'));
    assert.ok(showHits.length >= 1, JSON.stringify(hits));
    assert.equal(showHits[0].stale, true);
    assert.equal(showHits[0].url.includes('since='), false, showHits[0].url);
    assert.equal(showHits[0].inm, '');

    const after = hits.length;
    await page.clock.fastForward(10000);
    const later = hits.slice(after).filter((hit) => hit.url.startsWith('/live-events.json'));
    assert.ok(later.some((hit) => hit.url.includes('since=')), JSON.stringify(hits.slice(after)));

    await page.clock.setFixedTime(T0 + 210000);
    const beforePage = hits.length;
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    const restored = await waitFace(page, (row) => row.age === '4m' && row.fresh === 'Updated 4 min ago');
    assert.equal(restored.age, '4m');
    assert.equal(restored.fresh, 'Updated 4 min ago');
    assert.equal(restored.boot, 1);
    const pageHits = hits.slice(beforePage).filter((hit) => hit.url.startsWith('/live-events.json'));
    assert.ok(pageHits.length >= 1, JSON.stringify(hits.slice(beforePage)));
    assert.equal(pageHits[0].stale, true);
    assert.equal(pageHits[0].url.includes('since='), false, pageHits[0].url);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
