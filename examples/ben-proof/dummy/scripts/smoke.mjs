import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const lessonsPath = join(root, "data", "lessons.jsonl");

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed (${code}): ${stderr || stdout}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function lessonLines(raw) {
  return raw.split("\n").filter((line) => line.trim().length > 0);
}

async function main() {
  const check = await runNode(join(root, "scripts", "check-no-baked-token.mjs"));
  const checkJson = JSON.parse(check.stdout.trim());
  if (!checkJson.ok) {
    throw new Error("Baked bench token detected in sources");
  }

  let beforeRaw;
  try {
    beforeRaw = await readFile(lessonsPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(
        "Survival check requires an existing lesson in data/lessons.jsonl; smoke must not mint one",
      );
    }
    throw error;
  }

  const beforeLines = lessonLines(beforeRaw);
  if (!beforeLines.length) {
    throw new Error(
      "Survival check requires an existing lesson in data/lessons.jsonl; smoke must not mint one",
    );
  }

  const stored = JSON.parse(beforeLines[beforeLines.length - 1]);
  if (typeof stored.benchToken !== "string" || !stored.benchToken) {
    throw new Error("Last stored lesson has no bench token");
  }

  const recall = await runNode(join(root, "src", "cli", "recall.js"));
  const printedToken = recall.stdout.trim().split("\n").filter(Boolean).pop();

  const afterRaw = await readFile(lessonsPath, "utf8");
  const afterLines = lessonLines(afterRaw);
  if (afterRaw !== beforeRaw || afterLines.length !== beforeLines.length) {
    throw new Error(
      `Recall created a lesson: line count ${beforeLines.length} -> ${afterLines.length}`,
    );
  }

  if (printedToken !== stored.benchToken) {
    throw new Error(
      `Recall token does not match last stored token (printed ${printedToken}, stored ${stored.benchToken})`,
    );
  }

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      smoke: "passed",
      benchToken: stored.benchToken,
      lessonId: stored.lessonId,
      lineCountBefore: beforeLines.length,
      lineCountAfter: afterLines.length,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
  process.exit(1);
});
