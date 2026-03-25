/**
 * Skill List CLI Command
 *
 * Lists all discovered skills with detailed information.
 * Uses the SkillRegistry for comprehensive skill information.
 *
 * Usage: npx strray-ai skill:list
 */

import { initializeSkillRegistry, getSkillRegistry } from "../../skills/index.js";

export async function skillListCommand(): Promise<void> {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║           StringRay Skills                  ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  try {
    const registry = await initializeSkillRegistry(process.cwd());
    const skills = registry.list();
    const stats = registry.getStats();

    console.log(`Total Skills: ${stats.total}`);
    console.log(`With MCP: ${stats.with_mcp}`);
    console.log("");

    if (stats.by_source && Object.keys(stats.by_source).length > 0) {
      console.log("By Source:");
      for (const [source, count] of Object.entries(stats.by_source)) {
        console.log(`  • ${source}: ${count}`);
      }
      console.log("");
    }

    console.log("Skills:");
    console.log("─".repeat(70));

    for (const skill of skills) {
      const hasMcp = skill.mcp ? ` [MCP: ${skill.mcp.tools.length} tools]` : "";
      const autoInvoke = skill.agent_binding?.auto_invoke ? " ⚡" : "";
      console.log(`📚 ${skill.name}${hasMcp}${autoInvoke}`);
      console.log(`   ${skill.description.slice(0, 60)}${skill.description.length > 60 ? "..." : ""}`);
      
      if (skill.capabilities.length > 0) {
        console.log(`   Capabilities: ${skill.capabilities.slice(0, 3).join(", ")}${skill.capabilities.length > 3 ? "..." : ""}`);
      }
      
      console.log("");
    }

    console.log("Legend:");
    console.log("  📚 - Skill name");
    console.log("  [MCP] - Has MCP server with tool count");
    console.log("  ⚡ - Auto-invoke enabled");
    console.log("");
  } catch (error) {
    console.error("Failed to list skills:", error);
    process.exit(1);
  }
}

export default skillListCommand;
