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

function standHere(root: string): void {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.symlinkSync(path.join(SUIT, "scripts", "foundry"), path.join(root, "scripts", "foundry"));
}

function holdPlane(root: string, plane: string): void {
  const dir = path.join(root, ".xray", "state");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "goggles-reading.json"),
    `${JSON.stringify({ plane })}\n`,
  );
}

function enterGoggles(root: string): void {
  const source = path.join(SUIT, "docs-site", "docs", "plates", "goggles.md");
  const dest = path.join(root, ".xray", "state", "plates", "goggles.md");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
  fs.writeFileSync(
    path.join(root, ".xray", "state", "STATION.md"),
    "# Station\n\nIntent: goggles\nPlate: goggles — .xray/state/plates/goggles.md\n",
  );
}

function holdWorking(root: string): void {
  const dest = path.join(root, ".xray", "state", "repertoire-working.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify({ host: "grok" })}\n`);
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

  it("is off when this root is not in those four places", () => {
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

  it("turns on when the plane is held, the plate is worn, state is on disk, and the mill answers", () => {
    const root = tempRoot("xray-sleeve-on-");
    try {
      standHere(root);
      holdPlane(root, "routing");
      enterGoggles(root);
      holdWorking(root);
      const sleeve = readSleeve(root);
      expect(sleeve.on).toBe(true);
      expect(sleeve.missing).toEqual([]);
      expect(atOf(sleeve, "loop")).toEqual(["routing"]);
      expect(atOf(sleeve, "domain")).toEqual(["goggles"]);
      expect(atOf(sleeve, "state")).toEqual([
        ".xray/state/STATION.md",
        ".xray/state/repertoire-working.json",
      ]);
      expect(atOf(sleeve, "foundry")).toEqual(["scripts/foundry"]);
      expect(formatSleeveReading(sleeve)).toContain("Loop: routing");
      expect(formatSleeveReading(sleeve)).toContain("Domain: goggles");
      expect(formatSleeveReading(sleeve)).toContain("Foundry: scripts/foundry");
      holdPlane(root, "loop");
      expect(readSleeve(root).missing).toContain("loop");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("writes Sleeve: on only after heat has entered the four", async () => {
    const root = tempRoot("xray-sleeve-heat-");
    try {
      standHere(root);
      holdPlane(root, "routing");
      const heat = applyStationHeat(
        root,
        "grok",
        { hookEvent: "pre_tool", intent: "goggles" },
        { host: "grok", intent: "goggles" },
      );
      expect(heat.sleeveLine).toBe("Sleeve: on");
      const dest = writeStationMarkdown(root, {
        ...heat,
        host: "grok",
        suit_profile: "frontier",
      });
      const card = fs.readFileSync(dest || "", "utf8");
      expect(card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual(["Sleeve: on"]);
      expect(card).not.toContain("Loop:");
      expect(card).not.toContain("scripts/foundry");
      const text = look(["digest", "memory-recall"], root).text;
      expect(text).toContain("Loop: routing");
      expect(text).toContain("Domain: goggles");
      expect(text).toContain("Foundry: scripts/foundry");
      expect(text).toContain(".xray/state/repertoire-working.json");

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
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
