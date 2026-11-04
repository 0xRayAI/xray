#!/usr/bin/env node
/**
 * Scout feed mill.
 *   npx @0xray/foundry scout look --brief TEXT --plane dev|integration|domain|ecosystem [--topic TEXT] [--body TEXT] [--file PATH] [--path PATH] [--stdin]
 *   npx @0xray/foundry scout inspect
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const feed = require("./scout-feed.cjs");

function take(argv, index) {
  const value = argv[index + 1];
  if (typeof value !== "string" || !value || value.startsWith("--")) return "";
  return value;
}

function parseLook(argv) {
  const out = { brief: "", plane: "", topic: "", body: "", file: "", paths: [], stdin: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--brief") out.brief = take(argv, i);
    else if (arg === "--plane") out.plane = take(argv, i);
    else if (arg === "--topic") out.topic = take(argv, i);
    else if (arg === "--body") out.body = take(argv, i);
    else if (arg === "--file") out.file = take(argv, i);
    else if (arg === "--path") {
      const one = take(argv, i);
      if (one) out.paths.push(one);
    } else if (arg === "--paths") {
      const list = take(argv, i);
      if (list) out.paths.push(...list.split(",").map((item) => item.trim()).filter(Boolean));
    } else if (arg === "--stdin") out.stdin = true;
    if (arg.startsWith("--") && arg !== "--stdin" && take(argv, i)) i += 1;
  }
  return out;
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export { parseLook };

function run(args) {
  const root = process.env.FOUNDRY_ROOT || process.cwd();
  const cmd = args[0];
  if (cmd === "look") {
    const parsed = parseLook(args.slice(1));
    const stdin = parsed.stdin ? readStdin() : "";
    const result = feed.look({
      root,
      brief: parsed.brief,
      plane: parsed.plane,
      topic: parsed.topic,
      body: parsed.body,
      file: parsed.file ? path.resolve(root, parsed.file) : "",
      paths: parsed.paths,
      stdin,
    });
    process.stdout.write(`${JSON.stringify(result.receipt, null, 2)}\n`);
    return result.receipt.status === "PASS" ? 0 : 1;
  }
  if (cmd === "inspect") {
    const result = feed.inspectFeed(root);
    const payload = result.receipt || {
      kind: "scout-feed",
      status: result.status,
      failClosed: true,
      reason: result.reason,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  process.stderr.write(
    "Usage: npx @0xray/foundry scout look --brief TEXT --plane dev [--topic TEXT] [--body TEXT|--file PATH|--stdin] [--path PATH]\n" +
      "       npx @0xray/foundry scout inspect\n",
  );
  return 1;
}

const invoked =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  process.exit(run(process.argv.slice(2)));
}

export { run };
