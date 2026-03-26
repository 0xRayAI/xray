/**
 * Antigravity Status CLI Command
 *
 * Shows status of all installed skills.
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

export async function antigravityStatusCommand(): Promise<void> {
  const cwd = process.cwd();

  const skills = getSkillsFromSkills(cwd);

  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category]!.push(skill);
    return acc;
  }, {} as Record<string, SkillInfo[]>);

  const licenseCounts: Record<string, number> = {};
  skills.forEach((skill) => {
    const license = skill.license.toUpperCase();
    licenseCounts[license] = (licenseCounts[license] || 0) + 1;
  });

  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║              Installed Skills Status            ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  console.log(`Total Skills: ${skills.length}`);
  console.log(`Categories: ${Object.keys(skillsByCategory).length}`);
  console.log("");

  if (Object.keys(licenseCounts).length > 0) {
    console.log("Licenses:");
    Object.entries(licenseCounts).forEach(([license, count]) => {
      console.log(`  - ${license}: ${count} skill${count > 1 ? "s" : ""}`);
    });
    console.log("");
  }

  console.log("Skills by Category:");
  console.log("");

  Object.entries(skillsByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, categorySkills]) => {
      console.log(`  ${category.toUpperCase()} (${categorySkills.length})`);

      categorySkills
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((skill) => {
          const licenseBadge = skill.license.toUpperCase().substring(0, 3);
          const source = skill.source !== "unknown" ? skill.source : "custom";
          console.log(`    - ${skill.name} [${licenseBadge}] (${source})`);
        });

      console.log("");
    });

  console.log("-".repeat(50));
}

export default antigravityStatusCommand;
