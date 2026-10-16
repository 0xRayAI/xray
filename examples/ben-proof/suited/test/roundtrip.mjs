import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { assertNoBakedBenchToken } from './assert-no-baked-token.mjs';
import { readOrganLessonText } from './read-organ-lesson.mjs';

const ROOT = join(import.meta.dirname, '..');
const TASK =
  'TYPE: ontological-trap attestation-as-map consumer-boundary revalidation required';
const sessionId = `roundtrip-${Date.now()}`;

assertNoBakedBenchToken(ROOT, {
  skip: [join(ROOT, 'test/assert-no-baked-token.mjs')],
});

const wear = spawnSync(process.execPath, [join(ROOT, 'bin/wear.mjs'), TASK], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, RECALL_BENCH_SESSION: sessionId },
});
if (wear.status !== 0) {
  process.stderr.write(wear.stderr || wear.stdout);
  process.exit(wear.status ?? 1);
}

const wearBody = JSON.parse(wear.stdout);
const taskId = `wear:${sessionId}`;
const stored = readOrganLessonText(ROOT, taskId);
if (!stored || stored !== `The bench token for this run is ${wearBody.benchToken}`) {
  process.stderr.write(`expected organ lesson after wear, got ${JSON.stringify(stored)}\n`);
  process.exit(1);
}

const recall = spawnSync(process.execPath, [join(ROOT, 'bin/recall.mjs'), TASK], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (recall.status !== 0) {
  process.stderr.write(recall.stderr || recall.stdout);
  process.exit(recall.status ?? 1);
}

const body = JSON.parse(recall.stdout);
if (!body.lessons?.includes(stored)) {
  process.stderr.write(
    `recall did not return organ-stored lesson; stored=${JSON.stringify(stored)} lessons=${JSON.stringify(body.lessons)}\n`,
  );
  process.exit(1);
}
if (!Array.isArray(body.speech) || body.speech.length === 0) {
  process.stderr.write(`expected speech lines from lesson-speech, got ${JSON.stringify(body.speech)}\n`);
  process.exit(1);
}

process.stdout.write(`ok: wear→recall roundtrip (${stored})\n`);
