import { runIntake } from "../intake/run-intake.js";

const summary =
  process.argv.slice(2).join(" ") ||
  "Governance precedes action: pre-check matrix, processor pipeline, then durable lesson line.";

runIntake({ summary })
  .then((record) => {
    process.stdout.write(`${JSON.stringify({ ok: true, lessonId: record.lessonId, benchToken: record.benchToken })}\n`);
  })
  .catch((error) => {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`,
    );
    process.exitCode = 1;
  });
