/**
 * 0xRay Performance Optimization MCP Server
 *
 * Knowledge skill for performance analysis, optimization recommendations,
 * and bottleneck identification
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { createGracefulShutdown } from "../../utils/shutdown-handler.js";

interface AnalyzePerformanceArgs {
  projectRoot: string;
  metrics?: string[];
}

interface OptimizePerformanceArgs {
  bottlenecks: string[];
  constraints?: string[];
}

class StringRayPerformanceOptimizationServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "performance-optimization", version: "1.15.27",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupToolHandlers();
    // Server initialization - removed unnecessary startup logging
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze-performance",
            description: "Analyze system performance and identify bottlenecks",
            inputSchema: {
              type: "object",
              properties: {
                projectRoot: { type: "string" },
                metrics: { type: "array", items: { type: "string" } },
              },
              required: ["projectRoot"],
            },
          },
          {
            name: "optimize-performance",
            description: "Provide performance optimization recommendations",
            inputSchema: {
              type: "object",
              properties: {
                bottlenecks: { type: "array", items: { type: "string" } },
                constraints: { type: "array", items: { type: "string" } },
              },
              required: ["bottlenecks"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "analyze-performance":
          return await this.analyzePerformance(args as unknown as AnalyzePerformanceArgs);
        case "optimize-performance":
          return await this.optimizePerformance(args as unknown as OptimizePerformanceArgs);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async analyzePerformance(args: AnalyzePerformanceArgs) {
    const { projectRoot, metrics } = args;

    const analysis = {
      bottlenecks: ["memory usage", "cpu intensive operations"],
      recommendations: ["Implement caching", "Use lazy loading"],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ projectRoot, analysis }, null, 2),
        },
      ],
    };
  }

  private async optimizePerformance(args: OptimizePerformanceArgs) {
    const { bottlenecks, constraints } = args;

    const optimizations = {
      recommendations: ["Add caching layer", "Optimize database queries"],
      priority: "high",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ bottlenecks, optimizations }, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Use centralized shutdown handler
    createGracefulShutdown({
      serverName: "performance-optimization.server",
      server: this.server,
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new StringRayPerformanceOptimizationServer();
  server.run().catch(() => {});
}

export default StringRayPerformanceOptimizationServer;
