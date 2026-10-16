import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { dispatchTool } from "../../integrations/hooks/goggles-mcp.mjs";
import { holdPlane, look } from "../../integrations/hooks/goggles-pipeline.mjs";
import {
  applyStationHeat,
  writeStationMarkdown,
} from "../../integrations/hooks/station-hook-runtime.mjs";
import {
  formatSleevePointer,
  formatSleeveReading,
  readSleeve,
  runFoundryMill,
  inspectStitch,
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
  it("holds one plane name and ignores a name with a space", () => {
    const root = tempRoot("xray-sleeve-plane-");
    try {
      holdPlane(root, "memory recall");
      expect(fs.existsSync(path.join(root, ".xray", "state", "goggles-plane.json"))).toBe(false);
      holdPlane(root, "memory-recall");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "goggles-plane.json"), "utf8")).plane,
      ).toBe("memory-recall");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

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

  it("does not store a machine plugin as a mill failure", () => {
    const only = inspectStitch({ ok: false, failed: ["machinePlugin"] }) as Stitch;
    expect(only.on).toBe(true);
    expect(only.at).toEqual(["inspect --skip-live"]);
    const blocked = inspectStitch({ ok: false, failed: ["machinePlugin", "receipt"] }) as Stitch;
    expect(blocked.on).toBe(false);
    expect(blocked.at).toEqual(["receipt"]);
  });

  it("counts a machine plugin as a passed mill", () => {
    const root = tempRoot("xray-sleeve-plugin-");
    try {
      standExo(root);
      const version = JSON.parse(
        fs.readFileSync(path.join(root, "scripts", "foundry", "package.json"), "utf8"),
      ).version as string;
      fs.mkdirSync(path.join(root, ".xray", "state"), { recursive: true });
      fs.writeFileSync(
        path.join(root, ".xray", "state", "sleeve-mill.json"),
        `${JSON.stringify({
          ok: false,
          failed: ["machinePlugin"],
          stamp: `${version}||`,
          ranAt: "2026-10-07T00:00:00.000Z",
        })}\n`,
      );
      const passed = readSleeve(root);
      expect(passed.missing).not.toContain("foundry");
      expect(atOf(passed, "foundry")).toEqual(["inspect --skip-live"]);
      const raw = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8"),
      ) as { failed?: string[] };
      raw.failed = ["machinePlugin", "receipt"];
      fs.writeFileSync(
        path.join(root, ".xray", "state", "sleeve-mill.json"),
        `${JSON.stringify(raw)}\n`,
      );
      const blocked = readSleeve(root);
      expect(blocked.missing).toContain("foundry");
      expect(atOf(blocked, "foundry")).toEqual(["receipt"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
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
      expect(first.card).toContain("Plane: (none)");
      expect(first.card).toContain("Judgement: start");
      expect(first.card).toContain("Payments: off");
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
      expect(kept.card).toContain("Plane: (none)");
      expect(kept.card).toContain("Judgement: continue");
      expect(kept.card).toContain("Payments: off");
      expect(kept.card).toContain("Intent: goggles");
      expect(kept.card).not.toContain("It views one plane");
      fs.writeFileSync(
        path.join(root, ".xray", "state", "goggles-plane.json"),
        `${JSON.stringify({ plane: "memory-recall" })}\n`,
      );
      const resumed = heatCard(root, {
        hookEvent: "session_start",
        intent: "a new opening prompt",
      });
      expect(resumed.card).toContain("Intent: goggles");
      expect(resumed.card).not.toContain("a new opening prompt");
      expect(resumed.card).toContain("Plane: memory-recall");
      expect(resumed.card).toContain("Judgement: continue");
      expect(resumed.card).toContain("Payments: off");
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
      expect(working.judgement).toBe("continue");
      expect(working.payments).toBe("off");
      expect(working.plane).toBe("memory-recall");
      expect(working.retries).toBe(0);

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
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "goggles-plane.json"), "utf8")).plane,
      ).toBe("ground");
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
      expect(stalled.card).toContain("Judgement: retry 1");
      const held = heatCard(root, { hookEvent: "user_prompt_submit", intent: "goggles" });
      expect(held.card).toContain("Judgement: retry 1");
      expect(held.card).toContain("Sleeve: off foundry");
      expect(stalled.card).toContain("Payments: off");
      expect(stalled.card).toContain("Plane: ground");
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
      expect(refreshed.card).toContain("Judgement: retry 2");
      expect(refreshed.card).toContain("Payments: off");
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
      expect(restored.card).toContain("Judgement: continue");
      const aside = heatCard(root, { hookEvent: "user_prompt_submit", intent: "pay the invoice" });
      expect(aside.card).toContain("Intent: goggles");
      expect(aside.card).not.toContain("pay the invoice");
      expect(aside.card).toContain("Payments: off");
      expect(aside.card).toContain("Judgement: continue");
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
      expect(replaced.card).toContain("Judgement: stop");
      expect(replaced.card).toContain("Payments: off");
      const paying = heatCard(root, { hookEvent: "pre_tool", intent: "pay the invoice" });
      expect(paying.card).toContain("Intent: pay the invoice");
      expect(paying.card).toContain("Payments: on");
      expect(paying.card).toContain("Judgement: stop");
      expect(paying.card).not.toContain("Payments: off");
      expect(
        JSON.parse(fs.readFileSync(path.join(root, ".xray", "state", "sleeve-mill.json"), "utf8")).ranAt,
      ).toBe(afterMill);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 90000);
});
