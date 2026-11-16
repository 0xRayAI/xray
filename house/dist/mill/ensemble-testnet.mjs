#!/usr/bin/env node
/**
 * NEAR testnet ensemble for xray#1144.
 *
 * Contracts are the clearing main builds, pinned below. There is no rail
 * contract in that tree. A shop payment under 1 USDC is the direct rail
 * (clearing near/escrow/src/lib.rs MIN_AMOUNT comment). Base mainnet is not
 * called. Clearing has no Base Sepolia shop, so that pay is skipped.
 *
 * Keys stay in ENSEMBLE_KEY_DIR (default /tmp/xray-1144-keys) at mode 0600.
 * This script prints transaction hashes, account ids, and balances only.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLEARING_SHA = '9507b22b3631ef44c40c82ab8d160a198169cdd6';
const USDC = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';
const RPC = 'https://rpc.testnet.near.org';
const HELPER = 'https://helper.testnet.near.org/account';
const CHAIN_ID = 'testnet';
const WINDOW_NS = 600_000_000_000;
const ONE_USDC = '1000000';
const RAIL_USDC = '10000';
const OVER_CAP = '1000001';
const STORAGE = '1250000000000000000000';
const KEY_DIR = process.env.ENSEMBLE_KEY_DIR || '/tmp/xray-1144-keys';
const API_ROOT = process.env.ENSEMBLE_NEAR_API || '/tmp/ensemble-deps/node_modules/near-api-js';
const RECEIPTS = process.env.ENSEMBLE_RECEIPTS || path.join(HERE, '1144-ensemble-receipts.md');

const require = createRequire(path.join(API_ROOT, 'package.json'));
const { connect, keyStores, KeyPair } = require(API_ROOT);

const steps = [];

function say(line) {
  const safe = String(line)
    .replace(/ed25519:[1-9A-HJ-NP-Za-km-z]+/g, 'ed25519:[redacted]')
    .replace(/"private_key"\s*:\s*"[^"]+"/g, '"private_key":"[redacted]"');
  process.stdout.write(`${safe}\n`);
}

function link(hash) {
  return hash ? `https://testnet.nearblocks.io/txns/${hash}` : '';
}

function record(step, fields) {
  steps.push({ step, ...fields });
  const hash = fields.hash ? ` ${fields.hash}` : '';
  say(`${step}: ${fields.ok ? 'ok' : 'fail'}${hash}${fields.error ? ` ${fields.error}` : ''}`);
}

function hex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function nonce() {
  return `e1144${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 32);
}

function publicError(err) {
  const hash = err?.transaction?.hash
    || err?.transaction_outcome?.id
    || err?.context?.transactionHash
    || '';
  let text = err instanceof Error ? err.message : String(err);
  text = text
    .replace(/ed25519:[1-9A-HJ-NP-Za-km-z]+/g, 'ed25519:[redacted]')
    .replace(/[A-Za-z0-9+/=]{80,}/g, '[redacted]');
  return { hash, text: text.slice(0, 400) };
}

function saveKey(file, accountId, keyPair) {
  fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(KEY_DIR, 0o700);
  const body = `${JSON.stringify({
    account_id: accountId,
    public_key: keyPair.getPublicKey().toString(),
    private_key: keyPair.toString(),
  })}\n`;
  fs.writeFileSync(file, body, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function loadKey(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { accountId: data.account_id, keyPair: KeyPair.fromString(data.private_key) };
}

async function ensureAccount(role, accountId) {
  const file = path.join(KEY_DIR, `${role}.json`);
  if (fs.existsSync(file)) {
    const loaded = loadKey(file);
    return loaded;
  }
  const keyPair = KeyPair.fromRandom('ed25519');
  saveKey(file, accountId, keyPair);
  const response = await fetch(HELPER, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      newAccountId: accountId,
      newAccountPublicKey: keyPair.getPublicKey().toString(),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const err = new Error(`NEAR faucet HTTP ${response.status}`);
    err.role = role;
    throw err;
  }
  return { accountId, keyPair };
}

function returnValue(result) {
  const value = result?.status?.SuccessValue;
  if (typeof value !== 'string') return null;
  const text = Buffer.from(value, 'base64').toString('utf8');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function call(account, contractId, methodName, args, gas, deposit) {
  const result = await account.functionCall({
    contractId,
    methodName,
    args,
    gas,
    attachedDeposit: deposit,
  });
  return { hash: result.transaction.hash, value: returnValue(result) };
}

async function view(account, contractId, methodName, args) {
  return account.viewFunction({ contractId, methodName, args });
}

async function usdcReceipt(hash, signer) {
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'ensemble',
      method: 'EXPERIMENTAL_tx_status',
      params: [hash, signer],
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  const rows = body.result?.receipts_outcome || [];
  let tokenSuccess = false;
  let failure = '';
  for (const row of rows) {
    const outcome = row.outcome || {};
    const status = outcome.status || {};
    if (status.Failure) failure = JSON.stringify(status.Failure);
    if (outcome.executor_id === USDC && Object.prototype.hasOwnProperty.call(status, 'SuccessValue')) {
      tokenSuccess = true;
    }
  }
  return { tokenSuccess, failure };
}

async function balanceOf(account, accountId) {
  const value = await view(account, USDC, 'ft_balance_of', { account_id: accountId });
  return String(value);
}

function writeReceipts(appendTitle) {
  const lines = [
    '# xray#1144 testnet ensemble receipts',
    '',
    `Clearing sha: \`${CLEARING_SHA}\`. Network: NEAR testnet. No mainnet call.`,
    '',
    'Base x402 shop pay: skipped. Clearing main has no Base Sepolia shop. Base mainnet was not used.',
    '',
    'The NEAR shop pay is a USDC `ft_transfer` under 1 USDC. clearing `near/escrow` has no separate rail contract; amounts below `MIN_AMOUNT` are the direct rail.',
    '',
    '| Step | Result | Tx | Explorer |',
    '| --- | --- | --- | --- |',
  ];
  for (const step of steps) {
    const hash = step.hash || '';
    lines.push(`| ${step.step} | ${step.ok ? 'ok' : 'fail'} | ${hash} | ${hash ? link(hash) : ''} |`);
    if (step.detail) lines.push(`|  | ${step.detail} |  |  |`);
    if (step.error) lines.push(`|  | ${step.error} |  |  |`);
  }
  lines.push('');
  const appendTitleUsed = appendTitle || (process.env.ENSEMBLE_FINISH === '1' ? 'Funded run' : '');
  if (appendTitleUsed) {
    const rows = [
      '',
      `## ${appendTitleUsed}`,
      '',
      appendTitle
        ? 'Escrow is its own account. Buyer, foundry, shop pay, and the funded over-cap rows above stay.'
        : 'Circle faucet funded the buyer with 20 testnet USDC. The faucet page showed no transaction hash.',
      '',
      '| Step | Result | Tx | Explorer |',
      '| --- | --- | --- | --- |',
    ];
    for (const step of steps) {
      const hash = step.hash || '';
      rows.push(`| ${step.step} | ${step.ok ? 'ok' : 'fail'} | ${hash} | ${hash ? link(hash) : ''} |`);
      if (step.detail) rows.push(`|  | ${step.detail} |  |  |`);
      if (step.error) rows.push(`|  | ${step.error} |  |  |`);
    }
    rows.push('');
    fs.appendFileSync(RECEIPTS, `${rows.join('\n')}\n`);
    return;
  }
  fs.writeFileSync(RECEIPTS, `${lines.join('\n')}\n`);
}

async function main() {
  const suffix = Date.now().toString(36);
  const wanted = {
    buyer: `e1144b${suffix}.testnet`,
    foundry: `e1144f${suffix}.testnet`,
    owner: `e1144c${suffix}.testnet`,
    escrow: `e1144e${suffix}.testnet`,
  };
  const keyStore = new keyStores.InMemoryKeyStore();
  const accounts = {};
  for (const role of ['buyer', 'foundry', 'owner', 'escrow']) {
    try {
      const loaded = await ensureAccount(role, wanted[role]);
      accounts[role] = loaded;
      await keyStore.setKey('testnet', loaded.accountId, loaded.keyPair);
      record(`account ${role}`, { ok: true, detail: loaded.accountId });
    } catch (err) {
      const pub = publicError(err);
      record(`account ${role}`, { ok: false, error: pub.text });
      writeReceipts();
      process.exitCode = 1;
      return;
    }
  }

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: RPC,
    keyStore,
  });
  for (const role of ['buyer', 'foundry', 'owner', 'escrow']) {
    const id = accounts[role].accountId;
    let ready = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await (await near.account(id)).state();
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => { setTimeout(resolve, 1000); });
      }
    }
    if (!ready) {
      record(`account ${role} visible`, { ok: false, error: `${id} was not visible on rpc.testnet.near.org` });
      writeReceipts();
      process.exitCode = 1;
      return;
    }
  }
  const buyer = await near.account(accounts.buyer.accountId);
  const foundry = await near.account(accounts.foundry.accountId);
  const owner = await near.account(accounts.owner.accountId);
  const escrowAccount = await near.account(accounts.escrow.accountId);
  const escrowId = accounts.escrow.accountId;
  const vaultId = accounts.owner.accountId;
  if (process.env.ENSEMBLE_REESCROW === '1') {
    const escrowWasm = process.env.ENSEMBLE_ESCROW_WASM
      || '/tmp/clearing-main/near/escrow/target/wasm32-unknown-unknown/release/clearing_escrow.wasm';
    try {
      const deployed = await escrowAccount.deployContract(fs.readFileSync(escrowWasm));
      record('deploy escrow', { ok: true, hash: deployed.transaction.hash, detail: escrowId });
      const creatorPk = hex(accounts.foundry.keyPair.getPublicKey().data);
      const init = await call(escrowAccount, escrowId, 'new', {
        token_id: USDC,
        arbiter_id: accounts.owner.accountId,
        creator_id: accounts.foundry.accountId,
        creator_pk: creatorPk,
        chain_id: CHAIN_ID,
        min_window_ns: 1_000_000_000,
      }, '100000000000000', '0');
      record('init escrow', { ok: true, hash: init.hash });
      const registered = await call(buyer, USDC, 'storage_deposit', {
        account_id: escrowId,
        registration_only: true,
      }, '30000000000000', STORAGE);
      record('storage escrow', { ok: true, hash: registered.hash });
    } catch (err) {
      const pub = publicError(err);
      record('deploy escrow', { ok: false, hash: pub.hash, error: pub.text });
      writeReceipts('Escrow on its own account');
      process.exitCode = 1;
      return;
    }
    const before = await balanceOf(buyer, accounts.foundry.accountId);
    record('foundry usdc before', { ok: true, detail: before });
    await runEscrow(buyer, foundry, accounts, escrowId);
    const after = await balanceOf(buyer, accounts.foundry.accountId);
    const delta = BigInt(after) - BigInt(before);
    record('foundry usdc after', {
      ok: delta === 1000000n,
      detail: `${before} -> ${after} delta ${delta}`,
      error: delta === 1000000n ? '' : `expected delta 1000000, got ${delta}`,
    });
    writeReceipts('Escrow on its own account');
    say(`receipts ${RECEIPTS}`);
    return;
  }
  if (process.env.ENSEMBLE_FINISH === '1') {
    let buyerUsdc = 'unknown';
    try {
      buyerUsdc = await balanceOf(buyer, accounts.buyer.accountId);
      record('buyer usdc', { ok: true, detail: buyerUsdc });
    } catch (err) {
      const pub = publicError(err);
      record('buyer usdc', { ok: false, error: pub.text });
    }
    if (buyerUsdc === '0' || buyerUsdc === 'unknown') {
      record('escrow', { ok: false, error: `buyer USDC is ${buyerUsdc}` });
      writeReceipts();
      process.exitCode = 1;
      return;
    }
    await runEscrow(buyer, foundry, accounts, escrowId);
    await runRail(buyer, accounts);
    try {
      const funded = await call(buyer, USDC, 'ft_transfer', {
        receiver_id: vaultId,
        amount: '2000000',
        memo: 'ensemble-vault',
      }, '40000000000000', '1');
      record('fund vault', { ok: true, hash: funded.hash, detail: '2000000 to the cap vault' });
    } catch (err) {
      const pub = publicError(err);
      record('fund vault', { ok: false, hash: pub.hash, error: pub.text });
    }
    let before = 'unknown';
    try {
      before = await balanceOf(buyer, vaultId);
      record('cap balance before', { ok: true, detail: before });
    } catch (err) {
      const pub = publicError(err);
      record('cap balance before', { ok: false, error: pub.text });
    }
    try {
      const paid = await call(owner, vaultId, 'pay', {
        receiver_id: accounts.foundry.accountId,
        amount: OVER_CAP,
        memo: 'ensemble-over-cap',
      }, '100000000000000', '0');
      const after = await balanceOf(buyer, vaultId);
      record('over-cap pay funded', {
        ok: false,
        hash: paid.hash,
        error: `pay succeeded unexpectedly. balance before ${before} after ${after}`,
      });
    } catch (err) {
      const pub = publicError(err);
      let after = 'unknown';
      try {
        after = await balanceOf(buyer, vaultId);
      } catch {
        after = 'unread';
      }
      record('over-cap pay funded', {
        ok: pub.text.includes('over per_tx_cap'),
        hash: pub.hash,
        detail: `balance before ${before} after ${after}`,
        error: pub.text,
      });
    }
    writeReceipts();
    say(`receipts ${RECEIPTS}`);
    return;
  }
  const escrowWasm = process.env.ENSEMBLE_ESCROW_WASM
    || '/tmp/clearing-main/near/escrow/target/wasm32-unknown-unknown/release/clearing_escrow.wasm';
  const capWasm = process.env.ENSEMBLE_CAP_WASM
    || '/tmp/clearing-main/near/spend-cap/target/wasm32-unknown-unknown/release/clearing_spend_cap.wasm';

  try {
    const deployed = await escrowAccount.deployContract(fs.readFileSync(escrowWasm));
    record('deploy escrow', { ok: true, hash: deployed.transaction.hash, detail: escrowId });
  } catch (err) {
    const pub = publicError(err);
    record('deploy escrow', { ok: false, hash: pub.hash, error: pub.text });
  }
  try {
    const creatorPk = hex(accounts.foundry.keyPair.getPublicKey().data);
    const init = await call(escrowAccount, escrowId, 'new', {
      token_id: USDC,
      arbiter_id: accounts.owner.accountId,
      creator_id: accounts.foundry.accountId,
      creator_pk: creatorPk,
      chain_id: CHAIN_ID,
      min_window_ns: 1_000_000_000,
    }, '100000000000000', '0');
    record('init escrow', { ok: true, hash: init.hash });
  } catch (err) {
    const pub = publicError(err);
    record('init escrow', { ok: false, hash: pub.hash, error: pub.text });
  }
  try {
    const deployed = await owner.deployContract(fs.readFileSync(capWasm));
    record('deploy cap', { ok: true, hash: deployed.transaction.hash });
  } catch (err) {
    const pub = publicError(err);
    record('deploy cap', { ok: false, hash: pub.hash, error: pub.text });
  }
  try {
    const init = await call(owner, vaultId, 'new', {
      token_id: USDC,
      owner_id: accounts.owner.accountId,
      per_tx_cap: ONE_USDC,
      budget_limit: null,
      budget_period_ns: null,
      cooldown_ns: 0,
      approval_threshold: null,
      max_open_approvals: 4,
    }, '100000000000000', '0');
    record('init cap', { ok: true, hash: init.hash });
  } catch (err) {
    const pub = publicError(err);
    record('init cap', { ok: false, hash: pub.hash, error: pub.text });
  }

  for (const id of [accounts.buyer.accountId, accounts.foundry.accountId, escrowId, vaultId]) {
    try {
      const registered = await call(buyer, USDC, 'storage_deposit', {
        account_id: id,
        registration_only: true,
      }, '30000000000000', STORAGE);
      record(`storage ${id}`, { ok: true, hash: registered.hash });
    } catch (err) {
      const pub = publicError(err);
      record(`storage ${id}`, { ok: false, hash: pub.hash, error: pub.text });
    }
  }

  let buyerUsdc = 'unknown';
  try {
    buyerUsdc = await balanceOf(buyer, accounts.buyer.accountId);
    record('buyer usdc', { ok: true, detail: buyerUsdc });
  } catch (err) {
    const pub = publicError(err);
    record('buyer usdc', { ok: false, error: pub.text });
  }

  if (buyerUsdc === '0' || buyerUsdc === 'unknown') {
    record('escrow', {
      ok: false,
      error: 'buyer has no testnet USDC. Circle faucet.circle.com is captcha-gated (#1148). No USDC was moved.',
    });
    record('rail pay', {
      ok: false,
      error: 'skipped. The buyer has no testnet USDC to send through the direct rail.',
    });
  } else {
    await runEscrow(buyer, foundry, accounts, escrowId);
    await runRail(buyer, accounts);
  }

  let before = 'unknown';
  try {
    before = await balanceOf(buyer, vaultId);
  } catch (err) {
    const pub = publicError(err);
    record('cap balance before', { ok: false, error: pub.text });
  }
  try {
    await call(owner, vaultId, 'pay', {
      receiver_id: accounts.foundry.accountId,
      amount: OVER_CAP,
      memo: 'ensemble-over-cap',
    }, '100000000000000', '0');
    const after = await balanceOf(buyer, vaultId);
    record('over-cap pay', {
      ok: false,
      error: `pay succeeded unexpectedly. balance before ${before} after ${after}`,
    });
  } catch (err) {
    const pub = publicError(err);
    let after = 'unknown';
    try {
      after = await balanceOf(buyer, vaultId);
    } catch {
      after = 'unread';
    }
    const rejected = pub.text.includes('over per_tx_cap');
    record('over-cap pay', {
      ok: rejected,
      hash: pub.hash,
      detail: `balance before ${before} after ${after}`,
      error: rejected ? '' : pub.text,
    });
  }

  writeReceipts();
  say(`receipts ${RECEIPTS}`);
}

async function runEscrow(buyer, foundry, accounts, escrowId) {
  const clientPk = hex(accounts.buyer.keyPair.getPublicKey().data);
  const payload = JSON.stringify({
    client_pk: clientPk,
    price: ONE_USDC,
    deliver_ns: WINDOW_NS,
    review_ns: WINDOW_NS,
    dispute_ns: WINDOW_NS,
    fund_ns: WINDOW_NS,
  });
  const openNonce = nonce();
  const openMessage = `escrow-v1|${CHAIN_ID}|${escrowId}|0|open|${openNonce}|${payload}`;
  const openSig = hex(accounts.foundry.keyPair.sign(Buffer.from(openMessage)).signature);
  let dealId;
  try {
    const opened = await call(foundry, escrowId, 'open', {
      payload,
      nonce: openNonce,
      signature: openSig,
    }, '80000000000000', '0');
    dealId = opened.value;
    record('escrow open', { ok: true, hash: opened.hash, detail: `deal ${dealId}` });
  } catch (err) {
    const pub = publicError(err);
    record('escrow open', { ok: false, hash: pub.hash, error: pub.text });
    return;
  }
  try {
    const funded = await call(buyer, USDC, 'ft_transfer_call', {
      receiver_id: escrowId,
      amount: ONE_USDC,
      memo: 'ensemble-escrow',
      msg: JSON.stringify({ deal_id: dealId }),
    }, '80000000000000', '1');
    record('escrow fund', { ok: true, hash: funded.hash });
  } catch (err) {
    const pub = publicError(err);
    record('escrow fund', { ok: false, hash: pub.hash, error: pub.text });
    return;
  }
  const deliverNonce = nonce();
  const deliverPayload = 'ensemble-deliverable';
  const deliverMessage = `escrow-v1|${CHAIN_ID}|${escrowId}|${dealId}|deliver|${deliverNonce}|${deliverPayload}`;
  const deliverSig = hex(accounts.foundry.keyPair.sign(Buffer.from(deliverMessage)).signature);
  try {
    const delivered = await call(foundry, escrowId, 'deliver', {
      deal_id: dealId,
      nonce: deliverNonce,
      payload: deliverPayload,
      signature: deliverSig,
    }, '80000000000000', '0');
    record('escrow deliver', { ok: true, hash: delivered.hash });
  } catch (err) {
    const pub = publicError(err);
    record('escrow deliver', { ok: false, hash: pub.hash, error: pub.text });
    return;
  }
  const acceptNonce = nonce();
  const acceptMessage = `escrow-v1|${CHAIN_ID}|${escrowId}|${dealId}|accept|${acceptNonce}|`;
  const acceptSig = hex(accounts.buyer.keyPair.sign(Buffer.from(acceptMessage)).signature);
  try {
    const accepted = await call(buyer, escrowId, 'accept', {
      deal_id: dealId,
      nonce: acceptNonce,
      signature: acceptSig,
    }, '80000000000000', '0');
    record('escrow accept', { ok: true, hash: accepted.hash });
  } catch (err) {
    const pub = publicError(err);
    record('escrow accept', { ok: false, hash: pub.hash, error: pub.text });
    return;
  }
  try {
    const withdrawn = await call(foundry, escrowId, 'withdraw', {}, '100000000000000', '0');
    const proof = await usdcReceipt(withdrawn.hash, accounts.foundry.accountId);
    if (proof.failure || !proof.tokenSuccess) {
      record('escrow withdraw', {
        ok: false,
        hash: withdrawn.hash,
        error: proof.failure || 'token receipt was not SuccessValue',
      });
      return;
    }
    record('escrow withdraw', { ok: true, hash: withdrawn.hash, detail: 'token receipt SuccessValue' });
  } catch (err) {
    const pub = publicError(err);
    record('escrow withdraw', { ok: false, hash: pub.hash, error: pub.text });
  }
}

async function runRail(buyer, accounts) {
  try {
    const paid = await call(buyer, USDC, 'ft_transfer', {
      receiver_id: accounts.foundry.accountId,
      amount: RAIL_USDC,
      memo: 'ensemble-rail',
    }, '40000000000000', '1');
    record('rail pay', { ok: true, hash: paid.hash, detail: `${RAIL_USDC} to ${accounts.foundry.accountId}` });
  } catch (err) {
    const pub = publicError(err);
    record('rail pay', { ok: false, hash: pub.hash, error: pub.text });
  }
}

main().catch((err) => {
  const pub = publicError(err);
  record('script', { ok: false, hash: pub.hash, error: pub.text });
  writeReceipts();
  process.exitCode = 1;
});
