/**
 * One wake hands the lens, the ticket, the laws, and the current notes.
 * Goggles names plane record-map.
 * The station module writes STATION.md and NOTES.md.
 * Repertoire keeps the law list.
 * The current session-note index sits beside that list.
 * The card carries the count. A memory look carries the current lines.
 */
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { shortSessionIndex } = require("./session-note-index.cjs");

const CASCADE_PLANE = "record-map";
const MEMORY_PLANES = ["record-map", "station-card", "notes-page", "memory-recall"];

function isCascadePlane(id) {
  return MEMORY_PLANES.includes(String(id || ""));
}

function clipNames(names) {
  if (!Array.isArray(names)) return [];
  const out = [];
  for (const raw of names) {
    const name = String(raw || "").trim();
    if (!name || out.includes(name)) continue;
    out.push(name);
    if (out.length >= 8) break;
  }
  return out;
}

function lawNamesFromWorking(root) {
  const file = join(root, ".xray", "state", "repertoire-working.json");
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return clipNames(data && data.matchedSignals);
  } catch {
    return [];
  }
}

function currentNotes(root) {
  try {
    return shortSessionIndex(root).map((note) => {
      const row = { id: note.id, text: note.text };
      if (note.slot) row.slot = note.slot;
      return row;
    });
  } catch {
    return [];
  }
}

/** Laws come from this wake when passed. Otherwise the working file. Notes are current lines only. */
function readWakeCascade(root, opts = {}) {
  const laws = Array.isArray(opts.laws) ? clipNames(opts.laws) : lawNamesFromWorking(root);
  return {
    plane: CASCADE_PLANE,
    station: ".xray/state/STATION.md",
    notesPage: ".xray/state/NOTES.md",
    index: ".xray/state/repertoire/session-notes.json",
    laws,
    notes: currentNotes(root),
  };
}

function formatCascadePointer(cascade) {
  const count = cascade && Array.isArray(cascade.notes) ? cascade.notes.length : 0;
  const plane = cascade && cascade.plane ? cascade.plane : CASCADE_PLANE;
  return `Cascade: ${plane} · notes ${count} current`;
}

function formatCascadeReading(cascade) {
  const plane = cascade && cascade.plane ? cascade.plane : CASCADE_PLANE;
  const laws = cascade && Array.isArray(cascade.laws) && cascade.laws.length
    ? cascade.laws.join(", ")
    : "(none yet)";
  const notes = cascade && Array.isArray(cascade.notes) ? cascade.notes : [];
  const lines = [
    `Cascade: ${plane}`,
    `Station: ${cascade && cascade.station ? cascade.station : ".xray/state/STATION.md"}`,
    `Notes page: ${cascade && cascade.notesPage ? cascade.notesPage : ".xray/state/NOTES.md"}`,
    `Index: ${cascade && cascade.index ? cascade.index : ".xray/state/repertoire/session-notes.json"}`,
    `Laws: ${laws}`,
    `Notes: ${notes.length} current`,
  ];
  for (const note of notes) {
    const slot = note.slot ? `${note.slot} ` : "";
    lines.push(`- ${note.id} ${slot}${note.text}`);
  }
  return lines.join("\n");
}

module.exports = {
  CASCADE_PLANE,
  MEMORY_PLANES,
  isCascadePlane,
  readWakeCascade,
  formatCascadePointer,
  formatCascadeReading,
};
