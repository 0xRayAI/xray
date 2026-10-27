import { Worker } from 'node:worker_threads';

const MISS_MS = 30000;
const EVERY_MS = 5000;

/** A beat from this thread. A stuck loop stops the beat, and the worker exits the process. */
export function startHealthBeat(opts = {}) {
  const missMs = Number(opts.missMs) > 0 ? Number(opts.missMs) : MISS_MS;
  const everyMs = Number(opts.everyMs) > 0 ? Number(opts.everyMs) : EVERY_MS;
  const checkMs = Number(opts.checkMs) > 0 ? Number(opts.checkMs) : Math.min(1000, Math.max(20, Math.floor(missMs / 4)));
  const worker = new Worker(new URL('./health-beat-worker.mjs', import.meta.url), {
    workerData: { missMs, checkMs, observe: opts.observe === true },
  });
  const beat = () => { try { worker.postMessage('beat'); } catch { /* worker gone */ } };
  beat();
  const timer = setInterval(beat, everyMs);
  timer.unref();
  worker.unref();
  worker.on('message', (msg) => {
    if (msg === 'miss' && typeof opts.onMiss === 'function') opts.onMiss();
  });
  worker.on('error', () => {});
  return {
    beat,
    stop() { clearInterval(timer); return worker.terminate(); },
  };
}
