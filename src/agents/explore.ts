import { AgentConfig } from "./types.js";
import { modelRouter } from "../core/model-router.js";

/**
 * Explore Agent
 *
 * Fast codebase exploration and pattern analysis specialist.
 */
export const explore: AgentConfig = {
  name: "explore",
  mode: "subagent",
  system: "explore-agent",
  get model() {
    return modelRouter.getValidatedModel("explore");
  },
  capabilities: [
    "codebase-exploration",
    "pattern-analysis",
    "file-search",
    "dependency-mapping",
  ],
  maxComplexity: 30,
  enabled: true,
  description:
    "Fast codebase exploration and pattern analysis specialist. Expert in quickly mapping codebases and finding structural patterns.",
  tools: {
    include: ["glob", "grep", "read", "bash"],
    exclude: ["edit", "write", "invoke-skill", "skill-*"],
  },
};
