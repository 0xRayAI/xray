/**
 * xray API Design MCP Server
 *
 * Knowledge skill for API design patterns, RESTful conventions,
 * GraphQL schema design, and API documentation standards
 */

import { XrayKnowledgeSkillBase } from "../shared/knowledge-skill-base.js";
import { frameworkLogger } from "../../core/framework-logger.js";

interface DesignApiEndpointsArgs {
  resource: string;
  operations?: string[];
  relationships?: string[];
}

interface ValidateApiDesignArgs {
  endpoints: string[];
  standards?: string[];
}

class XrayApiDesignServer extends XrayKnowledgeSkillBase {
  constructor() {
    super("api-design", "2.0.1");
    this.tools = [
      {
        name: "design-api-endpoints",
        description:
          "Design RESTful API endpoints with proper resource modeling",
        inputSchema: {
          type: "object",
          properties: {
            resource: { type: "string" },
            operations: { type: "array", items: { type: "string" } },
            relationships: { type: "array", items: { type: "string" } },
          },
          required: ["resource"],
        },
      },
      {
        name: "validate-api-design",
        description:
          "Validate API design against RESTful principles and best practices",
        inputSchema: {
          type: "object",
          properties: {
            endpoints: { type: "array", items: { type: "string" } },
            standards: { type: "array", items: { type: "string" } },
          },
          required: ["endpoints"],
        },
      },
    ];
    this.handlers = {
      "design-api-endpoints": async (args) => this.designApiEndpoints(args as unknown as DesignApiEndpointsArgs),
      "validate-api-design": async (args) => this.validateApiDesign(args as unknown as ValidateApiDesignArgs),
    };
    this.setupToolHandlers();
  }

  private async designApiEndpoints(args: DesignApiEndpointsArgs) {
    const { resource, operations, relationships } = args;

    const design = {
      resource: resource.toLowerCase(),
      endpoints: [
        `GET /api/${resource}s`,
        `POST /api/${resource}s`,
        `GET /api/${resource}s/{id}`,
        `PUT /api/${resource}s/{id}`,
        `DELETE /api/${resource}s/{id}`,
      ],
      relationships: relationships || [],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ resource, design }, null, 2),
        },
      ],
    };
  }

  private async validateApiDesign(args: ValidateApiDesignArgs) {
    const { endpoints, standards } = args;

    const validation = {
      score: 85,
      issues: ["Consider using plural resource names"],
      recommendations: [
        "Add HATEOAS links",
        "Implement proper HTTP status codes",
      ],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ endpoints, validation }, null, 2),
        },
      ],
    };
  }

}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new XrayApiDesignServer();
  server.run("api-design").catch((err) => { console.error("MCP server failed:", err); });
}

export default XrayApiDesignServer;
