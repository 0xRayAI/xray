// Mint plan for one seat. Ids and the key come from the environment.
// --plan prints the request URL and permissions and does not mint.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mintPlan, permissionDrift, readOnlyPlan } from './seat-app.mjs';
import { installTokenShape } from './activity.mjs';

export function seatFromEnv(env = process.env) {
  let permissions = { metadata: 'read', contents: 'read', pull_requests: 'read', issues: 'read', checks: 'read', statuses: 'read', actions: 'read' };
  if (env.GITHUB_APP_PERMISSIONS) permissions = JSON.parse(env.GITHUB_APP_PERMISSIONS);
  return {
    id: env.BURST_SEAT_ID || 'seat',
    appId: env.GITHUB_APP_ID,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    permissions,
    repositories: (env.GITHUB_APP_REPOS || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

export function planFromEnv(env = process.env) {
  const seat = seatFromEnv(env);
  return env.BURST_APP_READ_ONLY === '1' ? readOnlyPlan(seat) : mintPlan(seat);
}

export function jwtFor(appId, keyPath, now = Math.floor(Date.now() / 1000)) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const body = b64({ iat: now - 60, exp: now + 540, iss: String(appId) });
  const signing = `${head}.${body}`;
  const sig = spawnSync('openssl', ['dgst', '-sha256', '-sign', keyPath], { input: signing });
  if (sig.status !== 0 || !sig.stdout || !sig.stdout.length) return { ok: false, error: 'JWT sign failed' };
  return { ok: true, jwt: `${signing}.${Buffer.from(sig.stdout).toString('base64url')}` };
}

export async function exchange(plan, fetchFn, jwt) {
  const res = await fetchFn(plan.url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + jwt,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'burst-seat-app',
    },
    body: JSON.stringify(plan.body),
  });
  const data = await res.json();
  if (permissionDrift(data.permissions, plan.body.permissions).length) return { ok: false, error: 'permission drift' };
  if (!installTokenShape(data.token)) return { ok: false, error: 'bad token shape' };
  return { ok: true, token: data.token };
}

function fail(plan) {
  process.stderr.write((plan.error || 'mint failed') + '\n');
  process.exit(plan.error && plan.error.includes('read-only') ? 2 : 1);
}

async function main() {
  const plan = planFromEnv();
  if (!plan.ok) fail(plan);
  if (process.argv.includes('--plan')) {
    process.stdout.write(JSON.stringify({ url: plan.url, permissions: plan.body.permissions }) + '\n');
    return;
  }
  const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
  if (!keyPath) fail({ error: 'GITHUB_APP_PRIVATE_KEY_PATH is required' });
  const signed = jwtFor(plan.iss, keyPath);
  if (!signed.ok) fail(signed);
  const minted = await exchange(plan, globalThis.fetch, signed.jwt);
  if (!minted.ok) fail(minted);
  process.stdout.write(minted.token);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write((err && err.message ? err.message : 'mint failed') + '\n');
    process.exit(1);
  });
}
