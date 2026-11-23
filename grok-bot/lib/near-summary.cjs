'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Public transaction page on the same host near-pay.cjs already calls
// (api-testnet.nearblocks.io). The CLI's own URL wins when it prints one.
// This repo does not vendor near-cli-rs, so a missing CLI URL uses this page.
const NEARBLOCKS_TX = 'https://testnet.nearblocks.io/txns/';
const TX_ID = /[1-9A-HJ-NP-Za-km-z]{32,64}/;
const TX_LABEL = /(?:Transaction ID|transaction hash|Txn hash)\s*[:=]\s*([1-9A-HJ-NP-Za-km-z]{32,64})/gi;
const TX_URL = /https?:\/\/[^\s)]+\/(?:txns|transactions)\/([1-9A-HJ-NP-Za-km-z]{32,64})/gi;
const GAS_LINE = /^[ \t]*(?:Gas burnt|Total gas burnt|Gas used).*$/gim;
const FEE_LINE = /^[ \t]*(?:Tokens burnt|Transaction fee|Total fee|Fee:).*$/gim;
const SECRET_FIELD = /private_key|secret_key|secret_keypair|seed_phrase|master_seed_phrase/i;

function yoctoToNear(amount) {
  const raw = String(amount == null ? '' : amount).trim();
  if (!/^\d+$/.test(raw)) return null;
  const whole = raw.length > 24 ? raw.slice(0, -24).replace(/^0+(?=\d)/, '') : '0';
  const fracRaw = raw.padStart(24, '0').slice(-24).replace(/0+$/, '');
  const shownWhole = whole.length > 0 ? whole : '0';
  return fracRaw ? `${shownWhole}.${fracRaw}` : shownWhole;
}

function uniquePush(list, id) {
  if (!TX_ID.test(id)) return;
  if (!list.includes(id)) list.push(id);
}

function parseTransactions(text) {
  const raw = String(text == null ? '' : text);
  const ids = [];
  const urls = new Map();
  for (const match of raw.matchAll(TX_LABEL)) uniquePush(ids, match[1]);
  for (const match of raw.matchAll(TX_URL)) {
    uniquePush(ids, match[1]);
    if (!urls.has(match[1])) urls.set(match[1], match[0]);
  }
  const gas = [...raw.matchAll(GAS_LINE)].map((match) => match[0].trim());
  const fees = [...raw.matchAll(FEE_LINE)].map((match) => match[0].trim());
  return ids.map((id) => ({
    id,
    explorer: urls.get(id) || `${NEARBLOCKS_TX}${id}`,
    explorerSource: urls.has(id) ? 'cli' : 'nearblocks',
    gas,
    fees,
  }));
}

function scrubString(value, secrets) {
  let out = String(value == null ? '' : value);
  for (const secret of secrets || []) {
    if (typeof secret === 'string' && secret.length > 0) out = out.split(secret).join('[redacted]');
  }
  if (SECRET_FIELD.test(out)) return '[redacted]';
  return out;
}

function describeKey(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const access = entry.access_key && typeof entry.access_key === 'object' ? entry.access_key : entry;
  const permission = access.permission;
  if (!permission || typeof permission !== 'object') return null;
  if (permission === 'FullAccess' || permission.FullAccess != null) {
    return { permission: 'FullAccess' };
  }
  const call = permission.FunctionCall || permission.function_call;
  if (!call || typeof call !== 'object') return null;
  const names = call.method_names || call.methodNames;
  const allowance = call.allowance == null ? null : yoctoToNear(call.allowance);
  return {
    permission: 'FunctionCall',
    allowanceNear: allowance,
    allowanceYocto: typeof call.allowance === 'string' ? call.allowance : null,
    receiverId: typeof call.receiver_id === 'string' ? call.receiver_id : (typeof call.receiverId === 'string' ? call.receiverId : null),
    methodNames: Array.isArray(names) ? names.filter((name) => typeof name === 'string') : [],
  };
}

function keyLines(keys) {
  return (Array.isArray(keys) ? keys : []).map(describeKey).filter(Boolean);
}

function txBlock(action, txs) {
  return {
    action,
    transactions: txs.map((tx) => ({
      id: tx.id,
      explorer: tx.explorer,
      explorerSource: tx.explorerSource,
    })),
    gas: txs.length > 0 ? txs[0].gas : [],
    fees: txs.length > 0 ? txs[0].fees : [],
  };
}

