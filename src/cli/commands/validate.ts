/**
 * Consumer wear check — not leftover OpenCode init.sh.
 *
 * `npx 0xray validate` used to shell `.opencode/init.sh` (macOS `md5`,
 * `.opencode/enforcer-config.json`). That is factory boot theater, not wear.
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frameworkLogger } from "../../core/framework-logger.js";

const requireCjs = createRequire(import.meta.url);
const suitSeat = requireCjs("../../../scripts/node/suit-seat.cjs") as {
  fastenedPlantSkills: (cwd: string) => string[];
  isGitWorkTree: (cwd: string) => boolean;
};
const mintSuit = requireCjs("../../../scripts/foundry/mint-suit.cjs") as {
  staleShippedSkillBodies: (cwd: string, packageRoot: string) => string[];
};

/** Same paths as `REQUIRED_PACK_PATHS` in assert-packed-dist-cli.mjs — typed here so src/cli does not import untyped .mjs. */
export const VALIDATE_PACK_PATHS: readonly string[] = [
  "dist/cli/index.js",
  "dist/mcps/orchestrator.server.js",
  "dist/integrations/grok/hooks/session-start.js",
  "dist/integrations/cursor/hooks/hooks.json",
  "dist/integrations/cursor/hooks/pre-tool-use.js",
  "dist/integrations/cursor/hooks/pre-compact.js",
  "dist/integrations/cursor/hooks/after-file-edit.js",
  "dist/integrations/cursor/hooks/cursor-hook-utils.js",
  "dist/integrations/cursor/hooks/cursor-usage-receipt.js",
  "dist/integrations/cursor/hooks/xray-cloud-hook.sh",
  "dist/integrations/cursor/hooks/pre-tool-use.sh",
  "dist/integrations/cursor/hooks/pre-compact.sh",
  "dist/integrations/cursor/hooks/after-file-edit.sh",
  "dist/integrations/hooks/plates.cjs",
  "dist/integrations/hooks/goggles-pipeline.mjs",
  "dist/integrations/hooks/goggles-planes.json",
  "dist/integrations/hooks/goggles-mcp.mjs",
  "scripts/mjs/run-goggles-mcp.mjs",
  "scripts/node/suit-seat.cjs",
  "docs-site/docs/plates/memory-recall.md",
  "docs-site/docs/plates/processor.md",
  "docs-site/docs/plates/goggles.md",
  "docs-site/docs/plates/suit.md",
  "docs-site/docs/plates/kits.md",
  "docs-site/docs/plates/host-pack.md",
  "docs-site/docs/plates/glossary.md",
];

export const CONSUMER_WEAR_PATHS = [
  "AGENTS.md",
  ".mcp.json",
  ".xray/codex.json",
  ".xray/features.json",
  ".cursor/hooks.json",
  ".cursor/hooks/pre-tool-use.sh",
  ".cursor/hooks/xray-cloud-hook.sh",
] as const;

/** Skipped on a folder that is not a git work tree. Wear does not install them there. */
export const CONSUMER_HOOK_PATHS = [
  ".cursor/hooks.json",
  ".cursor/hooks/pre-tool-use.sh",
  ".cursor/hooks/xray-cloud-hook.sh",
] as const;

export const HOOKS_SKIPPED_DETAIL = "hooks skipped because this folder is not a git work tree";

export const MILL_PLANT_SKILLS = ["mill", "inspect"] as const;

export type ValidateCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type ValidateReport = {
  ok: boolean;
  consumer: boolean;
  packageRoot: string;
  checks: ValidateCheck[];
};

export function resolveInstalledPackageRoot(cwd: string): string | null {
  const nested = join(cwd, "node_modules", "0xray");
  if (existsSync(join(nested, "package.json"))) {
    return nested;
  }
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    return null;
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    if (pkg.name === "0xray") {
      return cwd;
    }
  } catch {
    return null;
  }
  return null;
}

export function isConsumerInstall(cwd: string, packageRoot: string): boolean {
  return packageRoot !== cwd;
}

function checkPath(root: string, rel: string): boolean {
  return existsSync(join(root, rel));
}

function launchersOutsideInstall(cwd: string, installRoot: string): string[] {
  const files = [
    join(cwd, ".mcp.json"),
    join(cwd, ".grok", "config.toml"),
    join(cwd, ".grok", "hooks", "0xray.json"),
    join(cwd, ".grok", "plugins", "0xray", ".mcp.json"),
  ];
  const found = new Set<string>();
  const pattern = /(?:^|["\s=])(\/[^"'\s]*\/(?:mcp-launch\.cjs|run-grok-hook\.mjs))/g;
  for (const file of files) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(pattern)) {
      const hit = match[1];
      if (!hit.startsWith(`${installRoot}/`)) found.add(hit);
    }
  }
  return [...found];
}

