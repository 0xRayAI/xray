import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { dispatchTool } from "../../integrations/hooks/goggles-mcp.mjs";
import { look } from "../../integrations/hooks/goggles-pipeline.mjs";
import {
  lawsPath,
  rememberSessionNote,
  supersedeSessionNote,
} from "../../integrations/hooks/session-note-index.mjs";
import {
  applyStationHeat,
  writeStationMarkdown,
} from "../../integrations/hooks/station-hook-runtime.mjs";
import {
  formatCascadePointer,
  readWakeCascade,
} from "../../integrations/hooks/wake-cascade.mjs";

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

type WorkingFile = {
  cascade?: { plane?: string; notes?: number; laws?: string[] };
};

type LookCard = {
  plane?: string;
  cascade?: {
    plane?: string;
    notes?: Array<{ id?: string; text?: string }>;
  };
};

describe("wake cascade", () => {
  it("names record-map and does not open the law file", () => {
    const root = tempRoot("xray-cascade-empty-");
    try {
      const cascade = readWakeCascade(root);
      expect(cascade.plane).toBe("record-map");
      expect(cascade.station).toBe(".xray/state/STATION.md");
      expect(cascade.notesPage).toBe(".xray/state/NOTES.md");
      expect(cascade.notes).toEqual([]);
      expect(cascade.laws).toEqual([]);
      expect(formatCascadePointer(cascade)).toBe("Cascade: record-map · notes 0 current");
      const reading = formatCascadePointer(cascade);
      expect(reading).not.toContain("session-notes");
      expect(fs.existsSync(lawsPath(root))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("puts the current line on the look and only the count on the card", async () => {
    const root = tempRoot("xray-cascade-sing-");
    try {
      rememberSessionNote(root, "index line alpha stays history", {
        now: "2026-10-01T00:00:00.000Z",
      });
      const saved = supersedeSessionNote(
        root,
        "index line alpha stays history",
        "index line beta is current",
        { now: "2026-10-06T00:00:00.000Z" },
      );
      expect(saved.kept).toBe(true);
      const heat = applyStationHeat(
        root,
        "grok",
        { hookEvent: "pre_tool", intent: "keep the ticket" },
        { host: "grok", intent: "keep the ticket" },
      );
      expect(heat.cascadeLine).toBe("Cascade: record-map · notes 1 current");
      const dest = writeStationMarkdown(root, {
        ...heat,
        host: "grok",
        suit_profile: "frontier",
      });
      const card = fs.readFileSync(dest || "", "utf8");
      expect(card).toContain("Intent: keep the ticket");
      expect(card).toContain("Cascade: record-map · notes 1 current");
      expect(card).not.toContain("index line beta is current");
      expect(card).not.toContain("index line alpha stays history");
      const again = writeStationMarkdown(root, {
        ...heat,
        host: "grok",
        suit_profile: "frontier",
      });
      const twice = fs.readFileSync(again || "", "utf8");
      const cascadeLines = twice.split("\n").filter((line) => line.startsWith("Cascade:"));
      expect(cascadeLines).toEqual(["Cascade: record-map · notes 1 current"]);

      const reading = look(["digest", "memory-recall"], root).text;
      expect(reading).toContain("Cascade: record-map");
      expect(reading).toContain("Station: .xray/state/STATION.md");
      expect(reading).toContain("Notes page: .xray/state/NOTES.md");
      expect(reading).toContain("index line beta is current");
      expect(reading).not.toContain("index line alpha stays history");
      expect(reading).toContain(`- ${saved.id}`);

      const ground = look(["digest", "ground"], root).text;
      expect(ground.startsWith("Plane: ground")).toBe(true);
      expect(ground).not.toContain("index line beta is current");

      const laws = lawsPath(root);
      if (fs.existsSync(laws)) {
        expect(fs.readFileSync(laws, "utf8")).not.toContain("index line beta is current");
      }
      const working = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "repertoire-working.json"), "utf8"),
      ) as WorkingFile;
      expect(working.cascade?.plane).toBe("record-map");
      expect(working.cascade?.notes).toBe(1);
      expect((working.cascade?.laws ?? []).join(" ")).not.toContain("index line");
      const lawLine = (working.cascade?.laws ?? []).length
        ? `Laws: ${(working.cascade?.laws ?? []).join(", ")}`
        : "Laws: (none yet)";
      expect(reading).toContain(lawLine);

      const looked = await dispatchTool(
        "look",
        { outer: "digest", plane: "memory-recall" },
        root,
      );
      expect(looked.isError).toBe(false);
      const payload = looked.payload.content as LookCard;
      expect(payload.plane).toBe("memory-recall");
      expect(payload.cascade?.plane).toBe("record-map");
      expect(payload.cascade?.notes?.map((note) => note.text)).toEqual([
        "index line beta is current",
      ]);

      const plain = await dispatchTool("look", { outer: "digest", plane: "ground" }, root);
      const plainCard = plain.payload.content as LookCard;
      expect(plainCard.cascade).toBeUndefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
