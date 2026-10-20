// Display aspect must match the bitmap even when a host stylesheet forces #mesh { height: 300px }.
// Kit example names only: blinky, forge, critic.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const OUT = process.env.SPECTRUM_OUT || '/opt/cursor/artifacts/spectrum';
const SKEW = '#mesh { height: 300px }';

function feed() {
  const now = Date.now();
  const seats = ['blinky', 'forge', 'critic'];
  const events = [];
  for (let i = 0; i < 10; i++) {
    events.push({
      id: 'e' + i,
      t_ct: new Date(now - (290 - i * 28) * 1000).toISOString(),
      kind: 'comment',
      from: i % 2 ? 'critic' : 'blinky',
      to: i % 2 ? 'forge' : 'critic',
      label: 'handoff ' + seats[i % 3]
    });
  }
  return { generated_at: new Date(now).toISOString(), events };
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/live-events.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(feed()));
        return;
      }
      const rel = url.pathname === '/' ? '/index.html' : url.pathname;
      const file = path.join(PUB, rel);
      if (!file.startsWith(PUB) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end('missing'); return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Seat fills cross a rainbow cutoff. replayTrail sets this mark when it paints.
// ?spectrum=0 never calls that paint, so the opt-out does not pass the check.
function sampleInk() {
  const c = document.getElementById('mesh');
  const ctx = c.getContext('2d');
  const corner = ctx.getImageData(2, 2, 1, 1).data;
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let white = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) white++;
  }
  return { white, corner: [corner[0], corner[1], corner[2]], trail: c.dataset.spectrumTrail || '' };
}

async function measure(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.evaluate(() => {
    const c = document.getElementById('mesh');
    const display = c.clientWidth / c.clientHeight;
    const bitmap = c.width / c.height;
    const fit = window.LIVE_FIT || {};
    return {
      display, bitmap, ratio: display / bitmap,
      clientWidth: c.clientWidth, clientHeight: c.clientHeight,
      width: c.width, height: c.height,
      scale: fit.scale, fitW: fit.w, fitH: fit.h,
      pill: document.getElementById('spectrumPill').textContent,
      pillHidden: document.getElementById('spectrumPill').hidden,
      bars: document.getElementById('spectrumMeter').children.length
    };
  });
}

const results = [];
fs.mkdirSync(OUT, { recursive: true });
const server = await serve();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
try {
  const cases = [
    ['dark', 1440, 900],
    ['light', 1440, 900],
    ['dark', 390, 844],
    ['light', 390, 844]
  ];
  for (const [scheme, width, height] of cases) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
    await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: SKEW });
    await page.waitForFunction(() => {
      const pill = document.getElementById('spectrumPill');
      const meter = document.getElementById('spectrumMeter');
      return pill && !pill.hidden && meter && meter.children.length === 14;
    }, null, { timeout: 8000 });
    if (scheme === 'dark') {
      await page.waitForFunction(() => {
        const c = document.getElementById('mesh');
        const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) return true;
        }
        return false;
      }, null, { timeout: 7000 });
    } else {
      await page.waitForTimeout(1200);
    }
    const m = await measure(page);
    const ink = await page.evaluate(sampleInk);
    if (scheme === 'dark' && (ink.corner[0] > 30 || ink.white < 1)) throw new Error('dark plate ' + JSON.stringify(ink));
    if (scheme === 'light' && ink.corner[0] < 220) throw new Error('light plate ' + JSON.stringify(ink));
    if (ink.trail !== '1') throw new Error(scheme + ' trail did not paint');
    const shot = path.join(OUT, scheme + '-' + width + 'x' + height + '.png');
    await page.screenshot({ path: shot });
    if (!(m.clientWidth > 0 && m.clientHeight > 0)) throw new Error(scheme + ' canvas has no box');
    if (Math.abs(m.ratio - 1) > 0.01) throw new Error(scheme + ' ' + width + 'x' + height + ' aspect ' + m.ratio);
    if (m.bars !== 14) throw new Error('meter bars ' + m.bars);
    if (m.pill !== 'Spectrum') throw new Error('pill ' + m.pill);
    const uniform = Math.abs(m.fitW / 920 - m.fitH / 400);
    if (!(uniform < 1e-6)) throw new Error('non-uniform fit ' + uniform);
    results.push({ scheme, width, height, ratio: m.ratio, client: [m.clientWidth, m.clientHeight], bitmap: [m.width, m.height], scale: m.scale, shot });
    await page.close();
  }

  const off = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await off.goto(base + '/index.html?spectrum=0&replay=0', { waitUntil: 'domcontentloaded' });
  await off.addStyleTag({ content: SKEW });
  await off.waitForTimeout(400);
  const flags = await off.evaluate(() => ({
    pillHidden: document.getElementById('spectrumPill').hidden,
    ambient: document.getElementById('ambient').checked,
    replayOff: /[?&]replay=0(&|$)/.test(location.search)
  }));
  if (!flags.pillHidden) throw new Error('?spectrum=0 still shows the Spectrum pill');
  if (flags.ambient) throw new Error('?replay=0 left the replay loop checked');
  const m = await measure(off);
  if (Math.abs(m.ratio - 1) > 0.01) throw new Error('opt-out aspect ' + m.ratio);
  const offInk = await off.evaluate(sampleInk);
  if (offInk.trail) throw new Error('opt-out already paints the trail');
  const optShot = path.join(OUT, 'opt-out-spectrum0-replay0-1440x900.png');
  await off.screenshot({ path: optShot });
  results.push({ scheme: 'dark', width: 1440, height: 900, query: '?spectrum=0&replay=0', ratio: m.ratio, shot: optShot, flags });
  await off.close();
} finally {
  await browser.close();
  server.close();
}

const summary = path.join(OUT, 'results.json');
fs.writeFileSync(summary, JSON.stringify({ skew: SKEW, results }, null, 2));
console.log(JSON.stringify({ skew: SKEW, results }, null, 2));
