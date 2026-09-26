#!/usr/bin/env node
import { getOrgan } from '../lib/organ.mjs';
import { lessonLinesForIntent } from '../lib/lesson-speech.mjs';
import { recallPlateForIntent } from '../lib/plates-runtime.mjs';

function taskFromArgv() {
  const arg = process.argv.slice(2).join(' ').trim();
  if (!arg) {
    process.stderr.write('usage: node bin/recall.mjs "<task>"\n');
    process.exit(1);
  }
  return arg;
}

const task = taskFromArgv();
const organ = getOrgan();

if (!organ.isAvailable()) {
  process.stderr.write(`repertoire unavailable: ${JSON.stringify(organ.getAvailabilityStatus())}\n`);
  process.exit(1);
}

const { matchedSignals, lessons, speech } = lessonLinesForIntent(organ, task);
const plate = recallPlateForIntent(task);

process.stdout.write(
  `${JSON.stringify(
    {
      subsystem: 'recall',
      matchedSignals,
      lessons,
      speech,
      plate: plate ? { id: plate.id, bodyChars: String(plate.body || '').length } : null,
    },
    null,
    2,
  )}\n`,
);

if (lessons.length === 0) {
  process.exit(2);
}
