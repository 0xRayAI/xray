import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { dispatchTool } from "../../integrations/hooks/goggles-mcp.mjs";
import { look } from "../../integrations/hooks/goggles-pipeline.mjs";
import {
  applyStationHeat,
  writeStationMarkdown,
} from "../../integrations/hooks/station-hook-runtime.mjs";
import {
  formatSleevePointer,
  formatSleeveReading,
  readSleeve,
  runFoundryMill,
} from "../../integrations/hooks/sleeve.mjs";

const SUIT = path.resolve(__dirname, "..", "..", "..");

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

type Stitch = { name?: string; on?: boolean; at?: string[] };
type SleeveFile = { on?: boolean; missing?: string[]; stitches?: Stitch[] };
type LookCard = { plane?: string; sleeve?: SleeveFile };

function atOf(sleeve: SleeveFile, name: string): string[] {
  const row = (sleeve.stitches ?? []).find((item) => item.name === name);
  return row?.at ?? [];
}

function linkFoundry(root: string): void {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.symlinkSync(path.join(SUIT, "scripts", "foundry"), path.join(root, "scripts", "foundry"));
}

function standExo(root: string): void {
  fs.writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "0xray", version: "0.0.0" })}\n`,
  );
  fs.symlinkSync(path.join(SUIT, "docs-site"), path.join(root, "docs-site"));
  linkFoundry(root);
}

function heatCard(
  root: string,
  extra: { hookEvent: string; intent: string },
): { card: string; sleeveLine: unknown } {
  const heat = applyStationHeat(root, "grok", extra, {});
  const dest = writeStationMarkdown(root, {
    ...heat,
    host: "grok",
    suit_profile: "frontier",
  });
  return {
    card: fs.readFileSync(dest || "", "utf8"),
    sleeveLine: (heat as { sleeveLine?: unknown }).sleeveLine,
  };
}

describe("sleeve", () => {
  it("keeps the outer readings and leaves ground, routing, and house alone", () => {
    expect(look(["loop"]).text).toBe("The reading is loop.");
    expect(look(["domain"]).text).toBe("");
    expect(look(["state"]).text).toBe("");
    expect(look(["eco"]).text).toBe("");
    expect(look(["outer-loop"]).text).toBe("Name one plane.");
    const ground = look(["digest", "ground"]).text;
    expect(ground.startsWith("Plane: ground")).toBe(true);
    expect(ground).not.toContain("Sleeve:");
    expect(look(["digest", "routing"]).text).not.toContain("Sleeve:");
    expect(look(["digest", "house"]).text).not.toContain("Sleeve:");
  });

  it("is off when this root has no wake, no plate, no ticket, and no mill", () => {
    const root = tempRoot("xray-sleeve-off-");
    try {
      const sleeve = readSleeve(root);
      expect(sleeve.on).toBe(false);
      expect(sleeve.missing).toEqual(["loop", "domain", "state", "foundry"]);
      expect(formatSleevePointer(sleeve)).toBe("Sleeve: off loop, domain, state, foundry");
      expect(formatSleeveReading(sleeve)).toBe(
        [
          "Sleeve: off loop, domain, state, foundry",
          "Loop: off",
          "Domain: off",
          "State: off",
          "Foundry: off",
        ].join("\n"),
      );
      const text = look(["digest", "memory-recall"], root).text;
      expect(text).toContain("Sleeve: off loop, domain, state, foundry");
      expect(text).not.toContain("plate_type");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("names the failed mill check when inspect runs and the root is not the exo", () => {
    const root = tempRoot("xray-sleeve-receipt-");
    try {
      linkFoundry(root);
      const before = readSleeve(root);
      expect(atOf(before, "foundry")).toEqual([]);
      expect(formatSleeveReading(before)).toContain("Foundry: off");
      runFoundryMill(root);
      const sleeve = readSleeve(root);
      expect(sleeve.on).toBe(false);
      expect(sleeve.missing).toContain("foundry");
      expect(atOf(sleeve, "foundry")).toEqual(["receipt"]);
      expect(formatSleeveReading(sleeve)).toContain("Foundry: receipt");
      const again = readSleeve(root);
      expect(atOf(again, "foundry")).toEqual(["receipt"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("turns on only after the wake returns, the plate is the work, the ticket reads back, and inspect passes", async () => {
    const root = tempRoot("xray-sleeve-on-");
    try {
      standExo(root);
      const first = heatCard(root, { hookEvent: "pre_tool", intent: "goggles" });
      expect(first.sleeveLine).toBeUndefined();
      const opened = readSleeve(root);
      expect(opened.on).toBe(false);
      expect(first.card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual([
        "Sleeve: off loop, domain, state, foundry",
      ]);
      expect(opened.missing).toEqual(["loop", "state", "foundry"]);
      expect(atOf(opened, "domain")).toEqual(["goggles"]);
      expect(atOf(opened, "state")).toEqual([]);
      expect(atOf(opened, "foundry")).toEqual([]);

      const kept = heatCard(root, {
        hookEvent: "pre_compact",
        intent: "a compact summary that must stay off the ticket",
      });
      expect(kept.sleeveLine).toBeUndefined();
      const sleeve = readSleeve(root);
      expect(sleeve.on).toBe(true);
      expect(sleeve.missing).toEqual([]);
      expect(atOf(sleeve, "loop")).toEqual(["goggles"]);
      expect(atOf(sleeve, "domain")).toEqual(["goggles"]);
      expect(atOf(sleeve, "state")).toEqual([".xray/state/STATION.md"]);
      expect(atOf(sleeve, "foundry")).toEqual(["inspect --skip-live"]);
      expect(kept.card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual([
        "Sleeve: on",
      ]);
      expect(kept.card).toContain("Intent: goggles");
      expect(kept.card).not.toContain("It views one plane");
      const resumed = heatCard(root, {
        hookEvent: "session_start",
        intent: "a new opening prompt",
      });
      expect(resumed.card).toContain("Intent: goggles");
      expect(resumed.card).not.toContain("a new opening prompt");
      expect(resumed.card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual([
        "Sleeve: on",
      ]);
      expect(kept.card).not.toContain("Loop:");
      expect(kept.card).not.toContain("Domain:");
      expect(kept.card).not.toContain("Foundry:");
      const text = look(["digest", "memory-recall"], root).text;
      expect(text).toContain("Loop: goggles");
      expect(text).toContain("Domain: goggles");
      expect(text).toContain("State: .xray/state/STATION.md");
      expect(text).toContain("Foundry: inspect --skip-live");

      const working = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "repertoire-working.json"), "utf8"),
      );
      expect(working.priorIntent).toBe("goggles");
      expect(working.intent).toBe("goggles");
      expect(working.sleeve?.on).toBe(true);

      const looked = await dispatchTool(
        "look",
        { outer: "digest", plane: "memory-recall" },
        root,
      );
      const payload = looked.payload.content as LookCard;
      expect(payload.sleeve?.on).toBe(true);
      expect(atOf(payload.sleeve || {}, "domain")).toEqual(["goggles"]);
      const plain = await dispatchTool("look", { outer: "digest", plane: "ground" }, root);
      expect((plain.payload.content as LookCard).sleeve).toBeUndefined();
      const loop = await dispatchTool("look", { outer: "loop" }, root);
      expect(loop.payload.content).toBe("The reading is loop.");

      const ranAt = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8"),
      ).ranAt;
      look(["digest", "memory-recall"], root);
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8")).ranAt,
      ).toBe(ranAt);
      fs.mkdirSync(path.join(root, ".opencode", "skills", "orchestrator"), { recursive: true });
      fs.writeFileSync(path.join(root, ".opencode", "skills", "orchestrator", "SKILL.md"), "# extra\n");
      expect(atOf(readSleeve(root), "foundry")).toEqual(["stale"]);
      const stalled = heatCard(root, { hookEvent: "user_prompt_submit", intent: "goggles" });
      expect(stalled.card).toContain("Intent: goggles");
      expect(stalled.card).toContain("Plan: The work is the mill.");
      expect(stalled.card).toContain("Sleeve: off foundry");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8")).ranAt,
      ).toBe(ranAt);
      fs.rmSync(path.join(root, ".opencode", "skills", "orchestrator"), { recursive: true, force: true });
      expect(atOf(readSleeve(root), "foundry")).toEqual(["inspect --skip-live"]);

      fs.writeFileSync(path.join(root, ".xray", "state", "plates", "goggles.md"), "stale plate body\n");
      expect(atOf(readSleeve(root), "domain")).toEqual([]);
      const refreshed = heatCard(root, {
        hookEvent: "pre_compact",
        intent: "another compact summary that stays off the ticket",
      });
      expect(refreshed.card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual([
        "Sleeve: off domain",
      ]);
      expect(refreshed.card).toContain("Plan: The work is the plate.");
      const worn = fs.readFileSync(path.join(root, ".xray", "state", "plates", "goggles.md"), "utf8");
      expect(worn).toContain("It views one plane");
      expect(refreshed.card).not.toContain("It views one plane");
      expect(atOf(readSleeve(root), "domain")).toEqual(["goggles"]);
      const restored = heatCard(root, {
        hookEvent: "pre_compact",
        intent: "a third compact summary that stays off the ticket",
      });
      expect(restored.card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual([
        "Sleeve: on",
      ]);
      expect(restored.card).not.toContain("The work is the plate.");
      expect(restored.card).toContain("Plan: (none)");
      const afterMill = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8"),
      ).ranAt;

      const replaced = heatCard(root, {
        hookEvent: "pre_tool",
        intent: "paint the hangar door blue",
      });
      const after = readSleeve(root);
      expect(after.on).toBe(false);
      expect(after.missing).toEqual(["loop", "domain", "state"]);
      expect(atOf(after, "loop")).toEqual([]);
      expect(atOf(after, "foundry")).toEqual(["inspect --skip-live"]);
      expect(replaced.card).toContain("Intent: paint the hangar door blue");
      expect(replaced.card).not.toContain("Sleeve: on");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8")).ranAt,
      ).toBe(afterMill);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 90000);
});
