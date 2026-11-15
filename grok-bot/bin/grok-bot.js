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
} else {
  const { runDoctorCli } = require('../lib/seat-doctor.cjs');
  process.exitCode = runDoctorCli(args);
}
