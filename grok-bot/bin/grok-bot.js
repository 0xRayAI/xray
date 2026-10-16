#!/usr/bin/env node
'use strict';

const { runDoctorCli } = require('../lib/seat-doctor.cjs');

process.exitCode = runDoctorCli(process.argv.slice(2));
