/**
 * Consumer wear check — not leftover OpenCode init.sh.
 *
 * `npx 0xray validate` used to shell `.opencode/init.sh` (macOS `md5`,
 * `.opencode/enforcer-config.json`). That is factory boot theater, not wear.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frameworkLogger } from "../../core/framework-logger.js";

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
];

export const CONSUMER_WEAR_PATHS = [
  "AGENTS.md",
  ".mcp.json",
  ".xray/codex.json",
  ".xray/features.json",
  ".cursor/hooks.json",
] as const;

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
    const missingWear = CONSUMER_WEAR_PATHS.filter((p) => !checkPath(cwd, p));
    checks.push({
      id: "consumer-wear",
      ok: missingWear.length === 0,
      detail:
        missingWear.length === 0
          ? "AGENTS.md · .mcp.json · .xray · .cursor/hooks.json"
          : `missing ${missingWear.join(", ")}`,
    });

    const millRoot = join(cwd, ".opencode", "skills");
    const missingMill = MILL_PLANT_SKILLS.filter((name) => !existsSync(join(millRoot, name, "SKILL.md")));
    checks.push({
      id: "mill-plant",
      ok: missingMill.length === 0,
      detail:
        missingMill.length === 0
          ? "mill + inspect fastened"
          : `missing plant ${missingMill.join(", ")}`,
    });

    const repertoire =
      existsSync(join(cwd, "node_modules", "@0xray", "repertoire", "package.json")) ||
      existsSync(join(packageRoot, "vendor", "@0xray", "repertoire", "package.json"));
    checks.push({
      id: "repertoire",
      ok: repertoire,
      detail: repertoire ? "repertoire organ on disk" : "missing @0xray/repertoire",
    });
  }

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
