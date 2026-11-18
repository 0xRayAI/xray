// Spectrum stream + mesh aspect fit. Names are the kit examples (blinky, forge, critic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = process.env.MESH_APP_DIR || path.join(ROOT, 'app');
const html = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');
const cfg = fs.readFileSync(path.join(APP, 'public', 'live-config.js'), 'utf8');

function loadMesh() {
  const ctx = { console, URLSearchParams };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, 'public', 'live.js'), 'utf8'), ctx);
  return ctx.LiveMesh;
}

const L = loadMesh();

function close(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps || 1e-9), a + ' vs ' + b);
}

test('aspect-fit uses one scale and centres wide, tall, and square boxes', () => {
  const contentW = 920, contentH = 400;
  const wide = L.aspectFit(1000, 200, contentW, contentH);
  close(wide.scale, 200 / contentH);
  close(wide.w, contentW * wide.scale);
  close(wide.h, 200);
  close(wide.x, (1000 - wide.w) / 2);
  close(wide.y, 0);
  const tall = L.aspectFit(200, 800, contentW, contentH);
  close(tall.scale, 200 / contentW);
  close(tall.w, 200);
  close(tall.h, contentH * tall.scale);
  close(tall.x, 0);
  close(tall.y, (800 - tall.h) / 2);
  const square = L.aspectFit(500, 500, contentW, contentH);
  close(square.scale, 500 / contentW);
  close(square.w, 500);
  close(square.h, contentH * square.scale);
  close(square.x, 0);
  close(square.y, (500 - square.h) / 2);
  for (const box of [[1000, 200, wide], [200, 800, tall], [500, 500, square]]) {
    const fit = box[2];
    assert.equal(typeof fit.scale, 'number');
    close(fit.x * 2 + fit.w, box[0]);
    close(fit.y * 2 + fit.h, box[1]);
    close(fit.w / contentW, fit.h / contentH);
    close(fit.w / contentW, fit.scale);
  }
});

test('spectrum meter is 14 bars and the hue moves', () => {
  const a = L.spectrumMeter(0, false);
  const b = L.spectrumMeter(4000, false);
  assert.equal(a.length, 14);
  assert.equal(b.length, 14);
  assert.ok(a.some((bar, i) => bar.hue !== b[i].hue), 'hue meter animates');
  for (const bar of a) {
    assert.ok(bar.hue >= 0 && bar.hue < 360);
    assert.ok(bar.level > 0 && bar.level <= 1);
  }
  const still = L.spectrumMeter(0, true);
  assert.equal(still.length, 14);
  assert.ok(still.every((bar) => bar.level === still[0].level), 'reduced motion holds one level');
});

