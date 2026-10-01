/**
 * Goggles on status and health.
 * Organ present is not Kind 0. Quiet is a match. No phone-home.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORN_PLANES = ["dichotomy", "syncopate", "synthesis", "digest", "triage", "loop"];

const ORGAN_PAIRS = [
  ["dist/integrations/hooks/goggles-pipeline.mjs", "dist/integrations/hooks/goggles-planes.json"],
  ["src/integrations/hooks/goggles-pipeline.mjs", "src/integrations/hooks/goggles-planes.json"],
] as const;

export type GogglesStatus = {
  organPresent: boolean;
  kind0Text: string;
  kind0Quiet: boolean;
  kind0Label: string;
  organLine: string;
};

function organPair(packageRoot: string): readonly [string, string] | null {
  for (const pair of ORGAN_PAIRS) {
    if (existsSync(join(packageRoot, pair[0])) && existsSync(join(packageRoot, pair[1]))) {
      return pair;
    }
  }
  return null;
}

function lensText(cwd: string): { found: boolean; text: string } {
  const file = join(cwd, ".xray", "state", "LENS.md");
  if (!existsSync(file)) return { found: false, text: "" };
  try {
    return { found: true, text: readFileSync(file, "utf8").trim() };
  } catch {
    return { found: false, text: "" };
  }
}

function mapDrift(packageRoot: string, planesRel: string): string {
  try {
    const data = JSON.parse(readFileSync(join(packageRoot, planesRel), "utf8")) as { planes?: unknown };
    const map = Array.isArray(data.planes) ? data.planes.map((name) => String(name)) : [];
    const same = map.length === WORN_PLANES.length && map.every((name, index) => name === WORN_PLANES[index]);
    return same ? "" : "Actuality. Drift: worn is not the map.";
  } catch {
    return "";
  }
}

export function probeGoggles(packageRoot: string, cwd: string): GogglesStatus {
  const pair = organPair(packageRoot);
  const organPresent = pair !== null;
  const lens = lensText(cwd);
  let kind0Text = "";
  let kind0Label = "(no LENS yet)";
  let kind0Quiet = false;
  if (lens.found) {
    kind0Text = lens.text;
    if (!lens.text) {
      kind0Quiet = true;
      kind0Label = "quiet (match)";
    } else {
      kind0Label = lens.text;
    }
  } else if (pair) {
    const drift = mapDrift(packageRoot, pair[1]);
    if (drift) {
      kind0Text = drift;
      kind0Label = drift;
    }
  }
  return {
    organPresent,
    kind0Text,
    kind0Quiet,
    kind0Label,
    organLine: organPresent ? "Goggles: worn" : "Goggles: not found",
  };
}

export function formatGogglesStatus(probe: GogglesStatus): string[] {
  return [probe.organLine, `Kind 0: ${probe.kind0Label}`];
}
