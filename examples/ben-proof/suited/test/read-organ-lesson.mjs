import fs from 'node:fs';
import path from 'node:path';

/** Lesson text for a wear task id on a repertoire signal (organ write path). */
export function readOrganLessonText(root, taskId, signalName = 'attestation-as-map') {
  const curatedPath = path.join(root, '.xray/state/repertoire/curated_signals.json');
  const data = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  const signal = (data.signals ?? []).find((s) => s.name === signalName);
  const hit = (signal?.lessons ?? []).find((l) => l.taskId === taskId);
  return typeof hit?.text === 'string' ? hit.text : null;
}