function mcpHasServer(cwd: string, name: string): boolean {
  try {
    const body = JSON.parse(readFileSync(join(cwd, ".mcp.json"), "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
    return Boolean(body.mcpServers && body.mcpServers[name]);
  } catch {
    return false;
  }
}

function stationDurableHoldsNpm(cwd: string): boolean {
  const dest = join(cwd, ".xray", "state", "STATION.md");
  if (!existsSync(dest)) return false;
  try {
    return /\bhold\s+npm\b/i.test(readFileSync(dest, "utf8"));
  } catch {
    return false;
  }
}

export function collectValidateReport(cwd: string): ValidateReport {
  const packageRoot = resolveInstalledPackageRoot(cwd);
  const checks: ValidateCheck[] = [];

  if (!packageRoot) {
    return {
      ok: false,
      consumer: false,
      packageRoot: cwd,
      checks: [
        {
          id: "package",
          ok: false,
          detail: "0xray package not found in cwd or node_modules/0xray",
        },
      ],
    };
  }

  const consumer = isConsumerInstall(cwd, packageRoot);
  checks.push({
    id: "package",
    ok: true,
    detail: consumer ? `consumer node_modules/0xray at ${packageRoot}` : `exo dogfood at ${packageRoot}`,
  });

  const missingPack = VALIDATE_PACK_PATHS.filter((p) => !checkPath(packageRoot, p));
  checks.push({
    id: "pack-paths",
    ok: missingPack.length === 0,
    detail:
      missingPack.length === 0
        ? `REQUIRED_PACK_PATHS ${VALIDATE_PACK_PATHS.length}/${VALIDATE_PACK_PATHS.length}`
        : `missing ${missingPack.join(", ")}`,
  });

  if (consumer) {
    const gitTree = suitSeat.isGitWorkTree(cwd);
    const hookPaths = new Set<string>(CONSUMER_HOOK_PATHS);
    const requiredWear = gitTree
      ? CONSUMER_WEAR_PATHS
      : CONSUMER_WEAR_PATHS.filter((rel) => !hookPaths.has(rel));
    const missingWear = requiredWear.filter((p) => !checkPath(cwd, p));
    const wearDetail = gitTree
      ? missingWear.length === 0
        ? "AGENTS.md · .mcp.json · .xray · .cursor/hooks.json · .cursor/hooks/*.sh"
        : `missing ${missingWear.join(", ")}`
      : missingWear.length === 0
        ? `AGENTS.md · .mcp.json · .xray · ${HOOKS_SKIPPED_DETAIL}`
        : `missing ${missingWear.join(", ")}; ${HOOKS_SKIPPED_DETAIL}`;
    checks.push({
      id: "consumer-wear",
      ok: missingWear.length === 0,
      detail: wearDetail,
    });

    const plantSkills = suitSeat.fastenedPlantSkills(cwd);
    const plantRoot = join(cwd, ".opencode", "skills");
    const missingPlant = plantSkills.filter((name) => !existsSync(join(plantRoot, name, "SKILL.md")));
    checks.push({
      id: "plant",
      ok: missingPlant.length === 0,
      detail:
        missingPlant.length === 0
          ? `${plantSkills.join(" + ")} fastened`
          : `missing plant ${missingPlant.join(", ")}`,
    });

    const stale = mintSuit.staleShippedSkillBodies(cwd, packageRoot);
    checks.push({
      id: "skill-bodies",
      ok: stale.length === 0,
      detail:
        stale.length === 0
          ? "no worn skill holds an older shipped body"
          : `older shipped body still worn: ${stale.join(", ")} — run npx 0xray wear`,
    });

    const installRoot = join(cwd, "node_modules", "0xray");
    if (existsSync(join(installRoot, "scripts", "node", "mcp-launch.cjs"))) {
      const outside = launchersOutsideInstall(cwd, installRoot);
      const goggles = mcpHasServer(cwd, "goggles");
      checks.push({
        id: "launcher-pin",
        ok: outside.length === 0 && goggles,
        detail: !goggles
          ? "goggles server missing"
          : outside.length === 0
            ? "launchers and hooks stay on node_modules/0xray"
            : `outside node_modules/0xray: ${outside[0]}`,
      });
    }

    const repertoire =
      existsSync(join(cwd, "node_modules", "@0xray", "repertoire", "package.json")) ||
      existsSync(join(packageRoot, "vendor", "@0xray", "repertoire", "package.json"));
    checks.push({
      id: "repertoire",
      ok: repertoire,
      detail: repertoire ? "repertoire organ on disk" : "missing @0xray/repertoire",
    });
  }

  const stationPath = join(cwd, ".xray", "state", "STATION.md");
  const stationExists = existsSync(stationPath);
  const staleHold = stationExists && stationDurableHoldsNpm(cwd);
  checks.push({
    id: "durable-hold",
    ok: !staleHold,
    detail: !stationExists
      ? "no STATION.md"
      : staleHold
        ? "STATION Durable still says Hold npm — heat should have stripped it"
        : "Durable has no Hold npm",
  });

  return {
    ok: checks.every((c) => c.ok),
    consumer,
    packageRoot,
    checks,
  };
}

export async function validateCommand(cwd: string = process.cwd()): Promise<ValidateReport> {
  frameworkLogger.log("cli", "validate-start", "info", { cwd });
  const report = collectValidateReport(cwd);
  for (const check of report.checks) {
    const mark = check.ok ? "✅" : "❌";
    console.log(`${mark} ${check.id}: ${check.detail}`);
  }
  if (report.ok) {
    console.log("");
    console.log("🎉 Wear checks passed. This is not leftover init.sh.");
    frameworkLogger.log("cli", "validate-success", "info", { consumer: report.consumer });
  } else {
    console.log("");
    console.log("❌ Validation failed. Pack/wear miss — not a Mac init.sh leftover.");
    frameworkLogger.log("cli", "validate-fail", "error", {
      consumer: report.consumer,
      failed: report.checks.filter((c) => !c.ok).map((c) => c.id),
    });
  }
  return report;
}

export default validateCommand;
