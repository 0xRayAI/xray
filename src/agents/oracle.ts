import { AgentConfig } from "./types.js";
import { modelRouter } from "../core/model-router.js";

/**
 * Oracle Agent
 *
 * Strategic guidance and complex problem-solving specialist.
 */
export const oracle: AgentConfig = {
  name: "oracle",
  mode: "subagent",
  system: "oracle-agent",
  get model() {
    return modelRouter.getValidatedModel("oracle");
  },
  capabilities: [
    "strategic-planning",
    "complex-problem-solving",
    "architecture-design",
    "technical-strategy",
  ],
  maxComplexity: 100,
  enabled: true,
  description: "Strategic guidance and complex problem-solving specialist. Expert in architectural decisions, technical strategy, and high-level system design.",
  tools: {
    include: ["read", "glob", "grep", "bash"],
    exclude: ["edit", "write", "invoke-skill"],
  },
};
