#!/usr/bin/env node
/**
 * Dev-only. Writes scripts/foundry/shipped-skill-blobs.json: every git blob of
 * src/skills/<name>/SKILL.md shipped in a v4.* tag (plus untagged release
 * commits) since v4.0.0, for skills whose body changed. Agent entries are the
 * stale bodies of catalog and plant agents, excluding the current file. Wear
 * reads only the JSON, never git or npm.
 *   node scripts/mjs/gen-shipped-skill-blobs.mjs [--fixtures <dir>]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
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
const agentDirs = ["src/opencode/agents", ".opencode/agents", "scripts/foundry/plant/agents"];
const agentNames = new Set();
for (const [, ref] of refs) {
  for (const dir of agentDirs) {
    let listed = "";
    try {
      listed = git("ls-tree", "--name-only", `${ref}:${dir}`);
    } catch {
      continue;
    }
    for (const line of listed.split("\n")) {
      if (line.endsWith(".yml") || line.endsWith(".yaml")) agentNames.add(line);
    }
  }
}
out.agents = {};
for (const name of [...agentNames].sort()) {
  const seen = new Map();
  for (const [version, ref] of refs) {
    let blob = "";
    for (const dir of agentDirs) {
      try {
        blob = git("rev-parse", "-q", "--verify", `${ref}:${dir}/${name}`);
        break;
      } catch {
        /* this dir has no such agent at this ref */
      }
    }
    if (blob && !seen.has(blob)) seen.set(blob, version);
  }
  const shipped = [...seen].filter(([, version]) => version !== "HEAD");
  if (shipped.length < 2) continue;
  let current = "";
  for (const dir of agentDirs) {
    try {
      current = git("rev-parse", "-q", "--verify", `HEAD:${dir}/${name}`);
      break;
    } catch {
      /* not in this dir at HEAD */
    }
  }
  const stale = shipped.filter(([blob]) => blob !== current);
  if (stale.length === 0) continue;
  out.agents[name] = stale.map(([blob, since]) => ({ blob, since }));
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
for (const [name, list] of Object.entries(out.agents)) console.log("agent", name, list.length);
