#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);
if (args[0] === 'range') {
  import('../lib/pulsar-game.mjs')
    .then((mod) => {
      process.exitCode = mod.runRangeCli(args.slice(1));
    })
    .catch(() => {
      process.stderr.write('The range is closed.\n');
      process.exitCode = 2;
    });
} else if (args[0] === 'bifrost') {
  const { runBifrostCli } = require('../lib/bifrost-cli.cjs');
  process.exitCode = runBifrostCli(args.slice(1));
} else if (args[0] === 'live-inbox' || args[0] === 'exit-gate') {
  const { runKitTool } = require('../lib/kit-tools.cjs');
  process.exitCode = runKitTool(args[0], args.slice(1));
} else if (args[0] === 'foundry-create') {
  const { runFoundryCreateCli } = require('../lib/foundry-create.cjs');
  runFoundryCreateCli(args.slice(1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
} else if (args[0] === 'near-status') {
  const { runNearStatusCli } = require('../lib/seat-doctor.cjs');
  process.exitCode = runNearStatusCli(args.slice(1));
} else if (args[0] === 'near-pay') {
  const { runNearPayCli } = require('../lib/near-pay.cjs');
  runNearPayCli(args.slice(1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
} else if (args[0] === 'near-cap') {
  const { runNearCapCli } = require('../lib/near-cap.cjs');
  runNearCapCli(args.slice(1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
} else if (args[0] === 'near-escrow') {
  const { runNearEscrowCli } = require('../lib/near-escrow.cjs');
  runNearEscrowCli(args.slice(1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
} else if (args[0] === 'hangar-list') {
  const { runHangarListCli } = require('../lib/hangar-list.cjs');
  runHangarListCli(args.slice(1))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
} else {
  const { runDoctorCli } = require('../lib/seat-doctor.cjs');
  process.exitCode = runDoctorCli(args);
}
