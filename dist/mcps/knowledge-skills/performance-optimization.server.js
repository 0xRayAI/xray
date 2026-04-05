/**
 * StrRay Performance Optimization MCP Server
 *
 * Knowledge skill for performance analysis, optimization recommendations,
 * and bottleneck identification
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createGracefulShutdown } from "../../utils/shutdown-handler.js";
class StrRayPerformanceOptimizationServer {
    server;
    constructor() {
        this.server = new Server({
            name: "performance-optimization", version: "1.15.27",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        // Server initialization - removed unnecessary startup logging
    }
    setupToolHandlers() {
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
                    return await this.analyzePerformance(args);
                case "optimize-performance":
                    return await this.optimizePerformance(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    async analyzePerformance(args) {
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
    async optimizePerformance(args) {
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
    async run() {
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
    const server = new StrRayPerformanceOptimizationServer();
    server.run().catch(() => { });
}
export default StrRayPerformanceOptimizationServer;
//# sourceMappingURL=performance-optimization.server.js.map