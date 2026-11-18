// Read the collector feed off the server thread. A pass rewrites the file even when no event changed
// (generated_at and the board clock move). Parsing that file on the request thread makes /healthz sit silent.
import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Hash into the digest. Building one sorted string per event stalls a 60k-event quiet pass,
// the reader never publishes, and the watchdog then kills a collector that is still writing.
function hashValue(h, v) {
  if (v === null || v === undefined) {
    h.update('null');
    return;
  }
  if (Array.isArray(v)) {
    h.update('[');
    for (const item of v) hashValue(h, item);
    h.update(']');
    return;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v).sort();
    h.update('{');
    for (const key of keys) {
      h.update(key);
      h.update(':');
      hashValue(h, v[key]);
    }
    h.update('}');
    return;
  }
  h.update(typeof v);
  h.update(':');
  h.update(String(v));
}

try {
  const raw = fs.readFileSync(workerData.file, 'utf8');
  const st = fs.statSync(workerData.file);
  const f = JSON.parse(raw);
  const sig = `${st.ino}:${st.size}:${st.mtimeMs}`;
  if (!f || typeof f !== 'object' || Array.isArray(f) || !Array.isArray(f.events) || f.events.length > 200000) {
    parentPort.postMessage({ ok: false, error: 'invalid', sig });
  } else {
    const h = crypto.createHash('sha1');
    for (const e of f.events) {
      hashValue(h, e);
      h.update('\n');
    }
    const eventHash = h.digest('hex') + ':' + f.events.length;
    const same = !!workerData.prevHash && workerData.prevHash === eventHash;
    if (same) {
      const header = {};
      for (const k of Object.keys(f)) if (k !== 'events' && k !== 'cursor') header[k] = f[k];
      parentPort.postMessage({ ok: true, same: true, eventHash, header, sig, mtimeMs: st.mtimeMs });
    } else {
      parentPort.postMessage({ ok: true, same: false, eventHash, feed: f, sig, mtimeMs: st.mtimeMs });
    }
  }
} catch {
  parentPort.postMessage({ ok: false, error: 'read' });
}
