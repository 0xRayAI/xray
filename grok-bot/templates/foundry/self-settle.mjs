import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Built embeddable settler from 0xRayAI/clearing.
 * CLEARING_SETTLE_SHA is the merge commit of clearing#40.
 * The foundry supplies allowPayTo. Mainnet stays off unless allowMainnet is true.
 */
export const CLEARING_SETTLE_SHA = 'ee6089b45cb050e2db0d1bb8f1a2f9c061592aac';
export const CLEARING_BASE_SETTLE = 'dist/mcp/src/base-settle.js';

export function pinnedSettleFile(clearingRoot) {
  if (!clearingRoot) throw new Error(`clearing ${CLEARING_SETTLE_SHA} is not present`);
  let head = '';
  try {
    head = execFileSync('git', ['-C', clearingRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(`clearing ${CLEARING_SETTLE_SHA} is not present`);
  }
  if (head !== CLEARING_SETTLE_SHA) {
    throw new Error(`clearing checkout ${head} is not ${CLEARING_SETTLE_SHA}`);
  }
  const file = path.join(clearingRoot, CLEARING_BASE_SETTLE);
  if (!existsSync(file)) throw new Error(`clearing ${CLEARING_SETTLE_SHA} has no built ${CLEARING_BASE_SETTLE}`);
  return file;
}

export async function loadBaseSettler(clearingRoot) {
  const file = pinnedSettleFile(clearingRoot);
  return import(pathToFileURL(file).href);
}

export function foundrySettleDeps(input) {
  if (!input || !Array.isArray(input.allowPayTo) || input.allowPayTo.length === 0) {
    throw new Error('the foundry must supply allowPayTo');
  }
  if (!input.advertised || input.advertised.scheme !== 'exact') {
    throw new Error('the foundry must advertise its own exact 402');
  }
  return {
    allowPayTo: input.allowPayTo,
    advertised: input.advertised,
    signer: input.signer,
    chain: input.chain,
    nowSec: input.nowSec,
    allowMainnet: input.allowMainnet === true,
  };
}

export async function settleOwnPayment(input) {
  const mod = await loadBaseSettler(input.clearingRoot);
  const settler = mod.createBaseSettler(foundrySettleDeps(input));
  return settler.settle(input.raw);
}
