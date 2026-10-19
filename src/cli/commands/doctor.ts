/**
 * Framework doctor. Worn is features.json plus the fastened plant's skills.
 * A missing git checkout does not make a worn suit "not worn".
 * goggles.enabled false fails the command. A missing key stays on.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../../core/config-paths.js";

const requireCjs = createRequire(import.meta.url);
const suitSeat = requireCjs("../../../scripts/node/suit-seat.cjs") as {
  gogglesDisabled: (cwd: string) => boolean;
  wearLine: (cwd: string) => string;
};

export type DoctorResult = {
  text: string;
  exitCode: number;
};

export function runDoctor(cwd: string, nodeVersion: string = process.version): DoctorResult {
  const lines: string[] = [
    "🩺 xray Framework Doctor",
    "===============================",
    "",
  ];
  const issues: string[] = [];
  const fixes: string[] = [];

  const versionParts = nodeVersion.slice(1).split(".");
  const majorVersion = parseInt(versionParts[0] || "0", 10);
  if (majorVersion < 18) {
    issues.push("Node.js version too old");
    fixes.push("Upgrade to Node.js 18+");
  } else {
    lines.push(`✅ Node.js version: ${nodeVersion}`);
  }

  const packageExists = existsSync(join(cwd, "node_modules", "0xray"));
  if (!packageExists) {
    issues.push("xray package not installed");
    fixes.push("Run: npm install xray");
  } else {
    lines.push("✅ xray package installed");
  }

  lines.push(suitSeat.wearLine(cwd));

  const opencodeExists = existsSync(join(cwd, "opencode.json"));
  const configDir = getConfigDir(cwd);
  const configDirExists = existsSync(configDir);
  if (opencodeExists) {
    lines.push("✅ opencode configuration found");
  } else if (configDirExists) {
    lines.push(`✅ Configuration directory found: ${configDir}`);
  } else {
    lines.push("ℹ️  No opencode.json or config directory found (run: npx xray fix to create)");
  }

  if (existsSync(join(cwd, ".mcp.json"))) {
    lines.push("ℹ️ Found .mcp.json - may conflict with framework");
    fixes.push("Consider removing .mcp.json or excluding framework servers");
  }

  const gogglesOff = suitSeat.gogglesDisabled(cwd);
  if (gogglesOff) {
    issues.push("goggles off — the suit keeps goggles on");
    fixes.push("Set goggles.enabled to true in .xray/features.json");
  }

  lines.push("");
  if (issues.length === 0) {
    lines.push("🎉 No issues found! Framework is healthy.");
    lines.push("");
    lines.push("💡 Pro tips:");
    lines.push("  • Use @security-auditor for code quality checks");
    lines.push("  • Run reports regularly: npx xray report");
    lines.push("  • Check health anytime: npx xray health");
  } else {
    lines.push("⚠️ Issues found:");
    issues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. ${issue}`);
    });
    lines.push("");
    lines.push('🔧 Run "npx xray fix" to automatically fix these issues');
    if (fixes.length) {
      fixes.forEach((fix) => {
        lines.push(`  • ${fix}`);
      });
    }
  }
  lines.push("");
  return { text: `${lines.join("\n")}\n`, exitCode: gogglesOff ? 1 : 0 };
}
