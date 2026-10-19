#!/usr/bin/env node
/**
 * Dev-only. Writes scripts/foundry/shipped-skill-blobs.json: every git blob of
 * src/skills/<name>/SKILL.md shipped in a v4.* tag (plus untagged release
 * commits) since v4.0.0, for skills whose body changed. Wear reads only the
 * JSON, never git or npm.
 *   node scripts/mjs/gen-shipped-skill-blobs.mjs [--fixtures <dir>]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
// 4.0.32 shipped without a tag.
const UNTAGGED_RELEASES = [["4.0.32", "683da7e15"]];
const tags = git("tag", "-l", "v4.*")
  .split("\n")
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const refs = [
  ...tags.map((tag) => [tag.slice(1), tag]),
  ...UNTAGGED_RELEASES,
  ["HEAD", "HEAD"],
];
const skills = readdirSync("src/skills");
const out = { generatedFrom: "v4.0.0..HEAD", skills: {} };
for (const name of skills.sort()) {
  const seen = new Map();
  for (const [version, ref] of refs) {
    let blob = "";
    try {
      blob = git("rev-parse", "-q", "--verify", `${ref}:src/skills/${name}/SKILL.md`);
    } catch {
      continue;
    }
    if (!seen.has(blob)) seen.set(blob, version);
  }
  const shipped = [...seen].filter(([, v]) => v !== "HEAD");
  if (shipped.length < 2) continue;
  out.skills[name] = shipped.map(([blob, since]) => ({ blob, since }));
}
writeFileSync("scripts/foundry/shipped-skill-blobs.json", `${JSON.stringify(out, null, 2)}\n`);
const fx = process.argv.indexOf("--fixtures");
if (fx > 0) {
  for (const [name, list] of Object.entries(out.skills)) {
    const dir = path.join(process.argv[fx + 1], name);
    mkdirSync(dir, { recursive: true });
    for (const { blob, since } of list) {
      writeFileSync(path.join(dir, `${since}-${blob.slice(0, 9)}.md`), execFileSync("git", ["cat-file", "blob", blob]));
    }
  }
}
for (const [name, list] of Object.entries(out.skills)) console.log(name, list.length);