function buildNearSummary(input = {}) {
  const secrets = Array.isArray(input.secrets) ? input.secrets : [];
  const createTx = parseTransactions(scrubString(input.createText, secrets));
  const grantTx = parseTransactions(scrubString(input.grantText, secrets));
  const balanceNear = input.balanceYocto == null ? null : yoctoToNear(input.balanceYocto);
  const listed = keyLines(input.accessKeys);
  const granted = input.addedKey === true;
  const allowance = typeof input.allowance === 'string' && input.allowance.trim() ? input.allowance.trim() : null;
  const methods = typeof input.methodNames === 'string'
    ? input.methodNames.split(',').map((name) => name.trim()).filter(Boolean)
    : [];
  return {
    version: 1,
    network: 'testnet',
    accountId: typeof input.accountId === 'string' ? input.accountId : '',
    foundryId: typeof input.foundryId === 'string' && input.foundryId ? input.foundryId : null,
    seat: typeof input.seat === 'string' ? input.seat : '',
    balanceYocto: input.balanceYocto == null ? null : String(input.balanceYocto),
    balanceNear,
    createdThisRun: input.createdThisRun === true,
    addedKey: granted,
    allowance,
    contractId: typeof input.contractId === 'string' ? input.contractId : null,
    methodNames: methods,
    transactions: [
      txBlock(input.createdThisRun === true ? 'create-account' : 'create-account-skipped', createTx),
      txBlock(granted ? 'add-function-call-key' : 'function-call-key-not-added', grantTx),
    ],
    keys: [
      { permission: 'FullAccess', stored: 'seat state near-cold, mode 0600' },
      ...listed,
      ...(granted ? [{
        permission: 'FunctionCall',
        allowance,
        receiverId: typeof input.contractId === 'string' ? input.contractId : null,
        methodNames: methods,
        source: 'grant-function-call-access',
      }] : []),
    ],
    verified: Array.isArray(input.verified) ? input.verified.filter((line) => typeof line === 'string') : [],
    pending: {
      listing: 'pending',
      pay: 'pending',
      cap: 'pending',
      escrow: 'pending',
    },
    credentials: input.credentials && typeof input.credentials === 'object'
      ? { files: Number(input.credentials.files) || 0, dirs: Number(input.credentials.dirs) || 0 }
      : { files: 0, dirs: 0 },
  };
}

function pendingLine(label, value) {
  if (!value || value === 'pending') return `${label}: pending`;
  return `${label}: ${value}`;
}

function txLines(block) {
  const lines = [];
  if (!block || !Array.isArray(block.transactions) || block.transactions.length === 0) {
    if (block && block.action === 'create-account-skipped') {
      lines.push('- create-account: not run this time (account already on disk)');
    } else if (block && block.action === 'function-call-key-not-added') {
      lines.push('- function-call key: not added this time');
    } else {
      lines.push(`- ${block && block.action ? block.action : 'transaction'}: no transaction id in the CLI output`);
    }
    return lines;
  }
  for (const tx of block.transactions) {
    lines.push(`- ${block.action}: ${tx.id}`);
    lines.push(`  ${tx.explorer}`);
  }
  return lines;
}

