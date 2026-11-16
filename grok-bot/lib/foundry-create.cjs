'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { installNearMill } = require('./near-mill.cjs');

// mintAfterWear only re-applies the mill plant overlay
// (src/cli/commands/foundry-mint-wear.ts). This step records the foundry the
// person earns with. The shop config and the NEAR receiver come from
// near-mill, which seats the account through near-seat.
// Plan: house/dist/mill/near-first-build-eval-2026-11.md (b) and section 3.3.
function foundryRecordPath(dest) {
  return path.join(dest, '.xray', 'state', 'foundry.json');
}

function foundryIdOf(value) {
  if (typeof value !== 'string') return '';
  const id = value.trim();
  if (id.length === 0 || /[\r\n]/.test(id)) return '';
  return id;
}

async function createFoundry(opts = {}) {
  const foundryId = foundryIdOf(opts.foundryId);
  if (!foundryId) throw new Error('foundryId is required');
  const installed = await installNearMill(opts);
  const receiver = installed.seated && installed.seated.accountId;
  if (typeof receiver !== 'string' || receiver.length === 0) throw new Error('NEAR receiver missing');
  const kitRoot = opts.kitRoot || path.resolve(__dirname, '..');
  const skillSrc = path.join(kitRoot, 'skills', 'foundry-create', 'SKILL.md');
  const skillTarget = path.join(opts.dest, 'skills', 'foundry-create', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillTarget), { recursive: true });
  fs.copyFileSync(skillSrc, skillTarget);
  const record = {
    id: foundryId,
    receiver,
    network: 'near:testnet',
    shop: {
      hangar: installed.manifest.groover.hangar,
      steps: installed.manifest.groover.steps,
      accepts: installed.manifest.accepts,
    },
  };
  const foundryPath = foundryRecordPath(opts.dest);
  fs.mkdirSync(path.dirname(foundryPath), { recursive: true });
  fs.writeFileSync(foundryPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o644 });
  const line = `Foundry: ${record.id} — receiver ${record.receiver}`;
  if (typeof opts.log === 'function') opts.log(line);
  if (opts.stdout && typeof opts.stdout.write === 'function') opts.stdout.write(`${line}\n`);
  return {
    dest: installed.dest,
    seatHome: installed.seatHome,
    seatId: installed.seatId,
    foundryId,
    receiver,
    foundryPath,
    record,
    npmPublish: false,
  };
}

module.exports = {
  createFoundry,
  foundryRecordPath,
};
