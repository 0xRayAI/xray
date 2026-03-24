/**
 * Antigravity Status CLI Command
 *
 * Shows status of all Antigravity skills and integrated third-party skills.
 *
 * Usage: npx strray-ai antigravity status
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

interface SkillInfo {
  name: string;
  source: string;
  license: string;
  category: string;
  path: string;
}

function getSkillsFromIntegrations(cwd: string): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const integrationsPath = join(cwd, ".opencode", "integrations");

  if (!existsSync(integrationsPath)) {
    return skills;
  }

  const dirs = readdirSync(integrationsPath).filter((f) => {
    const skillPath = join(integrationsPath, f, "SKILL.md");
    return existsSync(skillPath);
  });

  for (const dir of dirs) {
    const skillPath = join(integrationsPath, dir, "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");

    const sourceMatch = content.match(/source:\s*(.+)/i);
    const licenseMatch = content.match(/(?:license|attribution):\s*\[([^\]]+)\]|\b(MIT|Apache|GPL|BSD)\b/i);

    skills.push({
      name: dir,
      source: sourceMatch && sourceMatch[1] ? sourceMatch[1].trim() : "unknown",
      license: licenseMatch ? (licenseMatch[1] || licenseMatch[2] || "unknown") : "unknown",
      category: extractCategory(content),
      path: skillPath,
    });
  }

  return skills;
}

function getSkillsFromSkills(cwd: string): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const skillsPath = join(cwd, ".opencode", "skills");

  if (!existsSync(skillsPath)) {
    return skills;
  }

  const dirs = readdirSync(skillsPath).filter((f) => {
    const skillPath = join(skillsPath, f, "SKILL.md");
    return existsSync(skillPath);
  });

  for (const dir of dirs) {
    const skillPath = join(skillsPath, dir, "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");

    const sourceMatch = content.match(/source:\s*(.+)/i);
    const licenseMatch = content.match(/(?:license|attribution):\s*\[([^\]]+)\]|\b(MIT|Apache|GPL|BSD)\b/i);

    skills.push({
      name: dir,
      source: sourceMatch && sourceMatch[1] ? sourceMatch[1].trim() : "custom",
      license: licenseMatch ? (licenseMatch[1] || licenseMatch[2] || "unknown") : "unknown",
      category: extractCategory(content),
      path: skillPath,
    });
  }

  return skills;
}

function extractCategory(content: string): string {
  const categoryMatch = content.match(/category:\s*(.+)/i);
  if (categoryMatch && categoryMatch[1]) {
    return categoryMatch[1].trim();
  }

  if (content.includes("typescript") || content.includes("python")) {
    return "language";
  }
  if (content.includes("security") || content.includes("audit")) {
    return "security";
  }
  if (content.includes("design") || content.includes("ui") || content.includes("frontend")) {
    return "design";
  }
  if (content.includes("memory") || content.includes("context")) {
    return "memory";
  }

  return "general";
}

function getLicenseFile(cwd: string, skillName: string): string | null {
  const licensePatterns = [
    join(cwd, `LICENSE.${skillName}`),
    join(cwd, `LICENSE.${skillName.replace(/-/g, "-")}`),
    join(cwd, "LICENSE"),
  ];

  for (const licensePath of licensePatterns) {
    if (existsSync(licensePath)) {
      return licensePath;
    }
  }

  return null;
}

export async function antigravityStatusCommand(): Promise<void> {
  const cwd = process.cwd();

  const integrations = getSkillsFromIntegrations(cwd);
  const skills = getSkillsFromSkills(cwd);

  const allSkills = [...integrations, ...skills];
  const uniqueSkills = allSkills.reduce((acc, skill) => {
    if (!acc.find((s) => s.name === skill.name)) {
      acc.push(skill);
    }
    return acc;
  }, [] as SkillInfo[]);

  const skillsByCategory = uniqueSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category]!.push(skill);
    return acc;
  }, {} as Record<string, SkillInfo[]>);

  const licenseCounts: Record<string, number> = {};
  uniqueSkills.forEach((skill) => {
    const license = skill.license.toUpperCase();
    licenseCounts[license] = (licenseCounts[license] || 0) + 1;
  });

  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║           Antigravity Skills Status           ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  console.log(`📊 Total Skills: ${uniqueSkills.length}`);
  console.log(`📁 Categories: ${Object.keys(skillsByCategory).length}`);
  console.log("");

  console.log("Licenses:");
  Object.entries(licenseCounts).forEach(([license, count]) => {
    console.log(`  • ${license}: ${count} skill${count > 1 ? "s" : ""}`);
  });
  console.log("");

  console.log("Skills by Category:");
  console.log("");

  const categoryEmoji: Record<string, string> = {
    language: "🔤",
    security: "🔒",
    design: "🎨",
    memory: "🧠",
    framework: "⚙️",
    general: "📦",
    infrastructure: "🏗️",
  };

  Object.entries(skillsByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, categorySkills]) => {
      const emoji = categoryEmoji[category] || "📦";
      console.log(`${emoji} ${category.toUpperCase()} (${categorySkills.length})`);

      categorySkills
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((skill) => {
          const licenseBadge = skill.license.toUpperCase().substring(0, 3);
          const source = skill.source !== "unknown" ? skill.source : "custom";
          console.log(`   • ${skill.name} [${licenseBadge}] (${source})`);
        });

      console.log("");
    });

  console.log("─".repeat(50));
  console.log("");
  console.log("Legend:");
  console.log("  [MIT] - MIT License");
  console.log("  [APA] - Apache 2.0 License");
  console.log("  [GPL] - GPL License");
  console.log("  [BSD] - BSD License");
  console.log("");
  console.log("License Files:");
  console.log("  • LICENSE.antigravity - Antigravity skills (MIT)");
  console.log("  • LICENSE.claude-seo - Claude SEO skills (MIT)");
  console.log("  • LICENSE.impeccable - Impeccable (Apache 2.0)");
  console.log("  • LICENSE.openviking - OpenViking (Apache 2.0)");
  console.log("");
}

export default antigravityStatusCommand;
