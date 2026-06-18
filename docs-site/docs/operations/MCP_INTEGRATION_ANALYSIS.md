# 0xRay MCP Integration Analysis

:::info Historical analysis (pre-v3.4.1)
This document describes the v3 architecture evolution. **Current consumer surface (v3.4.1):** 7 MCP servers via `npx -y 0xray mcp <cmd>`, 45 skills, 42 YML agents. See [MCP README](../mcp/README.md) and [Integrations](../guides/integrations.md).
:::

## Overview

This document analyzes the MCP (Model Context Protocol) integration architecture in 0xRay, providing cleaner interfaces and better separation of concerns.

---

## Architecture Evolution

### Before: Agent-Side Only

**❌ Previous Reality:**
- Contextual awareness was **purely agent-side**
- **No real MCP integration** - just JavaScript functions
- Knowledge skills listed in config but **never implemented as MCP servers**
- Documentation claimed 15 MCP servers, but only 10 infrastructure servers existed
- Agent tools could not be shared across instances

```typescript
// OLD: Agent-side only (NOT MCP)
// src/architect/architect-tools.ts
export const architectTools = {
  contextAnalysis,     // ❌ Just a JS function
  codebaseStructure,   // ❌ Just a JS function
  dependencyAnalysis,  // ❌ Just a JS function
};
```

### Current MCP Integration

**✅ Architecture:**
- Full MCP integration through **MCP Client**
- Knowledge skills properly exposed as MCP servers
- Standardized MCP protocol throughout

```typescript
import { MCPClient } from "@0xray/framework";

const mcpClient = new MCPClient(orchestrator);

// Discover MCP skills
const skills = await mcpClient.discoverSkills();

// Call MCP skill
const result = await mcpClient.callSkill("project-analysis", {
  projectRoot: "/path/to/project"
});
```

---

## Current MCP Architecture

### MCP Client Layer

```
┌─────────────────────────────────────────────┐
│               MCP Client                    │
│                                             │
│  Methods:                                   │
│   - discoverSkills()                        │
│   - callSkill(name, params)                 │
│   - batchCall(skills[])                     │
│   - getServerHealth()                       │
└──────────────────────┬──────────────────────┘
                       │
         ┌──────────────┼──────────────┐
         │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Server      │ │ Connection │ │  Protocol  │
│  Discovery   │ │   Pool     │ │  Handler   │
│  Module      │ │  Module    │ │  Module    │
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Message     │ │   Error    │ │   Cache    │
│  Router      │ │  Recovery  │ │  Manager   │
│  Module      │ │  Module    │ │  Module    │
└──────────────┘ └────────────┘ └────────────┘
        │
┌───────▼──────────────────────────────────┐
│           Health Monitor                 │
│           Config Loader                  │
└──────────────────────────────────────────┘
```

### Available MCP Servers

#### Internal MCP Servers (10)

✅ **Implemented and Active (historical — v3 consolidated to 15 framework servers):**
1. `orchestrator.server.ts` - Multi-agent coordination
2. `enforcer.server.ts` - Validation and compliance
3. `architect.server.ts` - System design
4. `boot-orchestrator.server.ts` - Framework initialization
5. `state-manager.server.ts` - State management
6. `processor-pipeline.server.ts` - Pre/post processing
7. `performance-analysis.server.ts` - Performance monitoring
8. `framework-compliance-audit.server.ts` - Compliance checking
9. `lint.server.ts` - Code linting
10. `auto-format.server.ts` - Code formatting

#### Skill Servers (6+)

✅ **Implemented (now loaded via skill-invocation.server.js — 44 skills total):**

**Core Skills (6):**
1. `project-analysis.server.ts` - Project structure analysis
2. `testing-strategy.server.ts` - Testing methodologies
3. `architecture-patterns.server.ts` - Design patterns
4. `performance-optimization.server.ts` - Optimization techniques
5. `git-workflow.server.ts` - Version control
6. `api-design.server.ts` - API design

