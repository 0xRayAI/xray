# OpenClaw Integration - Executive Summary

**Date:** 2026-03-14 (Updated: 2026-03-15)
**Status:** ✅ Updated - Ready for Implementation
**Version:** 1.1.0

---

## Quick Reference

| Item | Details |
|------|---------|
| **What OpenClaw Is** | Self-hosted AI gateway with WebSocket control plane |
| **Gateway URL** | `ws://127.0.0.1:18789` (default) |
| **Protocol** | v3 (WebSocket-based) |
| **Integration Type** | Skill-Based (AgentSkills format) |
| **StringRay API Server** | `http://localhost:18431` (default) |
| **Estimated Timeline** | ~10 weeks |

---

## The Key Question: How Do OpenClaw Skills Invoke StringRay?

**Answer:** HTTP API Server

OpenClaw skills are JavaScript modules that can make HTTP requests. StringRay exposes a local HTTP API server that skills call directly.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    INVOCATION FLOW                                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  User: "Hey, analyze src/index.ts" (via WhatsApp/Telegram/Discord)
          │
          ▼
  OpenClaw Gateway
          │
          ▼
  Pi Agent → Loads stringray-orchestrator skill
          │
          │ fetch('http://localhost:18431/api/agent/invoke', {
          │   method: 'POST',
          │   body: JSON.stringify({ command: 'analyze', args: {...} })
          │ })
          ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │              StringRay HTTP API Server (port 18431)                       │
  │                                                                           │
  │  POST /api/agent/invoke    - Execute agent commands                       │
  │  POST /api/tools/execute   - Execute specific tools                      │
  │  GET  /api/status          - Health check                                │
  │                                                                           │
  └───────────────────────────────────────────────────────────────────────────┘
          │
          ▼
  StringRay processes request
          │
          ▼
  Result returned to skill → OpenClaw → User
```

**Why HTTP?**
- Skills natively support HTTP via fetch/node-fetch
- Works across process boundaries
- Simple to implement and debug
- Secure (localhost only)

---

## Authentication Flow

### How to Get Device Tokens

OpenClaw uses device-based authentication. You need:

1. **Device ID** - Unique identifier for the integration
2. **Device Token** - Obtained via pairing

```bash
# Option 1: QR Code Pairing (Recommended)
openclaw device pair --name "StringRay Integration"
# Scan QR with mobile app, then:
openclaw device list

# Option 2: CLI Token Generation
openclaw device create \
  --name "StringRay Production" \
  --type server \
  --scopes "operator.read,operator.write,events.subscribe"

# Option 3: Environment Variables
export OPENCLAW_DEVICE_ID=strray-dev-xxxxx
export OPENCLAW_DEVICE_TOKEN=oc_dev_xxxxxxxxxxxxxxxxxxxxx
```

---

## What We Learned (The Hard Way)

### Previous Attempt (Failed)
- Assumed OpenClaw was a **cloud API service** for file monitoring
- Used wrong endpoint: `https://api.openclaw.io/v1/webhooks/events`
- Implemented outbound webhook delivery (wrong direction)
- **Result:** Integration couldn't work - API endpoint doesn't exist

### Correct Understanding
- OpenClaw is a **self-hosted local AI assistant**
- It provides **inbound webhooks** (receives requests FROM external services)
- Uses **WebSocket** for real-time communication
- Has **AgentSkills** system for extending capabilities
- **Integration direction:** StringRay should create skills that OpenClaw can use

---

## The Plan

### Recommended Approach: Skill-Based Integration with HTTP API

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│  OpenClaw    │────▶│   StringRay  │
│  (WhatsApp,  │     │   Gateway    │     │  HTTP API    │
│  Discord,    │     │              │     │  (port 18431)│
│  Telegram)   │◀────│              │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### What StringRay Will Provide

1. **HTTP API Server** - Exposes StringRay capabilities on localhost
2. **WebSocket Client** - Connect to OpenClaw Gateway for events
3. **Skills** - `stringray-orchestrator` and `stringray-tools` (installed in `~/.openclaw/skills/`)
4. **Tool Hooks** - tool.before/after integration

### What Users Can Do

After installation, users can:
- Send messages to StringRay via WhatsApp, Telegram, Discord, etc.
- Invoke StringRay commands like `/strray-analyze src/index.ts`
- Receive code analysis results back in their messaging app
- Track tool executions in real-time

---

