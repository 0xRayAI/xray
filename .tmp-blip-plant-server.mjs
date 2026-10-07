import http from 'node:http';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const ART = path.join(__dirname, 'artifacts');
const WORK = path.join(__dirname, 'work');
const FOUNDRY = path.join(__dirname, 'foundry');
const DEFAULT_BED = process.env.BLIPS_DEFAULT_BED || path.join(__dirname, 'default-bed.wav');
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });
const PLANT_VERSION = 'xray@41e15d8+drop';

function publicBase(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function hasAudioStream(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return (r.stdout || '').includes('audio');
}
function muxBed(videoPath, bedPath, outPath) {
  if (!fs.existsSync(bedPath)) return { ok: false, reason: `bed missing: ${bedPath}` };
  const r = spawnSync('ffmpeg', ['-y', '-i', videoPath, '-i', bedPath, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', outPath], { encoding: 'utf8', timeout: 60_000 });
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    return { ok: false, reason: (r.stderr || r.stdout || 'ffmpeg mux fail').slice(0, 300) };
  }
  return { ok: true };
}
function renderBlip({ brief, picture }) {
  const id = crypto.randomUUID();
  const root = path.join(WORK, id);
  fs.mkdirSync(root, { recursive: true });
  const mode = picture || 'still';
  // v2 plant embeds syncopated auto-bed; do not pass external --bed unless forced
  const args = [path.join(FOUNDRY, 'blip.mjs'), 'render', '--brief', String(brief || ''), '--mode', String(mode)];
  const r = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', env: { ...process.env, FOUNDRY_ROOT: root }, timeout: 180_000,
  });
  let receipt;
  try { receipt = JSON.parse(r.stdout || ''); } catch {
    return { ok: false, reason: `non-JSON plant: ${((r.stderr || r.stdout) || '').slice(0, 300)}` };
  }
  if (receipt.status === 'FAIL' || r.status !== 0) {
    return { ok: false, reason: receipt.reason || 'plant FAIL', receipt };
  }
  const mp4Src = path.join(root, receipt.mp4 || '.xray/blip/blip.mp4');
  if (!fs.existsSync(mp4Src)) return { ok: false, reason: `mp4 missing at ${mp4Src}` };
  const outName = `${id}.mp4`;
  const muxed = path.join(ART, outName);
  // Prefer plant audio when present; else mux default-bed.wav
  if (hasAudioStream(mp4Src)) {
    fs.copyFileSync(mp4Src, muxed);
  } else {
    const bed = process.env.BLIPS_BED_PATH || DEFAULT_BED;
    const mx = muxBed(mp4Src, bed, muxed);
    if (!mx.ok) return { ok: false, reason: mx.reason, receipt };
  }
  if (!hasAudioStream(muxed)) return { ok: false, reason: 'silent mp4 after mux — inspect FAIL', receipt };
  return { ok: true, id, outName, receipt, durationSec: receipt.durationSec || 4.44, picture: receipt.pictureMode || mode, hasAudio: true };
}

function isRenderPost(url) {
  if (!url) return false;
  const pathOnly = url.split('?')[0];
  return pathOnly === '/' || pathOnly === '/render' || pathOnly === '/v1/render';
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, plant: 'blip', bed: fs.existsSync(DEFAULT_BED), mandatoryAudio: true, plantVersion: PLANT_VERSION }));
      return;
    }
    if (req.method === 'GET' && req.url?.startsWith('/artifacts/')) {
      const name = path.basename(req.url.split('?')[0]);
      const file = path.join(ART, name);
      if (!fs.existsSync(file)) { res.writeHead(404); res.end('missing'); return; }
      res.writeHead(200, { 'content-type': 'video/mp4', 'cache-control': 'public, max-age=3600' });
      fs.createReadStream(file).pipe(res);
      return;
    }
    if (req.method === 'POST' && isRenderPost(req.url)) {
      const raw = await readBody(req);
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, reason: 'invalid json' }));
        return;
      }
      const result = renderBlip(body);
      if (!result.ok) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, durationSec: 4.44, picture: body.picture || 'still', plantVersion: PLANT_VERSION, reason: result.reason }));
        return;
      }
      const base = publicBase(req);
      const videoUrl = `${base}/artifacts/${result.outName}`;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ok: true, videoUrl, mediaUrl: videoUrl, imageUrl: null, audioUrl: videoUrl, durationSec: result.durationSec,
        picture: result.picture, plantVersion: PLANT_VERSION, hasAudio: true, receipt: result.receipt,
      }));
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, reason: String(err?.message || err).slice(0, 300) }));
  }
});
server.listen(PORT, () => console.log(`blip-plant listening on ${PORT} ${PLANT_VERSION}`));
