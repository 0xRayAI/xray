#!/usr/bin/env node
/**
 * Fail if the tarball npm would publish does not contain dist/cli/index.js.
 *
 * 0xray@4.0.13 listed dist/ in package.json files[] but packed 0 dist files.
 * npm pack silently omits missing files[] entries when dist/ is not on disk.
 *
 * Dry-run uses --ignore-scripts so this can run from prepack without recursion.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isXrayExoRepo, resolveMillRoot } from "./mill-root.mjs";

export const REQUIRED_PACK_PATHS = [
  "dist/cli/index.js",
  "dist/mcps/orchestrator.server.js",
  "dist/integrations/grok/hooks/session-start.js",
  "dist/integrations/cursor/hooks/hooks.json",
  "dist/integrations/cursor/hooks/pre-tool-use.js",
  "dist/integrations/cursor/hooks/pre-compact.js",
  "dist/integrations/cursor/hooks/after-file-edit.js",
  "dist/integrations/cursor/hooks/cursor-hook-utils.js",
  "dist/integrations/cursor/hooks/cursor-usage-receipt.js",
  "dist/integrations/cursor/hooks/xray-cloud-hook.sh",
  "dist/integrations/cursor/hooks/pre-tool-use.sh",
  "dist/integrations/cursor/hooks/pre-compact.sh",
  "dist/integrations/cursor/hooks/after-file-edit.sh",
];

export function packedFilePaths(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((f) => (typeof f === "string" ? f : f && typeof f.path === "string" ? f.path : ""))
    .filter(Boolean)
    .map((p) => p.replace(/^package\//, ""));
}

export function parseNpmPackJson(raw) {
  const text = String(raw ?? "");
  const start = text.search(/[\[{]/);
  if (start < 0) {
    throw new Error("npm pack --json produced no JSON");
  }
  const parsed = JSON.parse(text.slice(start));
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  return packedFilePaths(entry?.files);
}

export function assertPackedPaths(paths, required = REQUIRED_PACK_PATHS) {
  const set = new Set((paths ?? []).map((p) => String(p).replace(/^package\//, "")));
  const missing = required.filter((p) => !set.has(p));
  if (missing.length > 0) {
    throw new Error(
      `npm pack omitted ${missing.join(", ")}. ` +
        `package.json files[] lists dist/ but npm omits it when dist/ is missing on disk. ` +
        `Run npm run build. Do not publish. (0xray@4.0.13 shipped 0 dist files.)`,
    );
  }
}

export function assertDistCliOnDisk(rootDir) {
  const cli = path.join(rootDir, "dist", "cli", "index.js");
  if (!fs.existsSync(cli)) {
    throw new Error(
      `dist/cli/index.js missing on disk at ${cli}. Run npm run build before pack/publish.`,
    );
  }
}

export function listPackedPathsDryRun(rootDir) {
  const out = execSync("npm pack --dry-run --json --ignore-scripts", {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseNpmPackJson(out);
}

export function assertPackedDistCli(rootDir = resolveMillRoot()) {
  if (!isXrayExoRepo(rootDir)) {
    return { skipped: true, reason: "not 0xray exo" };
  }
  assertDistCliOnDisk(rootDir);
  const paths = listPackedPathsDryRun(rootDir);
  assertPackedPaths(paths);
  return { skipped: false, paths: REQUIRED_PACK_PATHS };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = assertPackedDistCli();
    if (result.skipped) {
      process.stdout.write(`ℹ️  packed dist/cli check skipped (${result.reason})\n`);
    } else {
      process.stdout.write(`✅ pack includes ${REQUIRED_PACK_PATHS.join(", ")}\n`);
    }
  } catch (err) {
    process.stderr.write(`❌ ${err.message}\n`);
    process.exit(1);
  }
}
