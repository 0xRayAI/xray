/**
 * Agent Skills CLI Command
 *
 * Shows which skills are bound to which agents.
 *
 * Usage: npx strray-ai agent:skills
 */

import { initializeSkillRegistry, skillResolver } from "../../skills/index.js";

export async function agentSkillsCommand(): Promise<void> {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║           Agent-Skill Bindings            ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  try {
    await initializeSkillRegistry();
    const summary = skillResolver.getAgentSkillSummary();

    const agents = Object.keys(summary).sort();

    if (agents.length === 0) {
      console.log("No agent-skill bindings configured.");
      console.log("");
      console.log("Add to SKILL.md frontmatter:");
      console.log("  agent_binding:");
      console.log("    primary: agent-name");
      console.log("    auto_invoke: true");
      console.log("");
      return;
    }

    for (const agent of agents) {
      if (!agent) continue;
      const binding = summary[agent];
      if (!binding) continue;
      
      console.log(`🤖 @${agent}`);
      if (binding.primary) {
        console.log(`   Primary: ${binding.primary}`);
      }
      if (binding.secondary.length > 1) {
        console.log(`   Skills: ${binding.secondary.join(", ")}`);
      }
      console.log("");
    }

    console.log("Legend:");
    console.log("  Primary - Main skill for this agent");
    console.log("  Skills - All skills bound to this agent");
    console.log("");
  } catch (error) {
    console.error("Failed to get agent-skill bindings:", error);
    process.exit(1);
  }
}

export default agentSkillsCommand;