test('spectrum trail is 12 stops with decreasing alpha, stronger on a light plate', () => {
  const dark = L.spectrumTrail(0.8, 1000, false);
  const light = L.spectrumTrail(0.8, 1000, true);
  const later = L.spectrumTrail(0.8, 5000, false);
  assert.equal(dark.length, 12);
  assert.equal(light.length, 12);
  for (let i = 1; i < dark.length; i++) {
    assert.ok(dark[i].alpha < dark[i - 1].alpha, 'dark ' + i);
    assert.ok(light[i].alpha < light[i - 1].alpha, 'light ' + i);
    assert.ok(light[i].alpha >= dark[i].alpha);
    assert.ok(light[i].lightness < dark[i].lightness);
  }
  assert.ok(later.some((stop, i) => stop.hue !== dark[i].hue), 'trail hue animates');
  assert.equal(L.packetCore(false), '#ffffff');
  assert.notEqual(L.packetCore(true), '#ffffff');
  assert.match(L.packetCore(true), /^#[0-9a-f]{6}$/);
});

test('spectrum defaults on; ?spectrum=0 opts out; ?replay=0 still only gates the loop', () => {
  assert.match(cfg, /L\.SPECTRUM = true;/);
  assert.match(html, /L\.spectrumEnabled\(L\.SPECTRUM, location\.search, reduced\)/);
  assert.match(html, /var ambientOn = !reduced && !\/\[\?&\]replay=0\(&\|\$\)\/\.test\(location\.search\);/);
  assert.match(html, /id="spectrumPill"[^>]*>Spectrum</);
  assert.match(html, /id="spectrumMeter"/);
  assert.match(html, /L\.spectrumMeter\(/);
  assert.match(html, /L\.spectrumTrail\(/);
  assert.match(html, /canvas\.dataset\.spectrumTrail = '1'/);
  assert.match(html, /L\.aspectFit\(canvas\.width, canvas\.height, W, H\)/);
  assert.match(html, /L\.packetCore\(light\)/);
  assert.match(html, /quadraticCurveTo\(m\[0\], m\[1\], b\[0\], b\[1\]\)/);
  assert.doesNotMatch(html, /parallelLane|laneOffset|staggered lanes/);
  assert.equal(L.spectrumEnabled(true, '', false), true);
  assert.equal(L.spectrumEnabled(undefined, '', false), true);
  assert.equal(L.spectrumEnabled(false, '', false), false);
  assert.equal(L.spectrumEnabled(true, '?spectrum=0', false), false);
  assert.equal(L.spectrumEnabled(true, '?replay=0', false), true);
  assert.equal(L.spectrumEnabled(true, '?replay=0&spectrum=0', false), false);
  assert.equal(L.spectrumEnabled(true, '?spectrum=0&x=1', false), false);
  assert.equal(L.spectrumEnabled(true, '', true), false);
  assert.equal(L.spectrumShows(true, { playing: true }), true);
  assert.equal(L.spectrumShows(true, { replay: true }), true);
  assert.equal(L.spectrumShows(true, { ambient: true }), true);
  assert.equal(L.spectrumShows(true, { playing: false, replay: false, ambient: false }), false);
  assert.equal(L.spectrumShows(false, { playing: true, replay: true, ambient: true }), false);
});

test('a set falsy spectrum flag is off, including 0', () => {
  assert.equal(L.spectrumEnabled(0, '', false), false);
  assert.equal(L.spectrumEnabled(0, '?replay=1', false), false);
  assert.equal(L.spectrumEnabled('', '', false), false);
  assert.equal(L.spectrumEnabled(null, '', false), false);
  assert.equal(L.spectrumEnabled(false, '', false), false);
  assert.equal(L.spectrumEnabled(undefined, '', false), true);
  assert.equal(L.spectrumEnabled(true, '?spectrum=1', false), true);
});

test('the board manual names a falsy spectrum flag and no spectrum plate', () => {
  const manual = fs.readFileSync(path.join(ROOT, 'docs', 'board.md'), 'utf8');
  assert.match(manual, /A set falsy `LiveMesh\.SPECTRUM` \(`0`, `''`, `null`, `false`\) turns the stream off, and a missing flag leaves it on\./);
  assert.match(manual, /The opening burst and the replay loop play the last hour\./);
  assert.match(manual, /Plates read: none \(no spectrum plate\)/);
});

test('playback hides the live pill while the spectrum pill is visible', () => {
  assert.match(html, /var spectrumUp = !!\(\$\('spectrumPill'\) && !\$\('spectrumPill'\)\.hidden\);/);
  assert.match(html, /\$\('pill'\)\.hidden = spectrumUp && \(playing \|\| replay\);/);
  assert.match(html, /#pill\[hidden\] \{ display: none !important; \}/);
  assert.doesNotMatch(html, /\.pill\.replay/);
  assert.doesNotMatch(html, /--replay-/);
  assert.doesNotMatch(html, /classList\.toggle\('replay'/);
  assert.doesNotMatch(html, /return 'REPLAY'/);
  assert.match(html, /id="play"/);
  assert.match(html, /> Replay loop<\/label>/);
});

test('the replay toggle re-reads the spectrum flag', () => {
  const handler = html.match(/\$\('ambient'\)\.addEventListener\('change', function \(ev\) \{([^}]*)\}\);/);
  assert.ok(handler, 'ambient change handler');
  assert.match(handler[1], /readSpectrum\(\)/);
  assert.match(html, /function readSpectrum\(\) \{ spectrumOn = L\.spectrumEnabled\(L\.SPECTRUM, location\.search, reduced\); \}/);
});
