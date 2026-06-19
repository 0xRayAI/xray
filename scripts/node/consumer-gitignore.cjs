/**
 * Consumer .gitignore — template + idempotent merge into existing .gitignore.
 */
const fs = require("fs");
const path = require("path");

const MARKER_START = "# --- 0xray suit (postinstall) ---";
const MARKER_END = "# --- end 0xray suit ---";

/** Suit artifacts dropped by postinstall / install-bridges — keep out of product repos */
const SUIT_IGNORE_LINES = [
  ".grok/",
  ".mcp.json",
  "opencode.json",
  "AGENTS.md",
  "SKILLS.md",
  ".xray/",
  ".strray/",
  "strray/",
  ".hermes/",
  ".opencode/agents/",
  ".opencode/commands/",
  ".opencode/workflows/",
  ".opencode/codex.codex",
  ".opencode/enforcer-config.json",
  ".opencode/skills/",
  ".opencode/scripts/",
  ".opencode/logs/",
  ".opencode/validation/",
  ".opencode/triage/",
  "logs/framework/",
];

function buildMarkerBlock(lines = SUIT_IGNORE_LINES) {
  return [MARKER_START, ...lines, MARKER_END].join("\n");
}

function stripMarkerBlock(content) {
  const start = content.indexOf(MARKER_START);
  if (start === -1) return content;
  const end = content.indexOf(MARKER_END);
  if (end === -1) {
    return `${content.slice(0, start).trimEnd()}\n`;
  }
  const tail = content.slice(end + MARKER_END.length);
  return `${content.slice(0, start).trimEnd()}${tail}`.trimEnd();
}

function markerBlockIsCurrent(raw) {
  if (!raw.includes(MARKER_START) || !raw.includes(MARKER_END)) {
    return false;
  }
  const start = raw.indexOf(MARKER_START);
  const end = raw.indexOf(MARKER_END) + MARKER_END.length;
  const blockSection = raw.slice(start, end);
  return SUIT_IGNORE_LINES.every((line) => blockSection.includes(line));
}

/**
 * @returns {'created' | 'merged' | 'unchanged'}
 */
function applyConsumerGitignore(targetDir, packageRoot) {
  const gitignoreSource = path.join(packageRoot, ".gitignore.default");
  const gitignoreDest = path.join(targetDir, ".gitignore");

  if (!fs.existsSync(gitignoreSource)) {
    return "unchanged";
  }

  if (!fs.existsSync(gitignoreDest)) {
    fs.copyFileSync(gitignoreSource, gitignoreDest);
    return "created";
  }

  const raw = fs.readFileSync(gitignoreDest, "utf8");
  if (markerBlockIsCurrent(raw)) {
    return "unchanged";
  }

  const content = stripMarkerBlock(raw);
  const next = `${content.trimEnd()}\n\n${buildMarkerBlock()}\n`;
  fs.writeFileSync(gitignoreDest, next);
  return "merged";
}

module.exports = {
  MARKER_START,
  MARKER_END,
  SUIT_IGNORE_LINES,
  buildMarkerBlock,
  stripMarkerBlock,
  applyConsumerGitignore,
};