**Total: 15 MCP servers + 44 skills (v3 architecture)**

---

## MCP Integration Patterns

### Pattern 1: Direct MCP Client Usage

```typescript
import { MCPClient } from "@0xray/framework";

const mcpClient = new MCPClient(orchestrator);

// Simple skill invocation
const analysis = await mcpClient.callSkill("project-analysis", {
  projectRoot: "/path/to/project",
  includeMetrics: true
});

// Batch operations
const results = await mcpClient.batchCall([
  { skill: "project-analysis", params: { ... } },
  { skill: "security-audit", params: { ... } },
  { skill: "performance-optimization", params: { ... } }
]);
```

### Pattern 2: TaskSkillRouter Integration

Router automatically routes to appropriate MCP skills:

```typescript
import { TaskSkillRouter, MCPClient } from "@0xray/framework";

const router = new TaskSkillRouter(orchestrator);
const mcpClient = new MCPClient(orchestrator);

// Router determines best skill
const route = await router.routeTask({
  task: "optimize React component performance",
  context: { framework: "react" }
});

const result = await mcpClient.callSkill(route.skill, {
  task: route.task,
  context: route.context
});
```

### Pattern 3: Module-Level Access

For advanced customization, access MCP modules directly:

```typescript
import { MCPClient } from "@0xray/framework";

const mcpClient = new MCPClient(orchestrator);

const discovery = mcpClient.getModule("server-discovery");
const pool = mcpClient.getModule("connection-pool");
const cache = mcpClient.getModule("cache-manager");

const servers = await discovery.findAvailableServers();
const connection = await pool.acquire(servers[0]);
const cached = await cache.get(cacheKey);
```

### Pattern 4: Custom MCP Server Creation

Create custom MCP servers:

```typescript
import { MCPServer, MCPClient } from "@0xray/framework";

export class CustomAnalysisServer implements MCPServer {
  name = "custom-analysis";
  version = "1.9.0";
  
  private mcpClient: MCPClient;
  
  constructor(orchestrator: 0xRayOrchestrator) {
    this.mcpClient = new MCPClient(orchestrator);
  }
  
  tools = [
    {
      name: "analyze-code",
      description: "Analyze code for issues",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string" },
          language: { type: "string" }
        }
      }
    }
  ];
  
  async callTool(name: string, args: any): Promise<any> {
    switch (name) {
      case "analyze-code":
        // Use other MCP skills
        const lintResult = await this.mcpClient.callSkill("lint", {
          code: args.code,
          language: args.language
        });
        
        return {
          issues: lintResult.issues,
          score: lintResult.score
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
```

---

## MCP Protocol Implementation

### Standard MCP Protocol

0xRay follows the standard MCP protocol:

```typescript
// MCP Request
interface McpRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params: any;
}

// MCP Response
interface McpResponse {
  jsonrpc: "2.0";
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}
```

### Protocol Handler Module

The Protocol Handler module manages MCP communication:

```typescript
// Access protocol handler
const mcpClient = new MCPClient(orchestrator);
const protocol = mcpClient.getModule("protocol-handler");

// Custom protocol configuration
protocol.configure({
  requestTimeout: 30000,
  retryAttempts: 3,
  batchSize: 10
});
```

---

## Performance Optimization

### Connection Pooling

```typescript
const mcpClient = new MCPClient(orchestrator, {
  connectionPool: {
    minConnections: 2,
    maxConnections: 10,
    idleTimeout: 30000,
    acquireTimeout: 5000
  }
});
```

### Caching

```typescript
const mcpClient = new MCPClient(orchestrator, {
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000,
    strategy: "lru"
  }
});

// Cached calls
const result = await mcpClient.callSkill("project-analysis", params);
// Subsequent calls with same params use cache
```

### Batch Processing

```typescript
// Efficient batch operations
const results = await mcpClient.batchCall([
  { skill: "security-audit", params: { target: "src" } },
  { skill: "performance-analysis", params: { target: "src" } },
  { skill: "lint", params: { files: ["src/**/*.ts"] } }
], {
  parallel: true,
  maxConcurrency: 3
});
```

