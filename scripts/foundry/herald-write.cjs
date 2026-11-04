/**
 * Herald Dist write plant. Brief → H-lane gates → draft → receipt. No network. Never sends Dist.
 * Receipt: .xray/herald-write-receipt.json
 * Draft:   .xray/herald/draft.md
 */
"use strict";

const fs = require("fs");
const path = require("path");

const LANES = ["H"];
const RECEIPT_FILE = "herald-write-receipt.json";
const DRAFT_REL = path.join(".xray", "herald", "draft.md");

function receiptPath(root) {
  return path.join(root, ".xray", RECEIPT_FILE);
}

function draftPath(root) {
  return path.join(root, DRAFT_REL);
}

function readReceipt(root) {
  const file = receiptPath(root);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "herald-write", status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
    }
    return parsed;
  } catch {
    return { kind: "herald-write", status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
  }
}

function writeReceipt(root, receipt) {
  const file = receiptPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return file;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function laneGate(lane) {
  if (!text(lane)) return "missing-lane";
  if (!LANES.includes(text(lane))) return "lane";
  return null;
}

function evaluateWrite({ brief, lane, body, friendHear, draftExists }) {
  const gates = {
    brief: text(brief).length > 0,
    lane: laneGate(lane) === null,
    body: text(body).length > 0,
    friendHear: text(friendHear).length > 0,
    draft: draftExists === true,
  };
  let reason = null;
  if (!gates.brief) reason = "missing-brief";
  else if (!gates.lane) reason = laneGate(lane);
  else if (!gates.body) reason = "empty-body";
  else if (!gates.friendHear) reason = "missing-friend-hear";
  else if (!gates.draft) reason = "missing-draft";
  return { status: reason ? "FAIL" : "PASS", failClosed: true, gates, reason };
}

function renderDraft({ brief, lane, friendHear, body }) {
  return [
    "# Herald draft",
    "",
    `Lane: ${lane}`,
    `Brief: ${brief}`,
    `Friend would hear: ${friendHear}`,
    "Dist: HOLD (draft only; GO is a human gate)",
    "",
    "## Draft",
    "",
    body.trim(),
    "",
  ].join("\n");
}

function readBody(opts) {
  if (typeof opts.body === "string" && opts.body.length > 0) return opts.body;
  if (text(opts.file)) {
    const file = path.resolve(opts.root, text(opts.file));
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  }
  if (typeof opts.stdin === "string") return opts.stdin;
  return "";
}

function draft(opts) {
  const root = opts.root;
  const brief = text(opts.brief);
  const lane = text(opts.lane);
  const friendHear = text(opts.friendHear);
  const body = readBody({ ...opts, root });
  const pre = evaluateWrite({ brief, lane, body, friendHear, draftExists: true });
  let draftRel = null;
  if (pre.status === "PASS") {
    fs.mkdirSync(path.dirname(draftPath(root)), { recursive: true });
    fs.writeFileSync(draftPath(root), renderDraft({ brief, lane, friendHear, body }));
    draftRel = ".xray/herald/draft.md";
  }
  const final = evaluateWrite({ brief, lane, body, friendHear, draftExists: Boolean(draftRel) });
  const receipt = {
    kind: "herald-write",
    status: final.status,
    failClosed: true,
    lane: lane || null,
    brief: brief || null,
    friendHear: friendHear || null,
    draft: draftRel,
    dist: "HOLD",
    sent: false,
    gates: final.gates,
    reason: final.reason,
  };
  writeReceipt(root, receipt);
  return { receipt, draft: draftRel ? draftPath(root) : null };
}

function inspectWrite(root) {
  const stored = readReceipt(root);
  if (!stored) return { ok: false, status: "FAIL", reason: "missing-receipt", failClosed: true, receipt: null };
  if (stored.reason === "receipt-unreadable") {
    return { ok: false, status: "FAIL", reason: "receipt-unreadable", failClosed: true, receipt: stored };
  }
  if (stored.status !== "PASS") {
    return { ok: false, status: "FAIL", reason: stored.reason || "herald receipt FAIL", failClosed: true, receipt: stored };
  }
  const file = draftPath(root);
  if (!(fs.existsSync(file) && fs.readFileSync(file, "utf8").trim())) {
    const failed = {
      ...stored,
      status: "FAIL",
      gates: { ...(stored.gates || {}), draft: false },
      reason: "missing-draft",
    };
    writeReceipt(root, failed);
    return { ok: false, status: "FAIL", reason: "missing-draft", failClosed: true, receipt: failed };
  }
  return { ok: true, status: "PASS", reason: null, failClosed: true, receipt: stored };
}

module.exports = {
  LANES,
  RECEIPT_FILE,
  receiptPath,
  draftPath,
  readReceipt,
  writeReceipt,
  evaluateWrite,
  renderDraft,
  draft,
  inspectWrite,
};
