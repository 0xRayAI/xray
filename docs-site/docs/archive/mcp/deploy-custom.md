# Deploy a Custom MCP Server

0xRay provides two patterns for running custom MCP servers:

- **stdio** — simple, local, used by `xray-skills` and all 15 internal servers
- **HTTP (Streamable HTTP)** — deployed on Railway/cloud, used by `xray-governance`

Both use the standard `@modelcontextprotocol/sdk` and register into the same manifest.

---

## Pattern 1: stdio MCP (local)

Best for tools that run alongside the AI coding platform (IDE, CLI agent).

### 1. Create the server

Extend `XrayKnowledgeSkillBase` from `src/mcps/shared/knowledge-skill-base.ts`:

```typescript
// src/mcps/my-custom.server.ts
import { XrayKnowledgeSkillBase } from "./shared/knowledge-skill-base.js";

class MyCustomServer extends XrayKnowledgeSkillBase {
  constructor() {
    super("my-custom", "1.0.0");

    this.tools = [
      {
        name: "my_tool",
        description: "Does something useful",
        inputSchema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Input value" },
          },
          required: ["input"],
        },
      },
    ];

    this.handlers = {
      my_tool: async (args: { input?: string }) => {
        return {
          content: [{ type: "text", text: `Processed: ${args.input}` }],
        };
      },
    };
  }
}

const server = new MyCustomServer();
server.run("my-custom").catch(console.error);
```

### 2. Register in the MCP manifest

Add to `src/mcps/index.ts`:

```typescript
{ serverName: "my-custom", sourceFile: "mcps/my-custom.server.ts", type: "top-level", registered: true, description: "My custom tool" },
```

### 3. Wire the CLI entrypoint

In `src/cli/index.ts` (or `src/cli/commands/govern.ts`), add the server path:

```typescript
myCustom: 'dist/mcps/my-custom.server.js',
```

Then users run:

```bash
npx 0xray mcp my-custom
```

### 4. Add client configuration

For end users, add to `.mcp.json` or their tool's MCP config:

```json
{
  "mcpServers": {
    "my-custom": {
      "command": "npx",
      "args": ["-y", "0xray", "mcp", "my-custom"]
    }
  }
}
```

---

## Pattern 2: HTTP MCP (deployed)

Best for shared services, team governance servers, or public APIs.

### 1. Create the server with dual transport

```typescript
// src/mcps/my-cloud.server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { frameworkLogger } from "../core/framework-logger.js";
import { fileURLToPath } from "url";
import path from "path";

class MyCloudServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "my-cloud", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{
        name: "my_tool",
        description: "Does something useful",
        inputSchema: {
          type: "object",
          properties: { input: { type: "string" } },
          required: ["input"],
        },
      }],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return {
        content: [{ type: "text", text: `Processed: ${args?.input}` }],
      };
    });
  }

  // stdio mode (local development)
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    frameworkLogger.log("my-cloud", "server-started", "success", { transport: "stdio" });
  }

  // HTTP mode (Railway/cloud deployment)
  async runHttp(port: number = parseInt(process.env.MCP_PORT ?? "3100", 10)): Promise<void> {
    const app = createMcpExpressApp({ host: '0.0.0.0' });
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    // Auth middleware (optional)
    const apiKey = process.env.API_KEY;
    app.use((req: any, res: any, next: any) => {
      if (apiKey && req.path !== "/health") {
        if (req.headers["x-api-key"] !== apiKey) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }
      next();
    });

    // POST /mcp — Streamable HTTP session handling
    app.post("/mcp", async (req: any, res: any) => {
      try {
        const sessionId = req.headers["mcp-session-id"];
        if (sessionId && transports[sessionId]) {
          await transports[sessionId].handleRequest(req, res, req.body);
          return;
        }
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (newId: string) => {
            transports[newId] = transport;
          },
        });
        await this.server.connect(transport as any);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
      }
    });

    app.get("/health", (_req: any, res: any) => {
      res.json({ status: "ok", server: "my-cloud" });
    });

    app.listen(port, () => {
      frameworkLogger.log("my-cloud", "http-listening", "info", { port });
    });
  }
}

// Auto-detect mode
const entryPoint = path.resolve(process.argv[1] ?? "");
if (entryPoint && fileURLToPath(import.meta.url) === entryPoint) {
  const cliPort = process.argv.find((a) => a.startsWith("--port="))?.split("=")[1];
  const port = parseInt(cliPort ?? process.env.MCP_PORT ?? "", 10);
  const server = new MyCloudServer();
  if (!isNaN(port)) {
    server.runHttp(port).catch((e) => { console.error(e); process.exit(1); });
  } else {
    server.run().catch((e) => { console.error(e); process.exit(1); });
  }
}
```

### 2. Deploy to Railway

Create `mcp-server.mjs` at project root (entry point):

```javascript
import { MyCloudServer } from './dist/mcps/my-cloud.server.js';
const server = new MyCloudServer();
server.runHttp(parseInt(process.env.MCP_PORT || "3100"));
```

Then on Railway:

```bash
railway up                    # deploy
railway domain                # get public URL
```

### 3. Client connects

```json
{
  "mcpServers": {
    "my-cloud": {
      "url": "https://my-app.up.railway.app/mcp"
    }
  }
}
```

Clients send standard MCP requests over HTTP POST to `/mcp`. Each client gets its own session. The health endpoint is at `GET /health`.

---

## Deployment Checklist

- [ ] Server runs standalone: `node dist/mcps/my-custom.server.js`
- [ ] Registered in `src/mcps/index.ts`
- [ ] CLI wired in `src/cli/index.ts` (for `npx 0xray mcp my-custom`)
- [ ] HTTP mode tested locally: `MCP_PORT=3100 node dist/mcps/my-custom.server.js`
- [ ] `POST /mcp` returns valid MCP JSON-RPC responses
- [ ] `GET /health` returns `200 OK`
- [ ] Auth header checked (if using API key)
- [ ] Railway: `NODE_VERSION` set, `MCP_PORT` set, entry point configured

---

## Reference

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) — official TypeScript SDK
- [Streamable HTTP](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http) — MCP transport spec
- [Railway deployment example](https://github.com/0xRayAI/xray/blob/main/mcp-server.mjs) — production governance server
- [MCP Server Manifest](../architecture/mcp-manifest.md) — full server registry
