import { parentPort, workerData } from 'node:worker_threads';

let last = Date.now();
let fired = false;
parentPort.on('message', () => { last = Date.now(); });
const checkMs = Math.max(20, Number(workerData.checkMs) || 1000);
setInterval(() => {
  if (fired || Date.now() - last <= workerData.missMs) return;
  fired = true;
  if (workerData.observe) parentPort.postMessage('miss');
  else process.kill(process.pid, 'SIGKILL');
}, checkMs).unref();
