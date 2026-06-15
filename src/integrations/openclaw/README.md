# OpenClaw Integration

0xray integration for OpenClaw - a self-hosted AI gateway that connects messaging platforms to AI coding agents.

## Overview

This integration allows 0xray to:
- Connect to OpenClaw Gateway via WebSocket
- Expose 0xray capabilities through OpenClaw skills
- Send tool execution events to OpenClaw for real-time tracking
- Receive commands from OpenClaw channels (WhatsApp, Telegram, Discord, etc.)

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│  OpenClaw    │────▶│   0xray   │
│  (WhatsApp,  │     │   Gateway    │     │    Skills    │
│  Discord,    │     │              │     │              │
│  Telegram)   │◀────│              │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │  WebSocket   │
                   │   Client     │
                   └──────────────┘
```

## Installation

### 1. Install Dependencies

```bash
npm install ws
```

### 2. Configure OpenClaw

Create `.xray/config/openclaw.json`:

```json
{
  "gatewayUrl": "ws://127.0.0.1:18789",
  "authToken": "your-auth-token",
  "deviceId": "your-device-id",
  "apiServer": {
    "enabled": true,
    "port": 18431,
    "host": "127.0.0.1",
    "apiKey": "your-api-key"
  },
  "hooks": {
    "enabled": true
  },
  "enabled": true
}
```

### 3. Install OpenClaw Skills

Copy skills to your OpenClaw skills directory:

```bash
cp -r skills/* ~/.openclaw/skills/
```

## Usage

### Initialize Integration

```typescript
import { initializeOpenClawIntegration } from './src/integrations/openclaw/index.js';

const integration = await initializeOpenClawIntegration();

// Or with custom agent invoker
const integration = await initializeOpenClawIntegration('/path/to/config.json', myAgentInvoker);
```

### Using OpenClaw Commands

After installation, use these commands in any OpenClaw channel:

- `/xray` - Show status
- `/xray-analyze <file>` - Analyze code
- `/xray-code <file>` - Code review
- `/xray-file <file>` - Read file
- `/xray-exec <command>` - Execute command

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gatewayUrl` | string | `ws://127.0.0.1:18789` | OpenClaw WebSocket URL |
| `authToken` | string | - | Authentication token |
| `deviceId` | string | - | Device ID for pairing |
| `apiServer.enabled` | boolean | `true` | Enable HTTP API server |
| `apiServer.port` | number | `18431` | API server port |
| `apiServer.host` | string | `127.0.0.1` | API server host |
| `apiServer.apiKey` | string | - | API key for auth |
| `hooks.enabled` | boolean | `true` | Enable tool hooks |
| `autoReconnect` | boolean | `true` | Auto reconnect |
| `enabled` | boolean | `true` | Enable integration |

## API Server

The integration exposes a local HTTP API on port 18431:

- `GET /health` - Health check
- `POST /api/agent/invoke` - Invoke agent
- `GET /api/agent/status` - Agent status

## Skills

### 0xray-orchestrator

Main skill providing 0xray commands:

```markdown
/xray                    - Show status
/xray-analyze <file>    - Analyze code
/xray-code <file>       - Code review
/xray-file <file>       - Read file
/xray-exec <command>    - Execute command
```

## Documentation

See `docs/research/openclaw/` for detailed documentation.

## License

MIT
