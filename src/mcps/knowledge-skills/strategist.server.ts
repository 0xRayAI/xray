import { XrayKnowledgeSkillBase } from "../shared/knowledge-skill-base.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import * as path from "path";
import { fileURLToPath } from "url";

interface StrategicGuidanceArgs {
  context: string;
  options?: string[];
  criteria?: string[];
}

interface RiskAssessmentArgs {
  decision: string;
  scope?: string;
}

interface ArchitectureReviewArgs {
  architecture: string;
  requirements?: string[];
}

class StrategistServer extends XrayKnowledgeSkillBase {
  constructor() {
    super("xray/strategist", "2.0.1");
    this.tools = [
      {
        name: "strategic_guidance",
        description: "Provide strategic guidance for complex technical decisions, architectural choices, and high-level planning",
        inputSchema: {
          type: "object",
          properties: {
            context: {
              type: "string",
              description: "Technical context or situation requiring strategic analysis",
            },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Available options or choices to evaluate",
            },
            criteria: {
              type: "array",
              items: { type: "string" },
              description: "Evaluation criteria (e.g., scalability, cost, maintainability)",
            },
          },
          required: ["context"],
        },
      },
      {
        name: "risk_assessment",
        description: "Analyze technical decisions for potential risks, vulnerabilities, and failure modes",
        inputSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              description: "Technical decision or change to assess",
            },
            scope: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Scope/impact level of the decision",
            },
          },
          required: ["decision"],
        },
      },
      {
        name: "architecture_review",
        description: "Review architectural decisions against best practices, patterns, and trade-offs",
        inputSchema: {
          type: "object",
          properties: {
            architecture: {
              type: "string",
              description: "Architecture or design pattern being used",
            },
            requirements: {
              type: "array",
              items: { type: "string" },
              description: "Key requirements to satisfy",
            },
          },
          required: ["architecture"],
        },
      },
    ];
    this.handlers = {
      strategic_guidance: async (args) => this.handleStrategicGuidance(args as unknown as StrategicGuidanceArgs),
      risk_assessment: async (args) => this.handleRiskAssessment(args as unknown as RiskAssessmentArgs),
      architecture_review: async (args) => this.handleArchitectureReview(args as unknown as ArchitectureReviewArgs),
    };
    this.setupToolHandlers();
  }

  private async handleStrategicGuidance(args: StrategicGuidanceArgs) {
    const { context, options = [], criteria = [] } = args;

    const analysis = [
      `## Strategic Analysis for: ${context}`,
      "",
      "### Key Considerations:",
      ...criteria.map((c: string) => `- ${c}: Need to evaluate against this criterion`),
      "",
      "### Recommendation Framework:",
      "- Consider long-term maintainability",
      "- Evaluate scalability implications",
      "- Assess development velocity impact",
      "- Factor in operational complexity",
      "",
      "### Next Steps:",
      "1. Define success metrics for each criterion",
      "2. Prototype potential solutions",
      "3. Validate with stakeholders",
      "4. Plan incremental rollout",
    ];

    return {
      content: [{ type: "text", text: analysis.join("\n") }],
    };
  }

  private async handleRiskAssessment(args: RiskAssessmentArgs) {
    const { decision, scope = "medium" } = args;

    const riskLevels: Record<string, string> = {
      low: "Low Risk",
      medium: "Medium Risk",
      high: "High Risk",
      critical: "Critical Risk",
    };

    const analysis = [
      `## Risk Assessment: ${decision}`,
      "",
      `**Scope Level:** ${riskLevels[scope] || riskLevels.medium}`,
      "",
      "### Identified Risks:",
      "- Technical debt accumulation",
      "- Integration complexity",
      "- Performance implications",
      "- Security considerations",
      "",
      "### Mitigation Strategies:",
      "1. Implement monitoring and observability",
      "2. Plan for graceful degradation",
      "3. Document decision rationale",
      "4. Schedule follow-up reviews",
    ];

    return {
      content: [{ type: "text", text: analysis.join("\n") }],
    };
  }

  private async handleArchitectureReview(args: ArchitectureReviewArgs) {
    const { architecture, requirements = [] } = args;

    const analysis = [
      `## Architecture Review: ${architecture}`,
      "",
      "### Assessment:",
      "- Pattern applicability: Good fit for the stated purpose",
      "- Scalability: Consider horizontal scaling needs",
      "- Complexity: Moderate complexity - good for mid-sized teams",
      "",
      "### Strengths:",
      "- Clear separation of concerns",
      "- Testable components",
      "- Evolvable design",
      "",
      "### Considerations:",
      ...requirements.map((r: string) => `- ${r}: Ensure this requirement is met`),
      "",
      "### Recommendations:",
      "1. Document architecture decisions",
      "2. Set up architecture review board process",
      "3. Plan for technical debt management",
    ];

    return {
      content: [{ type: "text", text: analysis.join("\n") }],
    };
  }
}

const entryPoint = path.resolve(process.argv[1] ?? "");
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  const server = new StrategistServer();
  server.run("mcp-strategist").catch((error) => {
    frameworkLogger.log("strategist", "run", "error", { error: error instanceof Error ? error.message : String(error) });
  });
}

export { StrategistServer };
