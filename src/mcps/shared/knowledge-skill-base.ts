import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import { createGracefulShutdown } from "../../utils/shutdown-handler.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

export class XrayKnowledgeSkillBase {
  protected tools: ToolDefinition[] = [];
  protected handlers: Record<string, (args: unknown) => Promise<any>> = {};

  protected server: Server;
  protected serverName: string;

  constructor(serverName: string, version = "2.0.1") {
    this.serverName = serverName;
    this.server = new Server(
      { name: serverName, version },
      { capabilities: { tools: {} } },
    );
  }

  protected setupToolHandlers(): void {
    this.setupListToolsHandler();
    this.setupCallToolHandler();
  }

  protected setupListToolsHandler(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));
  }

  protected setupCallToolHandler(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = this.handlers[name];
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }
      try {
        return await handler(args);
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    createGracefulShutdown({ serverName: this.serverName, server: this.server });
    await frameworkLogger.log(this.serverName, "server-started", "success");
  }
}