function formatNearSummary(summary) {
  if (!summary || typeof summary !== 'object') return 'Receipt: pending\n';
  const pending = summary.pending && typeof summary.pending === 'object' ? summary.pending : {};
  const txs = Array.isArray(summary.transactions) ? summary.transactions : [];
  const gas = [];
  const fees = [];
  for (const block of txs) {
    for (const line of block.gas || []) gas.push(line);
    for (const line of block.fees || []) fees.push(line);
  }
  const lines = [
    'NEAR summary',
    `Account: ${summary.accountId || 'pending'}`,
    `Foundry: ${summary.foundryId || 'pending'}`,
    `Seat: ${summary.seat || 'pending'}`,
    'Network: testnet',
    '',
    'Transactions',
    ...txs.flatMap((block) => txLines(block)),
    '',
    'Amounts',
    summary.balanceNear
      ? `- Account balance after create: ${summary.balanceNear} NEAR (view_account)`
      : '- Account balance after create: not reported',
    '- Faucet funding: not itemized. The balance above is view_account after create, not a separate faucet line.',
    summary.allowance
      ? `- Function-call key allowance: ${summary.allowance}`
      : '- Function-call key allowance: not granted this run',
    gas.length > 0 ? `- Gas used: ${gas.join('; ')}` : '- Gas used: not reported by the CLI',
    fees.length > 0 ? `- Fees: ${fees.join('; ')}` : '- Fees: not reported by the CLI',
    '',
    'Keys',
    '- Full-access key: sealed in the seat state at mode 0600. Not printed.',
  ];
  const calls = (Array.isArray(summary.keys) ? summary.keys : []).filter((key) => key && key.permission === 'FunctionCall');
  if (calls.length === 0) {
    lines.push('- Function-call key: none recorded this run. No key material printed.');
  } else {
    for (const key of calls) {
      const methods = Array.isArray(key.methodNames) && key.methodNames.length > 0 ? key.methodNames.join(',') : 'unlisted';
      const allowance = key.allowance || (key.allowanceNear ? `${key.allowanceNear} NEAR` : 'unlisted');
      const receiver = key.receiverId || 'unlisted';
      lines.push(`- Function-call key: allowance ${allowance}, contract ${receiver}, methods ${methods}. No key material printed.`);
    }
  }
  const creds = summary.credentials || {};
  lines.push(`- ~/.near-credentials: ${creds.files || 0} files at mode 0600, ${creds.dirs || 0} directories at mode 0700. Not deleted.`);
  lines.push('');
  lines.push('Verified');
  const verified = Array.isArray(summary.verified) && summary.verified.length > 0
    ? summary.verified
    : ['nothing extra was recorded'];
  for (const line of verified) lines.push(`- ${line}`);
  lines.push('');
  lines.push('Pending');
  lines.push(`- ${pendingLine('Listing', pending.listing)}`);
  lines.push(`- ${pendingLine('Pay', pending.pay)}`);
  lines.push(`- ${pendingLine('Cap', pending.cap)}`);
  lines.push(`- ${pendingLine('Escrow', pending.escrow)}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function summaryFile(seatHome) {
  return path.join(seatHome, 'near', 'summary.json');
}

function assertNoSecrets(text, secrets) {
  const body = String(text);
  if (SECRET_FIELD.test(body)) throw new Error('NEAR summary refused a secret field');
  for (const secret of secrets || []) {
    if (typeof secret === 'string' && secret.length > 0 && body.includes(secret)) {
      throw new Error('NEAR summary refused a secret value');
    }
  }
}

function writeNearSummary(seatHome, summary, secrets) {
  const body = `${JSON.stringify(summary, null, 2)}\n`;
  assertNoSecrets(body, secrets);
  assertNoSecrets(formatNearSummary(summary), secrets);
  fs.mkdirSync(path.join(seatHome, 'near'), { recursive: true, mode: 0o700 });
  const dest = summaryFile(seatHome);
  const tmp = `${dest}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_WRONLY, 0o600);
  try {
    fs.writeFileSync(fd, body);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, dest);
  fs.chmodSync(dest, 0o600);
  return dest;
}

function readNearSummaryFile(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

function loadNearSummary(cwd) {
  const seats = path.join(cwd, '.xray', 'state', 'seats');
  if (!fs.existsSync(seats)) return null;
  let names = [];
  try {
    names = fs.readdirSync(seats);
  } catch {
    return null;
  }
  for (const name of names) {
    const data = readNearSummaryFile(path.join(seats, name, 'near', 'summary.json'));
    if (data) return data;
  }
  return null;
}

function applyLivePending(summary, report) {
  const next = {
    ...summary,
    pending: { ...(summary.pending || {}) },
  };
  if (report && report.foundry && report.foundry.present && report.foundry.id) next.foundryId = report.foundry.id;
  if (report && report.near && report.near.present && report.near.accountId) next.accountId = report.near.accountId;
  const listing = report && report.foundry && report.foundry.listingId ? report.foundry.listingId : 'pending';
  next.pending.listing = listing;
  const rail = report && report.rail ? report.rail : {};
  next.pending.pay = railLine(rail.pay);
  next.pending.cap = railLine(rail.cap);
  next.pending.escrow = railLine(rail.escrow);
  return next;
}

function railLine(row) {
  if (!row || typeof row.account !== 'string' || !row.account) return 'pending';
  if (typeof row.contract !== 'string' || !row.contract) return 'pending';
  if (typeof row.lastTx !== 'string' || !row.lastTx) return 'pending';
  return `${row.account} contract ${row.contract} tx ${row.lastTx}`;
}

module.exports = {
  NEARBLOCKS_TX,
  yoctoToNear,
  parseTransactions,
  describeKey,
  buildNearSummary,
  formatNearSummary,
  summaryFile,
  writeNearSummary,
  loadNearSummary,
  applyLivePending,
  assertNoSecrets,
};