---

## Error Handling & Recovery

### Automatic Retry

```typescript
const mcpClient = new MCPClient(orchestrator, {
  errorRecovery: {
    enabled: true,
    maxRetries: 3,
    backoffStrategy: "exponential",
    retryableErrors: ["ECONNRESET", "ETIMEDOUT"]
  }
});
```

### Error Recovery Module

```typescript
// Direct module access for custom error handling
const recovery = mcpClient.getModule("error-recovery");

try {
  const result = await mcpClient.callSkill("project-analysis", params);
} catch (error) {
  // Check if error is recoverable
  if (recovery.isRecoverable(error)) {
    const retryResult = await recovery.retry(
      () => mcpClient.callSkill("project-analysis", params),
      { maxRetries: 3 }
    );
  }
}
```

---

## Health Monitoring

### Server Health Checks

```typescript
const mcpClient = new MCPClient(orchestrator);
const healthMonitor = mcpClient.getModule("health-monitor");

// Check all servers
const health = await mcpClient.getServerHealth();

// Configure health checks
healthMonitor.configure({
  checkInterval: 30000,
  timeout: 5000,
  unhealthyThreshold: 3
});

// Listen for health changes
healthMonitor.on("unhealthy", (server) => {
  console.warn(`MCP server unhealthy: ${server.name}`);
});
```

---

## Migration from Agent-Side Tools

### Before (Agent-Side Only)

```typescript
// OLD: Direct function calls
import { architectTools } from "./architect-tools";

const result = await architectTools.contextAnalysis(projectRoot);
```

### After (MCP)

```typescript
// NEW: MCP protocol
import { MCPClient } from "@0xray/framework";

const mcpClient = new MCPClient(orchestrator);

const result = await mcpClient.callSkill("context-analysis", {
  projectRoot
});
```

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Integration** | Agent-side only | Full MCP protocol |
| **Sharing** | Not possible | Cross-instance sharing |
| **Standardization** | Ad-hoc | MCP standard |
| **Discovery** | Manual | Automatic discovery |
| **Performance** | Variable | Optimized pooling |

---

## Troubleshooting

### MCP Server Not Found

```bash
# List available MCP servers
npx 0xray mcp list-servers

# Check server health
npx 0xray mcp health

# Verify skill registration
npx 0xray router list-skills
```

### Connection Issues

```typescript
// Debug connection problems
const mcpClient = new MCPClient(orchestrator);
const pool = mcpClient.getModule("connection-pool");

console.log("Active connections:", pool.getActiveConnections());
console.log("Available servers:", pool.getAvailableServers());
console.log("Connection errors:", pool.getRecentErrors());
```

### Performance Issues

```typescript
// Check MCP performance metrics
const metrics = await mcpClient.getMetrics();

console.log(`
  Avg Response Time: ${metrics.averageResponseTime}ms
  Cache Hit Rate: ${metrics.cacheHitRate}%
  Active Connections: ${metrics.activeConnections}
  Error Rate: ${metrics.errorRate}%
`);
```

---

## Future Enhancements

### Planned Features

1. **Additional Knowledge Skills** (9+ planned)
   - code-review.server.ts
   - security-audit.server.ts
   - database-design.server.ts
   - ui-ux-design.server.ts
   - And 5+ more

2. **Advanced Protocol Features**
   - Streaming responses
   - Bidirectional communication
   - Real-time updates

3. **Enterprise Features**
   - Distributed MCP clusters
   - Load balancing across servers
   - Advanced security policies

---

## Summary

0xRay's MCP integration provides:

✅ **Full MCP Protocol**: Standardized communication
✅ **15 MCP Servers + 44 Skills**: Consolidated v3 architecture
✅ **Module Access**: 8 focused modules for advanced use
✅ **Performance**: Connection pooling, caching, batching
✅ **Reliability**: Error recovery, health monitoring
✅ **Scalability**: Easy to add new MCP servers

---
