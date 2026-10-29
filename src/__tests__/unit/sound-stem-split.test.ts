import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const split = requireCjs(path.join(root, "scripts/foundry/stem-split.cjs")) as {
  collect: () => Promise<{
    rows: { name: string; flag: string; centroid: number; peakHz: number }[];
    meta: {
      padMaxAbs: number;
      kickMaxAbs: number;
      hatMaxAbs: number;
      pluckMaxAbs: number;
      stabMaxAbs: number;
      sideScaleDelta: number;
    };
  }>;
};

describe("v7c stem split", () => {
  it("rebuilds every v7c source without changing the bed", async () => {
    const { rows, meta } = await split.collect();
    expect(meta.padMaxAbs).toBeLessThan(1e-8);
    expect(meta.kickMaxAbs).toBeLessThan(1e-8);
    expect(meta.hatMaxAbs).toBeLessThan(1e-8);
    expect(meta.pluckMaxAbs).toBeLessThan(1e-8);
    expect(meta.stabMaxAbs).toBeLessThan(1e-8);
    expect(meta.sideScaleDelta).toBeLessThan(1e-6);
    const names = rows.map((row) => row.name);
    expect(names).toContain("hat-closed");
    expect(names).toContain("hat-open");
    expect(names).toContain("kick-body");
    expect(names).toContain("kick-tick");
    expect(names).toContain("overlay-sub");
    expect(names).toContain("overlay-mid");
    expect(names).toContain("echo-mid");
    expect(names).toContain("echo-side");
    expect(names).toContain("room-pluck");
    expect(names).toContain("room-stab");
    expect(names).toContain("pluck-fm");
    const hat = rows.find((row) => row.name === "hat-closed");
    expect(hat?.centroid).toBeGreaterThan(5000);
    expect(hat?.flag).toContain("tick");
    const tick = rows.find((row) => row.name === "kick-tick");
    expect(tick?.peakHz).toBeGreaterThan(2600);
    expect(tick?.peakHz).toBeLessThan(3000);
  }, 60000);
});
