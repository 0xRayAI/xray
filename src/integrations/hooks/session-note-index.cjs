/**
 * Session notes beside repertoire laws.
 * Laws stay in curated_signals.json. This file is the index.
 * Cleanup drops a note only after STALE_AFTER_MS without another sighting.
 * The short index is a view. It does not delete.
 */
const { createHash } = require("crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_MS = 90 * DAY_MS;
const SHORT_INDEX_LIMIT = 12;
const LINE_MAX = 240;

function sessionNotesPath(root) {
  return join(root, ".xray", "state", "repertoire", "session-notes.json");
}

function lawsPath(root) {
  return join(root, ".xray", "state", "repertoire", "curated_signals.json");
}

function clipLine(raw) {
  if (raw == null) return null;
  const text = String(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= LINE_MAX) return text;
  return `${text.slice(0, LINE_MAX - 1)}…`;
}

function noteId(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function loadIndex(root) {
  const dest = sessionNotesPath(root);
  if (!existsSync(dest)) return { notes: [], corrupt: false };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(dest, "utf8"));
  } catch {
    return { notes: [], corrupt: true };
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.notes)) {
    return { notes: [], corrupt: true };
  }
  const notes = [];
  for (const row of parsed.notes) {
    if (!row || typeof row.text !== "string" || !row.text.trim()) continue;
    const text = clipLine(row.text);
    if (!text) continue;
    const added = typeof row.added === "string" ? row.added : "";
    const lastSeen = typeof row.last_seen === "string" && row.last_seen ? row.last_seen : added;
    if (!added || !lastSeen) continue;
    notes.push({
      id: typeof row.id === "string" && row.id ? row.id : noteId(text),
      text,
      added,
      last_seen: lastSeen,
      source: typeof row.source === "string" ? row.source : undefined,
    });
  }
  return { notes, corrupt: false };
}

function writeIndex(root, notes) {
  const dest = sessionNotesPath(root);
  try {
    mkdirSync(join(root, ".xray", "state", "repertoire"), { recursive: true });
    const body = notes.map((note) => {
      const row = {
        id: note.id,
        text: note.text,
        added: note.added,
        last_seen: note.last_seen,
      };
      if (note.source) row.source = note.source;
      return row;
    });
    writeFileSync(dest, `${JSON.stringify({ notes: body }, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

function rememberSessionNote(root, text, opts = {}) {
  const line = clipLine(text);
  if (!line) return { kept: false };
  const loaded = loadIndex(root);
  if (loaded.corrupt) return { kept: false, corrupt: true };
  const now = typeof opts.now === "string" && opts.now ? opts.now : new Date().toISOString();
  const source = typeof opts.source === "string" ? opts.source : undefined;
  const existing = loaded.notes.find((note) => note.text === line);
  if (existing) {
    existing.last_seen = now;
    if (source) existing.source = source;
    const wrote = writeIndex(root, loaded.notes);
    return { kept: wrote, bumped: true, id: existing.id, corrupt: false };
  }
  const created = {
    id: noteId(line),
    text: line,
    added: now,
    last_seen: now,
    source,
  };
  loaded.notes.push(created);
  const wrote = writeIndex(root, loaded.notes);
  return { kept: wrote, bumped: false, id: created.id, corrupt: false };
}

function shortSessionIndex(root, limit = SHORT_INDEX_LIMIT) {
  const loaded = loadIndex(root);
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : SHORT_INDEX_LIMIT;
  const ordered = loaded.notes.slice().sort((a, b) => {
    if (a.last_seen === b.last_seen) return a.added < b.added ? 1 : -1;
    return a.last_seen < b.last_seen ? 1 : -1;
  });
  return ordered.slice(0, cap);
}

function dropStaleSessionNotes(root, opts = {}) {
  const loaded = loadIndex(root);
  if (loaded.corrupt) return { kept: 0, dropped: 0, corrupt: true };
  const nowMs = typeof opts.now === "string" ? Date.parse(opts.now) : Date.now();
  const windowMs = Number.isFinite(opts.staleAfterMs) ? opts.staleAfterMs : STALE_AFTER_MS;
  if (!Number.isFinite(nowMs)) return { kept: loaded.notes.length, dropped: 0, corrupt: false };
  const kept = [];
  let dropped = 0;
  for (const note of loaded.notes) {
    const seen = Date.parse(note.last_seen);
    if (Number.isFinite(seen) && nowMs - seen > windowMs) {
      dropped += 1;
      continue;
    }
    kept.push(note);
  }
  if (dropped > 0) writeIndex(root, kept);
  return { kept: kept.length, dropped, corrupt: false };
}

function linesFromNotes(text) {
  const lines = [];
  for (const raw of String(text || "").split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    const pickup = trimmed.match(/^\*\*Pickup line:\*\*\s*(.*)$/);
    if (pickup) {
      if (pickup[1].trim()) lines.push(pickup[1].trim());
      continue;
    }
    const bullet = trimmed.replace(/^[-*]\s+/, "");
    if (bullet) lines.push(bullet);
  }
  return lines;
}

function retainProjectNotes(root, opts = {}) {
  const dest = join(root, ".xray", "state", "NOTES.md");
  let remembered = 0;
  if (existsSync(dest)) {
    let text = "";
    try {
      text = readFileSync(dest, "utf8");
    } catch {
      text = "";
    }
    for (const line of linesFromNotes(text)) {
      const saved = rememberSessionNote(root, line, { ...opts, source: opts.source || "NOTES.md" });
      if (saved.corrupt) return { remembered, dropped: 0, kept: 0, corrupt: true };
      if (saved.kept) remembered += 1;
    }
  }
  const cleaned = dropStaleSessionNotes(root, opts);
  return { remembered, ...cleaned };
}

module.exports = {
  DAY_MS,
  STALE_AFTER_MS,
  SHORT_INDEX_LIMIT,
  LINE_MAX,
  sessionNotesPath,
  lawsPath,
  rememberSessionNote,
  shortSessionIndex,
  dropStaleSessionNotes,
  retainProjectNotes,
};
