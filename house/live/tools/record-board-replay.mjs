#!/usr/bin/env node
// Record the current board, then replay one window, without using a stale shell.
// Usage: node house/live/tools/record-board-replay.mjs --from 2026-11-16T03:00 --to now --secs 30 --theme dark
// Artifacts go to /opt/cursor/artifacts.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parseWhen, replaySpeed } from './replay-plan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const live = path.resolve(here, '..');
const KEEP = ['blinky', 'critic', 'forge', 'near', 'nibbler', 'mill', 'arch1'];

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

function fail(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}

function localFile(pathname) {
  if (pathname === '/' || pathname === '/index.html') return path.join(live, 'app/public/index.html');
  if (pathname === '/site-config.js') return path.join(live, 'site/public/site-config.js');
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!rel || rel.includes('..')) return null;
  const site = path.join(live, 'site/public', rel);
  const app = path.join(live, 'app/public', rel);
  if (fs.existsSync(site) && fs.statSync(site).isFile()) return site;
  if (fs.existsSync(app) && fs.statSync(app).isFile()) return app;
  return null;
}

function typeOf(file) {
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript';
  if (file.endsWith('.html')) return 'text/html';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

const fromText = arg('from');
const toText = arg('to', 'now');
const secs = arg('secs', '20');
const theme = String(arg('theme', 'dark')).trim().toLowerCase();
const outDir = arg('out', '/opt/cursor/artifacts');
const pageUrl = arg('url', 'https://bifrost.0xray.dev/');
if (!fromText) fail('usage: record-board-replay.mjs --from <CT ISO> --to now --secs 15-30 --theme dark');
if (theme !== 'dark' && theme !== 'light') fail('theme must be dark or light');

const now = Date.now();
const fromMs = parseWhen(fromText, now);
const toMs = parseWhen(toText, now);
const plan = replaySpeed(fromMs, toMs, secs);
fs.mkdirSync(outDir, { recursive: true });

const host = new URL(pageUrl).host;
const chrome = process.env.CHROME_PATH || (fs.existsSync('/opt/google/chrome/chrome') ? '/opt/google/chrome/chrome' : '');
const browser = await chromium.launch(chrome ? { executablePath: chrome, headless: true } : { headless: true });
const opened = Date.now();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  colorScheme: theme,
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
await context.addInitScript((chosen) => {
  try { localStorage.setItem('bifrost-theme', chosen); } catch { /* the page also follows the color scheme */ }
}, theme);
const page = await context.newPage();
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.host !== host) return route.continue();
  const file = localFile(url.pathname);
  if (!file) return route.continue();
  return route.fulfill({
    status: 200,
    contentType: typeOf(file),
    headers: { 'cache-control': 'no-store' },
    body: fs.readFileSync(file),
  });
});

const bust = pageUrl.includes('?') ? '&' : '?';
await page.goto(pageUrl + bust + 'board=' + now, { waitUntil: 'domcontentloaded' });
await page.waitForFunction((names) => {
  const h1 = document.querySelector('h1') ? document.querySelector('h1').textContent : '';
  const stats = document.querySelector('#waveStats') ? document.querySelector('#waveStats').textContent : '';
  const pill = document.querySelector('#pill') ? document.querySelector('#pill').textContent : '';
  const sats = window.LiveMesh && window.LiveMesh.SATS;
  const slider = document.getElementById('slider');
  return h1.includes('Live board') && pill === 'LIVE' && /open now|issues opened|owner prompts/.test(stats)
    && slider && Number(slider.max) > Number(slider.min)
    && names.every((name) => sats && Object.prototype.hasOwnProperty.call(sats, name));
}, KEEP, { timeout: 45000 });

const driven = await page.evaluate(({ from, speed, theme: chosen }) => {
  const sel = document.getElementById('speed');
  const opt = document.createElement('option');
  opt.value = String(speed);
  opt.textContent = String(speed) + '×';
  sel.appendChild(opt);
  sel.value = String(speed);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const slider = document.getElementById('slider');
  const start = Math.max(Number(slider.min), from);
  slider.value = String(start);
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  return {
    chosen: sel.value,
    theme: document.documentElement.getAttribute('data-theme'),
  };
}, { from: fromMs, speed: plan.speed, theme });
if (driven.theme !== theme) fail('theme is ' + driven.theme);
if (driven.chosen !== String(plan.speed)) fail('speed control is ' + driven.chosen);
const lead = Math.max(0, (Date.now() - opened) / 1000 - 0.4);
await page.waitForTimeout(Math.round(plan.secs * 1000));

const after = await page.evaluate(() => Object.keys(window.LiveMesh.SATS));
const text = await page.locator('body').innerText();
const finalUrl = page.url();
const missing = KEEP.filter((name) => !after.includes(name));
if (missing.length) fail('replay dropped ' + missing.join(', '));
if (!finalUrl.includes('bifrost.0xray.dev')) fail('left the board: ' + finalUrl);
if (/sign in|log in|unauthorized/i.test(text)) fail('login page');
if (!/Live board|REWOUND|events/.test(text)) fail('error page');

const video = page.video();
await context.close();
await browser.close();
const webm = await video.path();
const mp4 = path.join(outDir, 'board-replay.mp4');
const png = path.join(outDir, 'board-replay-mid.png');
const encoded = spawnSync('ffmpeg', ['-y', '-ss', lead.toFixed(3), '-i', webm, '-t', String(plan.secs), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4], { encoding: 'utf8' });
if (encoded.status !== 0) fail(encoded.stderr || 'ffmpeg failed');
const mid = String(Math.max(1, Math.floor(plan.secs / 2)));
const frame = spawnSync('ffmpeg', ['-y', '-ss', mid, '-i', mp4, '-frames:v', '1', png], { encoding: 'utf8' });
if (frame.status !== 0) fail(frame.stderr || 'frame failed');
if (fs.statSync(png).size < 5000) fail('mid frame is empty');
fs.rmSync(webm, { force: true });
process.stdout.write(JSON.stringify({
  url: finalUrl, from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString(),
  speed: plan.speed, secs: plan.secs, theme, lead, seats: after, mp4, png,
}) + '\n');
