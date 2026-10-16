import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcRoot = join(root, "src");

const BAKED_PATTERN = /bench-[0-9a-f]{16,}/i;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) files.push(full);
  }
  return files;
}

const files = await walk(srcRoot);
const violations = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  if (BAKED_PATTERN.test(text)) {
    violations.push(file);
  }
}

if (violations.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, violations })}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ ok: true, scanned: files.length })}\n`);
