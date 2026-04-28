# OpenClaw Integration — Quickstart

Use 0xRay's codex compliance, quality gates, and agent routing from inside OpenClaw.

## What You Get

- **Codex enforcement** — OpenClaw agents are checked against 60 error prevention rules
- **Tool hooks** — every tool call (read, write, patch) is intercepted and validated
- **Agent routing** — patch goes to code-reviewer, grep goes to researcher
- **Quality gate** — pre/post execution validation on all tool calls
- **API server** — invoke 0xRay agents from OpenClaw skills via HTTP

## Prerequisites

- Node.js >= 18
- OpenClaw gateway running (`openclaw gateway start`)
- 0xRay installed in your project

## Install

```bash
npm install strray-ai
```

## Configuration

0xRay reads OpenClaw config from `~/.openclaw/openclaw.json` by default. You can also create a project-level config at `.opencode/openclaw/config.json`.

### Minimal Config

```json
{
  "gatewayUrl": "ws://127.0.0.1:18789",
  "authToken": "your-gateway-auth-token",
  "autoReconnect": true,
  "maxReconnectAttempts": 5,
  "reconnectDelay": 1000,
  "apiServer": {
    "enabled": true,
    "port": 18431,
    "host": "127.0.0.1"
  },
  "hooks": {
    "enabled": true,
    "toolBefore": true,
    "toolAfter": true,
    "includeArgs": true,
    "includeResult": true
  },
  "enabled": true,
  "debug": false,
  "logLevel": "info"
}
```

### Getting Your Auth Token

Your gateway auth token is in `~/.openclaw/openclaw.json`:

```bash
cat ~/.openclaw/openclaw.json | grep -A2 '"auth"'
```

Look for `gateway.auth.token`.

### Environment Variable Overrides

| Variable | Overrides |
|----------|-----------|
| `OPENCLAW_GATEWAY_URL` | `gatewayUrl` |
| `OPENCLAW_AUTH_TOKEN` | `authToken` |
| `OPENCLAW_API_KEY` | `apiServer.apiKey` |
| `OPENCLAW_API_PORT` | `apiServer.port` |
| `OPENCLAW_ENABLED` | `enabled` |
| `OPENCLAW_DEBUG` | `debug` |

## Programmatic Usage

### Connect to Gateway

```typescript
import { OpenClawClient } from 'strray-ai/dist/integrations/openclaw/client.js';

const client = new OpenClawClient({
  gatewayUrl: 'ws://127.0.0.1:18789',
  authToken: 'your-token',
  reconnect: true,
});

client.onStateChange((state, prev) => {
  console.log(`State: ${prev} → ${state}`);
});

await client.connect();
// State: disconnected → connecting → authorized
```

### Send Chat Request

```typescript
const response = await client.sendRequest('chat.send', {
  sessionKey: 'my-session',
  idempotencyKey: crypto.randomUUID(),
  message: 'Review this code for security issues',
});
```

### Listen for Events

```typescript
client.on('authorized', () => console.log('Connected!'));
client.on('*', (event, data) => {
  console.log(`Event: ${event}`, data);
});
```

### Disconnect

```typescript
client.disconnect();
```

## API Server

When `apiServer.enabled` is true, 0xRay starts an HTTP server that OpenClaw skills can call.

### Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/health` | No | Health check (version, uptime, status) |
| POST | `/api/agent/invoke` | Yes | Invoke a 0xRay agent |
| GET | `/api/agent/status` | Yes | Check agent status |
| GET | `/stats` | Yes | Request statistics |

### Invoke an Agent from an OpenClaw Skill

```bash
curl -X POST http://127.0.0.1:18431/api/agent/invoke \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"command": "analyze", "args": {"target": "src/"}}'
```

Response:

```json
{
  "success": true,
  "result": "Analysis complete: 3 issues found",
  "executionTime": 2450
}
```

### Setting the API Key

```json
{
  "apiServer": {
    "enabled": true,
    "port": 18431,
    "apiKey": "a-secure-random-string"
  }
}
```

Or via environment:

```bash
export OPENCLAW_API_KEY="a-secure-random-string"
```

## Hooks

Hooks forward 0xRay tool events to the OpenClaw gateway. When `hooks.enabled` is true, every MCP tool call triggers:

1. **tool.before** — sent before tool execution (validation, logging)
2. **tool.after** — sent after tool execution (results, errors, duration)

### Filter Specific Tools

Only forward events for specific tools:

```json
{
  "hooks": {
    "enabled": true,
    "toolBefore": true,
    "toolAfter": true,
    "toolFilter": ["write_file", "patch", "execute_code"]
  }
}
```

### Offline Buffering

When the gateway is unreachable, tool events are queued (up to 100). They flush automatically on reconnection.

## Full Integration Lifecycle

```typescript
import { OpenClawIntegration } from 'strray-ai/dist/integrations/openclaw/index.js';

const integration = new OpenClawIntegration();

// Optional: set an agent invoker for the API server
integration.setAgentInvoker({
  invoke: async (req) => ({
    success: true,
    result: `Executed: ${req.command}`,
  }),
  getStatus: async () => ({ healthy: true, version: '1.0.0' }),
});

await integration.initialize();

// Check health
const health = await integration.healthCheck();
console.log(health);

// Get stats
const stats = integration.getStatistics();
console.log(stats);

// Shutdown
await integration.shutdown();
```

## Troubleshooting

### Gateway Connection Refused

```
Error: Failed to connect to ws://127.0.0.1:18789
```

Make sure the gateway is running:

```bash
openclaw gateway status
openclaw gateway start
```

### Device Identity Required

```
Error: device identity required (NOT_PAIRED)
```

The auth token is missing or invalid. Check `~/.openclaw/openclaw.json` for `gateway.auth.token` and pass it in `authToken`.

### Gateway CPU at 100%

Add these environment variables to your gateway config:

```bash
OPENCLAW_DISABLE_BONJOUR=1
OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS=60000
OPENCLAW_PLUGIN_MANIFEST_CACHE_MS=60000
```

### API Server Returns 401

All endpoints except `/health` require the API key when one is configured:

```bash
curl -H "Authorization: Bearer your-api-key" http://127.0.0.1:18431/stats
```

## Architecture

```
0xRay MCP Tools ──hooks──▶ OpenClaw Gateway (WebSocket)
OpenClaw Skills ──HTTP──▶ 0xRay API Server (agent invoke)
0xRay Client   ──WS────▶ OpenClaw Gateway (chat, events)
```

0xRay and OpenClaw are peers. OpenClaw manages AI agent sessions and model routing. 0xRay manages code intelligence, compliance, and quality enforcement. They integrate so each can use the other's capabilities.
