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
} else {
  const { runDoctorCli } = require('../lib/seat-doctor.cjs');
  process.exitCode = runDoctorCli(args);
}
