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

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

type Stitch = { name?: string; on?: boolean; at?: string[] };

type SleeveFile = {
  on?: boolean;
  missing?: string[];
  stitches?: Stitch[];
};

type LookCard = {
  plane?: string;
  sleeve?: SleeveFile;
};

const DOMAIN = ["glossary", "goggles", "grokbot", "host-pack", "kits", "suit"];
const STATE = ["house", "review"];
const READING = [
  "Sleeve: on",
  "Loop: on",
  "Domain: glossary, goggles, grokbot, host-pack, kits, suit",
  "State: house, review",
  "Foundry: scripts/foundry",
].join("\n");

function atOf(sleeve: SleeveFile, name: string): string[] {
  const row = (sleeve.stitches ?? []).find((item) => item.name === name);
  return row?.at ?? [];
}

describe("sleeve", () => {
  it("keeps the four outer readings and the ground card", () => {
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

  it("lists the same four stitches on a memory look and a suit look", () => {
    const root = tempRoot("xray-sleeve-look-");
    try {
      const sleeve = readSleeve(root);
      expect(sleeve.on).toBe(true);
      expect(sleeve.missing).toEqual([]);
      expect(atOf(sleeve, "loop")).toEqual([]);
      expect(atOf(sleeve, "domain")).toEqual(DOMAIN);
      expect(atOf(sleeve, "state")).toEqual(STATE);
      expect(atOf(sleeve, "foundry")).toEqual(["scripts/foundry"]);
      expect(formatSleevePointer(sleeve)).toBe("Sleeve: on");
      expect(formatSleeveReading(sleeve)).toBe(READING);
      for (const name of sleeve.stitches) {
        expect(Object.keys(name).sort()).toEqual(["at", "name", "on"]);
      }
      for (const plane of ["memory-recall", "suit-wear", "suit-organs", "suit-settings", "trail-state"]) {
        const text = look(["digest", plane], root).text;
        expect(text).toContain(READING);
        expect(text).not.toContain("plate_type");
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("names only the missing stitches", () => {
    const home = tempRoot("xray-sleeve-off-");
    try {
      const plates = path.join(home, "docs-site", "docs", "plates");
      fs.mkdirSync(plates, { recursive: true });
      fs.writeFileSync(
        path.join(plates, "glossary.md"),
        "---\nplate_type: domain model\n---\n\n# Glossary\n\nbody stays off the card\n",
      );
      const planes = path.join(home, "planes.json");
      fs.writeFileSync(
        planes,
        `${JSON.stringify({ planes: ["dichotomy", "syncopate", "synthesis", "digest", "triage"] })}\n`,
      );
      const sleeve = readSleeve(home, { home, planesFile: planes });
      expect(sleeve.on).toBe(false);
      expect(sleeve.missing).toEqual(["loop", "state", "foundry"]);
      expect(formatSleevePointer(sleeve)).toBe("Sleeve: off loop, state, foundry");
      const reading = formatSleeveReading(sleeve);
      expect(reading).toContain("Loop: off");
      expect(reading).toContain("Domain: glossary");
      expect(reading).toContain("State: off");
      expect(reading).toContain("Foundry: off");
      expect(reading).not.toContain("body stays off the card");
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("writes Sleeve: on on the card and the stitches on the look", async () => {
    const root = tempRoot("xray-sleeve-card-");
    try {
      const heat = applyStationHeat(
        root,
        "grok",
        { hookEvent: "pre_tool", intent: "keep the ticket" },
        { host: "grok", intent: "keep the ticket" },
      );
      expect(heat.sleeveLine).toBe("Sleeve: on");
      const dest = writeStationMarkdown(root, {
        ...heat,
        host: "grok",
        suit_profile: "frontier",
      });
      const card = fs.readFileSync(dest || "", "utf8");
      expect(card.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual(["Sleeve: on"]);
      expect(card).not.toContain("glossary");
      expect(card).not.toContain("scripts/foundry");
      const again = writeStationMarkdown(root, {
        ...heat,
        host: "grok",
        suit_profile: "frontier",
      });
      const twice = fs.readFileSync(again || "", "utf8");
      expect(twice.split("\n").filter((line) => line.startsWith("Sleeve:"))).toEqual(["Sleeve: on"]);

      const working = JSON.parse(
        fs.readFileSync(path.join(root, ".xray", "state", "repertoire-working.json"), "utf8"),
      ) as { sleeve?: SleeveFile };
      expect(working.sleeve?.on).toBe(true);
      expect(atOf(working.sleeve || {}, "domain")).toEqual(DOMAIN);
      expect(JSON.stringify(working.sleeve)).not.toContain("plate_type");

      const looked = await dispatchTool(
        "look",
        { outer: "digest", plane: "memory-recall" },
        root,
      );
      expect(looked.isError).toBe(false);
      const payload = looked.payload.content as LookCard;
      expect(payload.sleeve?.on).toBe(true);
      expect(atOf(payload.sleeve || {}, "foundry")).toEqual(["scripts/foundry"]);

      const plain = await dispatchTool("look", { outer: "digest", plane: "ground" }, root);
      const plainCard = plain.payload.content as LookCard;
      expect(plainCard.sleeve).toBeUndefined();

      const loop = await dispatchTool("look", { outer: "loop" }, root);
      expect(loop.payload.content).toBe("The reading is loop.");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
