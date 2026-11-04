#!/usr/bin/env node
/**
 * Herald Dist write plant. Draft only; never sends Dist.
 *   npx @0xray/foundry herald draft --brief TEXT --lane H --friend-hear TEXT [--body TEXT|--file PATH|--stdin]
 *   npx @0xray/foundry herald inspect
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const write = require("./herald-write.cjs");

function take(argv, index) {
  const value = argv[index + 1];
  if (typeof value !== "string" || !value || value.startsWith("--")) return "";
  return value;
}

const FLAGS = { "--brief": "brief", "--lane": "lane", "--friend-hear": "friendHear", "--body": "body", "--file": "file" };

function parseDraft(argv) {
  const out = { brief: "", lane: "", friendHear: "", body: "", file: "", stdin: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--stdin") out.stdin = true;
    else if (FLAGS[arg]) {
      const value = take(argv, i);
      out[FLAGS[arg]] = value;
      if (value) i += 1;
    }
  }
  return out;
}

function run(args) {
  const root = process.env.FOUNDRY_ROOT || process.cwd();
  const cmd = args[0];
  if (cmd === "draft" || cmd === "look") {
    const parsed = parseDraft(args.slice(1));
    const stdin = parsed.stdin ? fs.readFileSync(0, "utf8") : "";
    const result = write.draft({ root, ...parsed, file: parsed.file ? path.resolve(root, parsed.file) : "", stdin });
    process.stdout.write(`${JSON.stringify(result.receipt, null, 2)}\n`);
    return result.receipt.status === "PASS" ? 0 : 1;
  }
  if (cmd === "inspect") {
    const result = write.inspectWrite(root);
    const payload = result.receipt || { kind: "herald-write", status: result.status, failClosed: true, reason: result.reason };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  process.stderr.write(
    "Usage: npx @0xray/foundry herald draft --brief TEXT --lane H --friend-hear TEXT [--body TEXT|--file PATH|--stdin]\n" +
      "       npx @0xray/foundry herald inspect\n",
  );
  return 1;
}

const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) process.exit(run(process.argv.slice(2)));

export { parseDraft, run };
