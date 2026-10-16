import { recallLatestLesson } from "../recall/recall-lesson.js";

// Read-only. Prints the last stored bench token. Does not mint or append.
recallLatestLesson()
  .then((lesson) => {
    process.stdout.write(`${lesson.benchToken}\n`);
  })
  .catch((error) => {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`,
    );
    process.exitCode = 1;
  });
