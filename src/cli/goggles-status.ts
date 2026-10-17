/**
 * Goggles on status and health.
 * The line is whether the organ is worn.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

const ORGAN_PAIRS = [
  ["dist/integrations/hooks/goggles-pipeline.mjs", "dist/integrations/hooks/goggles-planes.json"],
  ["src/integrations/hooks/goggles-pipeline.mjs", "src/integrations/hooks/goggles-planes.json"],
] as const;

export type GogglesStatus = {
  organPresent: boolean;
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

export function probeGoggles(packageRoot: string, _cwd: string): GogglesStatus {
  const organPresent = organPair(packageRoot) !== null;
  return {
    organPresent,
    organLine: organPresent ? "Goggles: worn" : "Goggles: not found",
  };
}

export function formatGogglesStatus(probe: GogglesStatus): string[] {
  return [probe.organLine];
}
