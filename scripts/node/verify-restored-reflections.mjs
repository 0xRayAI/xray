#!/usr/bin/env node
/**
 * Re-derive every restored-reflection manifest row from git.
 * Exit non-zero when a file is missing or any byte, hash, parent, or duplicate mark disagrees.
 *
 *   git show <source>:<path> | sha256
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const manifestPath = path.join(root, "docs/reflections/restored/MANIFEST.md");

function fail(messages) {
  for (const message of messages) process.stderr.write(`${message}\n`);
  process.stderr.write(`verify-restored-reflections: ${messages.length} mismatch(es)\n`);
  process.exit(1);
}

function parseManifest(markdown) {
  const rows = [];
  let started = false;
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) {
      if (started) break;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 7) continue;
    if (cells[0] === "Original path") {
      started = true;
      continue;
    }
    if (!started || cells[0].startsWith("---")) continue;
    rows.push({
      path: cells[0],
      deletingSha: cells[1],
      deletingDate: cells[2],
      sourceSha: cells[3],
      bytes: Number(cells[4]),
      sha256: cells[5],
      duplicate: cells[6],
    });
  }
  return rows;
}

function gitShow(spec) {
  return execFileSync("git", ["show", spec], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function expectedDuplicate(pathName, byHash, digest) {
  const others = (byHash.get(digest) ?? []).filter((candidate) => candidate !== pathName);
  if (others.length === 0) return "unique";
  return `duplicate of ${others.join("; ")}`;
}

function laterDeletion(left, right) {
  const leftTime = Date.parse(left.deletingDate);
  const rightTime = Date.parse(right.deletingDate);
  if (leftTime !== rightTime) return leftTime > rightTime;
  return left.deletingSha > right.deletingSha;
}

function archiveRelative(row, rows) {
  let latest = row;
  for (const candidate of rows) {
    if (candidate.path !== row.path) continue;
    if (laterDeletion(candidate, latest)) latest = candidate;
  }
  if (row.deletingSha === latest.deletingSha) return row.path;
  return `${row.path}.${row.deletingSha.slice(0, 7)}`;
}

const markdown = readFileSync(manifestPath, "utf8");
const rows = parseManifest(markdown);
if (rows.length === 0) fail(["manifest table has no rows"]);

const errors = [];
const derived = [];

for (const row of rows) {
  const archived = archiveRelative(row, rows);
  const restoredPath = path.join(root, "docs/reflections/restored", archived);
  let onDisk;
  try {
    onDisk = readFileSync(restoredPath);
  } catch {
    errors.push(`missing ${archived} (original ${row.path})`);
    continue;
  }
  let fromGit;
  try {
    fromGit = gitShow(`${row.sourceSha}:${row.path}`);
  } catch {
    errors.push(`git show failed ${row.sourceSha}:${row.path}`);
    continue;
  }
  const diskHash = sha256(onDisk);
  const gitHash = sha256(fromGit);
  if (!fromGit.equals(onDisk)) {
    errors.push(`bytes differ from git show for ${row.path}`);
  }
  if (onDisk.length !== row.bytes || fromGit.length !== row.bytes) {
    errors.push(`size mismatch for ${row.path}: disk ${onDisk.length} git ${fromGit.length} manifest ${row.bytes}`);
  }
  if (diskHash !== row.sha256 || gitHash !== row.sha256 || diskHash !== gitHash) {
    errors.push(`sha256 mismatch for ${row.path}: disk ${diskHash} git ${gitHash} manifest ${row.sha256}`);
  }
  let parent = "";
  let deletingDate = "";
  try {
    parent = execFileSync("git", ["rev-parse", `${row.deletingSha}^`], { cwd: root, encoding: "utf8" }).trim();
    deletingDate = execFileSync("git", ["show", "-s", "--format=%cI", row.deletingSha], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    errors.push(`deleting commit unreadable ${row.deletingSha} for ${row.path}`);
  }
  if (parent && parent !== row.sourceSha) {
    errors.push(`source commit mismatch for ${row.path}: manifest ${row.sourceSha} parent ${parent}`);
  }
  if (deletingDate && deletingDate !== row.deletingDate) {
    errors.push(`deleting date mismatch for ${row.path}: manifest ${row.deletingDate} git ${deletingDate}`);
  }
  derived.push({ path: row.path, sha256: gitHash, duplicate: row.duplicate });
}

const byHash = new Map();
for (const row of derived) {
  const list = byHash.get(row.sha256) ?? [];
  list.push(row.path);
  byHash.set(row.sha256, list);
}
for (const list of byHash.values()) list.sort();
for (const row of derived) {
  const expected = expectedDuplicate(row.path, byHash, row.sha256);
  if (row.duplicate !== expected) {
    errors.push(`duplicate mark mismatch for ${row.path}: manifest "${row.duplicate}" derived "${expected}"`);
  }
}

if (errors.length > 0) fail(errors);

const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
const duplicatePaths = rows.filter((row) => row.duplicate !== "unique").length;
process.stdout.write("verify-restored-reflections: ok\n");
process.stdout.write(`files: ${rows.length}\n`);
process.stdout.write(`bytes: ${totalBytes}\n`);
process.stdout.write(`duplicate paths: ${duplicatePaths}\n`);
process.stdout.write(`unique hashes: ${byHash.size}\n`);
for (const row of rows) {
  process.stdout.write(`${row.sha256}  ${row.bytes}  ${row.sourceSha}:${row.path}\n`);
}
