import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Built embeddable settler from 0xRayAI/clearing. The foundry supplies allowPayTo. */
export const CLEARING_BASE_SETTLE = 'dist/mcp/src/base-settle.js';

export async function loadBaseSettler(clearingRoot) {
  const file = path.join(clearingRoot, CLEARING_BASE_SETTLE);
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
  };
}

export async function settleOwnPayment(input) {
  const mod = await loadBaseSettler(input.clearingRoot);
  const settler = mod.createBaseSettler(foundrySettleDeps(input));
  return settler.settle(input.raw);
}