## Implementation Phases

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| **1** | Research Validation | 1 week | ✅ Complete |
| **2** | Foundation (Client, Config, Types, State, Auth) | 2 weeks | ⏳ Next |
| **3** | HTTP API Server | 1 week | ⏳ Planned |
| **4** | Skill Development | 1 week | ⏳ Planned |
| **5** | StringRay Hooks | 2 weeks | ⏳ Planned |
| **6** | Testing | 2 weeks | ⏳ Planned |
| **7** | Documentation | 1 week | ⏳ Planned |

**Total:** ~10 weeks

---

## Key Files to Create

### StringRay Integration (in StringRay codebase)

```
src/integrations/openclaw/
├── types.ts              # Protocol types
├── config.ts             # Configuration loader
├── client.ts             # WebSocket client (FIXED)
├── errors.ts             # Error classes
├── state.ts              # State management (NEW)
├── auth.ts               # Authentication flow (NEW)
├── index.ts              # Main module
│
├── api/
│   ├── server.ts         # HTTP API server (NEW - CRITICAL)
│   └── routes/
│       ├── agent.ts      # /api/agent/invoke
│       └── status.ts     # /api/status
│
└── hooks/
    └── strray-hooks.ts   # StringRay hook integration
```

### OpenClaw Skills (installed in user's OpenClaw directory)

```
~/.openclaw/skills/
├── stringray-orchestrator/
│   ├── SKILL.md
│   └── index.mjs
└── stringray-tools/
    ├── SKILL.md
    └── index.mjs
```

**Note:** Skills go in the user's OpenClaw directory (`~/.openclaw/skills/`), NOT in the StringRay codebase. This follows OpenClaw's installation pattern.

---

## Configuration

```json
{
  "gatewayUrl": "ws://127.0.0.1:18789",
  "deviceId": "your-device-id",
  "deviceToken": "your-device-token",
  "apiServer": {
    "port": 18431,
    "apiKey": "optional-api-key"
  },
  "autoConnect": true,
  "enabled": true
}
```

---

## Fixes from Review

### Critical Issues Fixed:
1. ✅ **WebSocket client** - `sendRequest()` now properly returns responses (not fire-and-forget)
2. ✅ **Message parsing** - Added try/catch to prevent crashes on invalid messages
3. ✅ **generateId()** - Now defined and used for request tracking
4. ✅ **Invocation mechanism** - Added HTTP API server that skills call
5. ✅ **TypeScript types** - Replaced `any` with proper types

### High Priority Issues Fixed:
6. ✅ **Authentication flow** - Documented how to obtain device tokens
7. ✅ **Skill vs hook architecture** - Clarified: skills are in ~/.openclaw, hooks are in StringRay
8. ✅ **Duplicate skill locations** - Fixed: skills go in user's OpenClaw directory
9. ✅ **Error handling strategy** - Added error categories and handling layers
10. ✅ **State management** - Added connection state machine and reconnection strategy

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenClaw not running | Graceful degradation, clear error messages |
| Protocol changes | Pin to v3, validate on connect |
| Network issues | Exponential backoff reconnection |
| Configuration errors | Schema validation, helpful messages |
| Auth token leakage | Never log tokens, secure storage |

---

## Success Criteria

- ✅ WebSocket client connects to OpenClaw
- ✅ HTTP API server responds to skill requests
- ✅ Skills load in OpenClaw
- ✅ Commands discoverable (`/strray-analyze`, `/strray-code-review`, etc.)
- ✅ Tool events captured and sent to OpenClaw
- ✅ All tests passing (>80% coverage)
- ✅ Documentation complete

---

## Documentation

| Document | Location |
|----------|----------|
| Research Summary | `docs/research/openclaw/researcher-summary.md` |
| Architecture Summary | `docs/research/openclaw/architect-summary.md` |
| This Executive Summary | `docs/research/openclaw/README.md` |

---

## Next Steps

1. **Approve this plan**
2. **Begin Phase 2** (Foundation)
   - Create WebSocket client (with fixes)
   - Implement configuration loader
   - Define TypeScript types
   - Add state management
   - Add authentication flow
3. **Phase 3**: Implement HTTP API server (the critical invocation piece!)
4. **Continue through phases** as outlined

---

## Resources

- OpenClaw Gateway Protocol: https://docs.openclaw.ai/gateway/protocol
- AgentSkills Format: https://docs.openclaw.ai/skills
- Tools System: https://docs.openclaw.ai/tools

---

**Status:** ✅ Updated - Ready for Implementation

The research and design phases are complete. We have a clear, viable plan that correctly integrates with OpenClaw's actual architecture, including the critical invocation mechanism (HTTP API server).

*Updated: 2026-03-15 with review feedback*
