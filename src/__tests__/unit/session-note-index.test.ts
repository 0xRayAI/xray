import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { applyStationHeat } from "../../integrations/hooks/station-hook-runtime.mjs";
import {
  LINE_MAX,
  STALE_AFTER_MS,
  SHORT_INDEX_LIMIT,
  dropStaleSessionNotes,
  lawsPath,
  rememberSessionNote,
  retainProjectNotes,
  sessionNoteHistory,
  sessionNotesPath,
  shortSessionIndex,
  supersedeSessionNote,
} from "../../integrations/hooks/session-note-index.mjs";

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

describe("session note index", () => {
  it("keeps a note beside the laws and does not open the law file", () => {
    const root = tempRoot("xray-notes-beside-");
    try {
      const saved = rememberSessionNote(root, "  seats write as the app  ", {
        now: "2026-10-06T00:00:00.000Z",
        source: "NOTES.md",
      });
      expect(saved.kept).toBe(true);
      expect(fs.existsSync(lawsPath(root))).toBe(false);
      const index = JSON.parse(fs.readFileSync(sessionNotesPath(root), "utf8")) as {
        notes: Array<{ text: string; source?: string }>;
      };
      expect(index.notes).toEqual([
        {
          id: saved.id,
          text: "seats write as the app",
          added: "2026-10-06T00:00:00.000Z",
          last_seen: "2026-10-06T00:00:00.000Z",
          source: "NOTES.md",
        },
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("bumps last_seen for the same line and leaves added alone", () => {
    const root = tempRoot("xray-notes-bump-");
    try {
      const first = rememberSessionNote(root, "same line", { now: "2026-10-01T00:00:00.000Z" });
      const second = rememberSessionNote(root, "same line", { now: "2026-10-06T00:00:00.000Z" });
      expect(second.bumped).toBe(true);
      expect(second.id).toBe(first.id);
      const index = JSON.parse(fs.readFileSync(sessionNotesPath(root), "utf8")) as {
        notes: Array<{ added: string; last_seen: string }>;
      };
      expect(index.notes).toHaveLength(1);
      expect(index.notes[0]?.added).toBe("2026-10-01T00:00:00.000Z");
      expect(index.notes[0]?.last_seen).toBe("2026-10-06T00:00:00.000Z");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("shows twelve newest lines and keeps the rest on disk", () => {
    const root = tempRoot("xray-notes-short-");
    try {
      for (let n = 0; n < SHORT_INDEX_LIMIT + 2; n += 1) {
        const day = String(n + 1).padStart(2, "0");
        rememberSessionNote(root, `note ${n}`, { now: `2026-01-${day}T00:00:00.000Z` });
      }
      const view = shortSessionIndex(root);
      expect(view).toHaveLength(SHORT_INDEX_LIMIT);
      expect(view[0]?.text).toBe(`note ${SHORT_INDEX_LIMIT + 1}`);
      const stored = JSON.parse(fs.readFileSync(sessionNotesPath(root), "utf8")) as {
        notes: unknown[];
      };
      expect(stored.notes).toHaveLength(SHORT_INDEX_LIMIT + 2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("drops a note only after the stale window and leaves the law file bytes alone", () => {
    const root = tempRoot("xray-notes-stale-");
    try {
      const laws = lawsPath(root);
      fs.mkdirSync(path.dirname(laws), { recursive: true });
      const lawBody = `${JSON.stringify({ signals: [{ name: "station-survives-the-cut" }] }, null, 2)}\n`;
      fs.writeFileSync(laws, lawBody);
      const seen = "2026-01-01T00:00:00.000Z";
      rememberSessionNote(root, "still here", { now: seen });
      rememberSessionNote(root, "gone", { now: "2025-01-01T00:00:00.000Z" });
      const onTheLine = new Date(Date.parse(seen) + STALE_AFTER_MS).toISOString();
      const atWindow = dropStaleSessionNotes(root, { now: onTheLine });
      expect(atWindow.dropped).toBe(1);
      expect(atWindow.kept).toBe(1);
      const justAfter = new Date(Date.parse(seen) + STALE_AFTER_MS + 1).toISOString();
      const later = dropStaleSessionNotes(root, { now: justAfter });
      expect(later.dropped).toBe(1);
      expect(later.kept).toBe(0);
      expect(fs.readFileSync(laws, "utf8")).toBe(lawBody);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not overwrite a corrupt index", () => {
    const root = tempRoot("xray-notes-corrupt-");
    try {
      const dest = sessionNotesPath(root);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, "{");
      const saved = rememberSessionNote(root, "do not wipe", { now: "2026-10-06T00:00:00.000Z" });
      expect(saved.corrupt).toBe(true);
      expect(saved.kept).toBe(false);
      expect(fs.readFileSync(dest, "utf8")).toBe("{");
      const cleaned = dropStaleSessionNotes(root, { now: "2026-10-06T00:00:00.000Z" });
      expect(cleaned.corrupt).toBe(true);
      expect(fs.readFileSync(dest, "utf8")).toBe("{");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("clips a long line and ignores a blank one", () => {
    const root = tempRoot("xray-notes-clip-");
    try {
      expect(rememberSessionNote(root, "   ").kept).toBe(false);
      expect(fs.existsSync(sessionNotesPath(root))).toBe(false);
      const long = "a".repeat(LINE_MAX + 20);
      rememberSessionNote(root, long, { now: "2026-10-06T00:00:00.000Z" });
      const view = shortSessionIndex(root);
      expect(view[0]?.text).toHaveLength(LINE_MAX);
      expect(view[0]?.text.endsWith("…")).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps notes after NOTES.md is removed", () => {
    const root = tempRoot("xray-notes-retain-");
    try {
      const notes = path.join(root, ".xray", "state", "NOTES.md");
      fs.mkdirSync(path.dirname(notes), { recursive: true });
      fs.writeFileSync(
        notes,
        "**Pickup line:** keep the pickup\n\n## Working notes\n\nThe body stays.\n",
      );
      const first = retainProjectNotes(root, { now: "2026-10-06T00:00:00.000Z" });
      expect(first.remembered).toBe(2);
      fs.rmSync(notes);
      const second = retainProjectNotes(root, { now: "2026-10-07T00:00:00.000Z" });
      expect(second.dropped).toBe(0);
      const texts = shortSessionIndex(root).map((note) => note.text).sort();
      expect(texts).toEqual(["The body stays.", "keep the pickup"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("heat copies the notes page into the index and a later wipe leaves the index", () => {
    const root = tempRoot("xray-notes-heat-");
    try {
      const notes = path.join(root, ".xray", "state", "NOTES.md");
      fs.mkdirSync(path.dirname(notes), { recursive: true });
      fs.writeFileSync(notes, "**Pickup line:** keep this\n\nThe body stays.\n");
      applyStationHeat(
        root,
        "grok",
        { hookEvent: "pre_compact", intent: "keep this" },
        { host: "grok", intent: "keep this" },
      );
      expect(fs.readFileSync(notes, "utf8")).toContain("The body stays.");
      const before = shortSessionIndex(root).map((note) => note.text).sort();
      expect(before).toEqual(["The body stays.", "keep this"]);
      fs.rmSync(notes);
      applyStationHeat(root, "grok", { intent: "keep this" }, { host: "grok", intent: "keep this" });
      const after = shortSessionIndex(root).map((note) => note.text).sort();
      expect(after).toEqual(["The body stays.", "keep this"]);
      if (fs.existsSync(lawsPath(root))) {
        expect(fs.readFileSync(lawsPath(root), "utf8")).not.toContain("The body stays.");
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps a replaced line on disk and returns only the current line", () => {
    const root = tempRoot("xray-notes-supersede-");
    try {
      rememberSessionNote(root, "use vitest", { now: "2026-01-01T00:00:00.000Z" });
      const saved = supersedeSessionNote(root, "use vitest", "use node:test", {
        now: "2026-10-06T00:00:00.000Z",
      });
      expect(saved.kept).toBe(true);
      const view = shortSessionIndex(root).map((note) => note.text);
      expect(view).toEqual(["use node:test"]);
      const stored = JSON.parse(fs.readFileSync(sessionNotesPath(root), "utf8")) as {
        notes: Array<{ text: string; superseded_by?: string }>;
      };
      expect(stored.notes).toHaveLength(2);
      const older = stored.notes.find((note) => note.text === "use vitest");
      expect(older?.superseded_by).toBe(saved.id);
      expect(sessionNoteHistory(root, "use node:test").map((note) => note.text)).toEqual(["use vitest"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("a new pickup supersedes the old pickup and leaves the body current", () => {
    const root = tempRoot("xray-notes-pickup-slot-");
    try {
      rememberSessionNote(root, "first pickup", { now: "2026-10-01T00:00:00.000Z", slot: "pickup" });
      rememberSessionNote(root, "the body stays", { now: "2026-10-01T00:00:00.000Z" });
      rememberSessionNote(root, "second pickup", { now: "2026-10-06T00:00:00.000Z", slot: "pickup" });
      expect(shortSessionIndex(root).map((note) => note.text).sort()).toEqual([
        "second pickup",
        "the body stays",
      ]);
      expect(sessionNoteHistory(root, "second pickup").map((note) => note.text)).toEqual(["first pickup"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not drop a superseded line when the stale window passes", () => {
    const root = tempRoot("xray-notes-keep-history-");
    try {
      rememberSessionNote(root, "old decision", { now: "2020-01-01T00:00:00.000Z" });
      supersedeSessionNote(root, "old decision", "new decision", { now: "2026-10-06T00:00:00.000Z" });
      rememberSessionNote(root, "lone stale", { now: "2020-01-01T00:00:00.000Z" });
      const cleaned = dropStaleSessionNotes(root, { now: "2026-10-06T00:00:00.000Z" });
      expect(cleaned.dropped).toBe(1);
      const stored = JSON.parse(fs.readFileSync(sessionNotesPath(root), "utf8")) as {
        notes: Array<{ text: string }>;
      };
      expect(stored.notes.map((note) => note.text).sort()).toEqual(["new decision", "old decision"]);
      expect(shortSessionIndex(root).map((note) => note.text)).toEqual(["new decision"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

});
