/**
 * Scout feed mill. Brief → plane → digest → receipt. No network.
 * Receipt: .xray/scout-feed-receipt.json
 * Digest:  .xray/scout/digest.md
 */
"use strict";

const fs = require("fs");
const path = require("path");

const PLANES = ["dev", "integration", "domain", "ecosystem"];
const RECEIPT_FILE = "scout-feed-receipt.json";
const DIGEST_REL = path.join(".xray", "scout", "digest.md");

function receiptPath(root) {
  return path.join(root, ".xray", RECEIPT_FILE);
}

function digestPath(root) {
  return path.join(root, DIGEST_REL);
}

function readReceipt(root) {
  const file = receiptPath(root);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "scout-feed", status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
    }
    return parsed;
  } catch {
    return { kind: "scout-feed", status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
  }
}

function writeReceipt(root, receipt) {
  const file = receiptPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return file;
}

function normalizePaths(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

function planeGate(plane) {
  if (typeof plane !== "string" || !plane.trim()) return "missing-plane";
  if (!PLANES.includes(plane.trim())) return "plane";
  return null;
}

function evaluateFeed({ plane, body, digestExists }) {
  const gates = {
    plane: planeGate(plane) === null,
    body: typeof body === "string" && body.trim().length > 0,
    digest: digestExists === true,
  };
  let reason = null;
  if (!gates.plane) reason = planeGate(plane);
  else if (!gates.body) reason = "empty-body";
  else if (!gates.digest) reason = "missing-digest";
  return {
    status: reason ? "FAIL" : "PASS",
    failClosed: true,
    gates,
    reason,
  };
}

function renderDigest({ plane, topic, brief, paths, body }) {
  const lines = [
    "# Scout digest",
    "",
    `Plane: ${plane}`,
    `Topic: ${topic || brief || ""}`,
    "",
    "## Look",
    "",
    body.trim(),
    "",
    "## Paths",
    "",
  ];
  if (paths.length === 0) lines.push("- (none)");
  else for (const item of paths) lines.push(`- ${item}`);
  lines.push("");
  return lines.join("\n");
}

function readBody(opts) {
  if (typeof opts.body === "string" && opts.body.length > 0) return opts.body;
  if (typeof opts.file === "string" && opts.file.trim()) {
    const file = path.resolve(opts.root, opts.file.trim());
    if (!fs.existsSync(file)) return "";
    return fs.readFileSync(file, "utf8");
  }
  if (typeof opts.stdin === "string") return opts.stdin;
  return "";
}

function look(opts) {
  const root = opts.root;
  const plane = typeof opts.plane === "string" ? opts.plane.trim() : "";
  const brief = typeof opts.brief === "string" ? opts.brief.trim() : "";
  const topic = (typeof opts.topic === "string" && opts.topic.trim()) || brief;
  const paths = normalizePaths(opts.paths);
  const body = readBody({ ...opts, root });
  let digestRel = null;
  let digestText = "";
  if (planeGate(plane) === null && body.trim()) {
    digestText = renderDigest({ plane, topic, brief, paths, body });
    const file = digestPath(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, digestText);
    digestRel = ".xray/scout/digest.md";
  }
  const finalEval = evaluateFeed({
    plane,
    body,
    digestExists: Boolean(digestRel) && digestText.trim().length > 0,
  });
  const receipt = {
    kind: "scout-feed",
    status: finalEval.status,
    failClosed: true,
    plane: plane || null,
    topic: topic || null,
    brief: brief || null,
    paths,
    digest: digestRel,
    gates: finalEval.gates,
    reason: finalEval.reason,
  };
  writeReceipt(root, receipt);
  return { receipt, digest: digestRel ? digestPath(root) : null };
}

function inspectFeed(root) {
  const stored = readReceipt(root);
  if (!stored) {
    return { ok: false, status: "FAIL", reason: "missing-receipt", failClosed: true, receipt: null };
  }
  if (stored.reason === "receipt-unreadable") {
    return { ok: false, status: "FAIL", reason: "receipt-unreadable", failClosed: true, receipt: stored };
  }
  if (stored.status !== "PASS") {
    return {
      ok: false,
      status: "FAIL",
      reason: stored.reason || "scout receipt FAIL",
      failClosed: true,
      receipt: stored,
    };
  }
  const file = digestPath(root);
  const digestText = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!digestText.trim()) {
    const failed = {
      ...stored,
      status: "FAIL",
      failClosed: true,
      gates: { ...(stored.gates || {}), digest: false },
      reason: "missing-digest",
    };
    writeReceipt(root, failed);
    return { ok: false, status: "FAIL", reason: "missing-digest", failClosed: true, receipt: failed };
  }
  return { ok: true, status: "PASS", reason: null, failClosed: true, receipt: stored };
}

module.exports = {
  PLANES,
  RECEIPT_FILE,
  receiptPath,
  digestPath,
  readReceipt,
  writeReceipt,
  evaluateFeed,
  renderDigest,
  look,
  inspectFeed,
};
