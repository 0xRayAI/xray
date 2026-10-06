/**
 * Session notes beside repertoire laws.
 * Laws stay in curated_signals.json. This file is the index.
 * Cleanup drops a lone note only after STALE_AFTER_MS without another sighting.
 * A replaced note stays on disk and is left out of the short index.
 * The short index is a view of current notes. It does not delete history.
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
    const note = {
      id: typeof row.id === "string" && row.id ? row.id : noteId(text),
      text,
      added,
      last_seen: lastSeen,
    };
    if (typeof row.source === "string") note.source = row.source;
    if (typeof row.slot === "string" && row.slot) note.slot = row.slot;
    if (typeof row.superseded_by === "string" && row.superseded_by) note.superseded_by = row.superseded_by;
    if (typeof row.superseded_at === "string" && row.superseded_at) note.superseded_at = row.superseded_at;
    notes.push(note);
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
      if (note.slot) row.slot = note.slot;
      if (note.superseded_by) row.superseded_by = note.superseded_by;
      if (note.superseded_at) row.superseded_at = note.superseded_at;
      return row;
    });
    writeFileSync(dest, `${JSON.stringify({ notes: body }, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

function nowStamp(opts) {
  return typeof opts.now === "string" && opts.now ? opts.now : new Date().toISOString();
}

function isCurrent(note) {
  return !note.superseded_by;
}

/** The new line becomes current. The previous holder of the same slot stays on disk. */
function closeSlot(notes, slot, keeperId, now) {
  if (!slot) return 0;
  let closed = 0;
  for (const note of notes) {
    if (note.id === keeperId) continue;
    if (note.slot !== slot) continue;
    if (note.superseded_by) continue;
    note.superseded_by = keeperId;
    note.superseded_at = now;
    closed += 1;
  }
  return closed;
}

function rememberSessionNote(root, text, opts = {}) {
  const line = clipLine(text);
  if (!line) return { kept: false };
  const loaded = loadIndex(root);
  if (loaded.corrupt) return { kept: false, corrupt: true };
  const now = nowStamp(opts);
  const source = typeof opts.source === "string" ? opts.source : undefined;
  const slot = typeof opts.slot === "string" && opts.slot ? opts.slot : undefined;
  const existing = loaded.notes.find((note) => note.text === line);
  if (existing) {
    existing.last_seen = now;
    if (source) existing.source = source;
    if (slot) {
      existing.slot = slot;
      delete existing.superseded_by;
      delete existing.superseded_at;
      closeSlot(loaded.notes, slot, existing.id, now);
    }
    const wrote = writeIndex(root, loaded.notes);
    return { kept: wrote, bumped: true, id: existing.id, corrupt: false };
  }
  const created = {
    id: noteId(line),
    text: line,
    added: now,
    last_seen: now,
  };
  if (source) created.source = source;
  if (slot) created.slot = slot;
  loaded.notes.push(created);
  if (slot) closeSlot(loaded.notes, slot, created.id, now);
  const wrote = writeIndex(root, loaded.notes);
  return { kept: wrote, bumped: false, id: created.id, corrupt: false };
}

function supersedeSessionNote(root, previousText, nextText, opts = {}) {
  const previousLine = clipLine(previousText);
  const nextLine = clipLine(nextText);
  if (!previousLine || !nextLine || previousLine === nextLine) return { kept: false };
  const loaded = loadIndex(root);
  if (loaded.corrupt) return { kept: false, corrupt: true };
  const previous = loaded.notes.find((note) => note.text === previousLine || note.id === previousLine);
  if (!previous) return { kept: false, missing: true };
  const now = nowStamp(opts);
  const source = typeof opts.source === "string" ? opts.source : previous.source;
  let next = loaded.notes.find((note) => note.text === nextLine);
  if (!next) {
    next = {
      id: noteId(nextLine),
      text: nextLine,
      added: now,
      last_seen: now,
    };
    if (source) next.source = source;
    if (previous.slot) next.slot = previous.slot;
    loaded.notes.push(next);
  } else {
    next.last_seen = now;
    delete next.superseded_by;
    delete next.superseded_at;
    if (previous.slot) next.slot = previous.slot;
  }
  if (next.id === previous.id) return { kept: false };
  previous.superseded_by = next.id;
  previous.superseded_at = now;
  if (previous.slot) closeSlot(loaded.notes, previous.slot, next.id, now);
  const wrote = writeIndex(root, loaded.notes);
  return { kept: wrote, id: next.id, supersededId: previous.id, corrupt: false };
}

function sessionNoteHistory(root, textOrId) {
  const loaded = loadIndex(root);
  const key = clipLine(textOrId) || String(textOrId || "");
  const start = loaded.notes.find((note) => note.text === key || note.id === textOrId);
  if (!start) return [];
  const seen = new Set([start.id]);
  const older = [];
  let cursor = start.id;
  while (cursor && seen.size < loaded.notes.length + 1) {
    const prev = loaded.notes.find((note) => note.superseded_by === cursor && !seen.has(note.id));
    if (!prev) break;
    seen.add(prev.id);
    older.push(prev);
    cursor = prev.id;
  }
  return older;
}

function shortSessionIndex(root, limit = SHORT_INDEX_LIMIT) {
  const loaded = loadIndex(root);
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : SHORT_INDEX_LIMIT;
  const ordered = loaded.notes.filter(isCurrent).sort((a, b) => {
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
  const protectedIds = new Set();
  for (const note of loaded.notes) {
    if (!note.superseded_by) continue;
    protectedIds.add(note.id);
    protectedIds.add(note.superseded_by);
  }
  const kept = [];
  let dropped = 0;
  for (const note of loaded.notes) {
    const seen = Date.parse(note.last_seen);
    const stale = Number.isFinite(seen) && nowMs - seen > windowMs;
    if (stale && !protectedIds.has(note.id)) {
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
      if (pickup[1].trim()) lines.push({ text: pickup[1].trim(), slot: "pickup" });
      continue;
    }
    const bullet = trimmed.replace(/^[-*]\s+/, "");
    if (bullet) lines.push({ text: bullet });
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
      const saved = rememberSessionNote(root, line.text, {
        ...opts,
        source: opts.source || "NOTES.md",
        slot: line.slot,
      });
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
  supersedeSessionNote,
  sessionNoteHistory,
  shortSessionIndex,
  dropStaleSessionNotes,
  retainProjectNotes,
};
