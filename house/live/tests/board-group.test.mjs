// Cards group by status until the By agent toggle is pressed.
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
  return {
    generated_at: new Date(now).toISOString(),
    cursor: 'board-group',
    events: [],
    queue: [],
    track: { items: [] },
    cloud_agents: [],
    board: {
      updated_ct: new Date(now).toISOString(),
      stats: { open_total: 3 },
      cards: [
        { key: 'example/app#1', repo: 'example/app', number: 1, kind: 'issue', state: 'live', stage: 'open', title: 'Mill issue', owner: 'mill', packet_ok: true, last_beat_t: now - 1000, beats: [{ t: now - 1000, what: 'opened' }] },
        { key: 'example/app#4', repo: 'example/app', number: 4, kind: 'issue', state: 'live', stage: 'open', title: 'Coord issue', owner: 'blinky', packet_ok: true, last_beat_t: now - 2000, beats: [{ t: now - 2000, what: 'opened' }] },
        { key: 'example/app#3', repo: 'example/app', number: 3, kind: 'pr', state: 'live', stage: 'review', title: 'In review', owner: 'mill', packet_ok: true, last_beat_t: now - 3000, beats: [{ t: now - 3000, what: 'review' }] },
        { key: 'example/app#2', repo: 'example/app', number: 2, kind: 'pr', state: 'closed', stage: 'done', title: 'Merged one', owner: 'forge', packet_ok: true, last_beat_t: now - 4000, beats: [{ t: now - 4000, what: 'merged' }] },
      ],
    },
  };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
  const body = JSON.stringify(feed());
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

function sections() {
  const out = [];
  let cur = null;
  const byAgent = document.getElementById('waveBody').dataset.group === 'agent';
  for (const el of document.getElementById('waveBody').children) {
    if (el.classList.contains('wgroup')) {
      cur = { group: el.textContent, sub: [], cards: [] };
      out.push(cur);
    } else if (el.classList.contains('wsub') && cur) cur.sub.push(el.textContent);
    else if (el.classList.contains('donehead')) {
      if (!(byAgent && cur)) {
        cur = { group: el.textContent, sub: [], cards: [] };
        out.push(cur);
      }
    } else if (el.classList.contains('wcards') && cur) {
      cur.cards.push(...[...el.querySelectorAll('.wcard')].map((card) => card.dataset.key));
    }
  }
  return {
    mode: document.getElementById('waveBody').dataset.group,
    pressed: document.getElementById('cardGroup').getAttribute('aria-pressed'),
    stored: localStorage.getItem('bifrost-card-group'),
    sections: out,
  };
}

test('status grouping is the default and the toggle switches to by-agent', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => {
      if (sessionStorage.getItem('card-group-cleared')) return;
      localStorage.removeItem('bifrost-card-group');
      sessionStorage.setItem('card-group-cleared', '1');
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#waveBody .wcard'));
    if (await page.evaluate(() => document.querySelector('[data-fold="cards"]').classList.contains('collapsed'))) {
      await page.click('[data-fold="cards"] > .fold-head');
    }
    const status = await page.evaluate(sections);
    assert.equal(status.mode, 'status');
    assert.equal(status.pressed, 'false');
    assert.equal(status.stored, null);
    assert.deepEqual(status.sections.map((row) => row.group.replace(/ \(.*$/, '')), ['waiting', 'in review', 'done']);
    assert.deepEqual(status.sections[0].cards, ['example/app#1', 'example/app#4']);
    assert.deepEqual(status.sections[0].sub, []);
    assert.deepEqual(status.sections[1].cards, ['example/app#3']);
    assert.deepEqual(status.sections[2].cards, ['example/app#2']);
    assert.equal(await page.evaluate(() => document.querySelector('#waveBody .wcard[data-key="example/app#2"]').parentElement.className.includes('done')), true);
    await page.screenshot({ path: path.join(ART, 'board-group-status.png') });

    await page.click('#cardGroup');
    await page.waitForFunction(() => document.getElementById('waveBody').dataset.group === 'agent');
    const agent = await page.evaluate(sections);
    assert.equal(agent.mode, 'agent');
    assert.equal(agent.pressed, 'true');
    assert.equal(agent.stored, 'agent');
    assert.deepEqual(agent.sections.map((row) => row.group), ['Coord', 'GitHub', 'mill']);
    const coord = agent.sections[0];
    const github = agent.sections[1];
    const mill = agent.sections[2];
    assert.deepEqual(coord.cards, ['example/app#4']);
    assert.ok(coord.sub.some((row) => row.startsWith('waiting on this seat')));
    assert.deepEqual(github.cards, ['example/app#2']);
    assert.deepEqual(mill.cards, ['example/app#1', 'example/app#3']);
    assert.ok(mill.sub.some((row) => row.startsWith('waiting on this seat')));
    assert.ok(mill.sub.some((row) => row.startsWith('in review')));
    assert.equal(agent.sections.some((row) => row.group.startsWith('waiting') || row.group.startsWith('in review')), false);
    await page.screenshot({ path: path.join(ART, 'board-group-agent.png') });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('waveBody').dataset.group === 'agent' && document.querySelector('#waveBody .wcard'));
    assert.equal(await page.evaluate(() => localStorage.getItem('bifrost-card-group')), 'agent');

    if (await page.evaluate(() => document.querySelector('[data-fold="cards"]').classList.contains('collapsed'))) {
      await page.click('[data-fold="cards"] > .fold-head');
    }
    await page.click('#cardGroup');
    await page.waitForFunction(() => document.getElementById('waveBody').dataset.group === 'status');
    const back = await page.evaluate(sections);
    assert.equal(back.pressed, 'false');
    assert.equal(back.stored, 'status');
    assert.deepEqual(back.sections[0].cards, ['example/app#1', 'example/app#4']);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
