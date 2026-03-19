# OpenClaw Research Summary

**Date:** 2026-03-14 (Updated: 2026-03-15)
**Researcher:** StringRay Research Agent
**Thoroughness:** Very Thorough
**Status:** ✅ Updated with Invocation Mechanism

---

## Executive Summary

**OpenClaw** is a **self-hosted AI gateway** that connects messaging platforms (WhatsApp, Telegram, Discord, Slack, iMessage, and more) to AI coding agents. It provides:

- **Multi-channel inbox**: Single Gateway serves all messaging platforms simultaneously
- **WebSocket control plane** at `ws://127.0.0.1:18789` (default)
- **AgentSkills-compatible** skill system with `SKILL.md` files
- **Tools system**: browser, canvas, nodes, cron, sessions with typed APIs
- **Device pairing**: iOS/Android/macOS nodes with capabilities (camera, screen, voice)
- **Security model**: Device pairing, scope-based auth, execution approvals

**Key Finding**: OpenClaw is NOT a cloud API service - it's a local gateway you run yourself. The integration should treat OpenClaw as an **extension gateway** for StringRay agents, enabling them to leverage OpenClaw's channels and tools.

---

## 1. Integration Approaches (Ranked by Viability)

### Approach 1: Skill-Based Integration ⭐⭐⭐ RECOMMENDED

**How it works:**
- Create OpenClaw skills that expose StringRay capabilities to OpenClaw agents
- Skills are AgentSkills-compatible with `SKILL.md` files
- OpenClaw loads skills into agent context automatically
- **Skills invoke StringRay via HTTP API** (see Section 2 for details)

**Pros:**
- ✅ Follows OpenClaw's native pattern
- ✅ Skills can be distributed via ClawHub
- ✅ Leverages OpenClaw's tool catalog system
- ✅ Agents can discover and use skills automatically
- ✅ Compatible with OpenClaw's security model
- ✅ Simple to implement and debug

**Cons:**
- ⚠️ Skills limited to agent context (no independent server)
- ⚠️ Requires OpenClaw to be running
- ⚠️ Requires HTTP API server running on StringRay side

**Use Case:** StringRay agents can access OpenClaw channels and tools by requesting `/strray` commands. OpenClaw skills make HTTP requests to StringRay's API server.

---

## 2. How OpenClaw Skills Invoke StringRay (CRITICAL)

This is the most important piece of the integration - **how do OpenClaw skills actually call StringRay?**

### The Answer: HTTP API Server

OpenClaw skills can execute JavaScript code, make HTTP requests, and run shell scripts. StringRay exposes a local HTTP API server that skills call directly.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    INVOCATION FLOW                                              │
└─────────────────────────────────────────────────────────────────────────────────┘

  User Message (WhatsApp/Telegram/Discord)
          │
          ▼
  OpenClaw Gateway
          │
          ▼
  Pi Agent detects "/strray" command
          │
          ▼
  Loads stringray-orchestrator skill
          │
          ▼
  Executes skill's index.mjs
          │
          │ fetch('http://localhost:18431/api/agent/invoke', {
          │   method: 'POST',
          │   body: JSON.stringify({
          │     command: 'analyze',
          │     args: { file: 'src/index.ts' }
          │   })
          │ })
          ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │           StringRay HTTP API Server (port 18431)               │
  │                                                                 │
  │  POST /api/agent/invoke    - Main entry point                  │
  │  POST /api/tools/execute   - Execute tools directly            │
  │  GET  /api/status          - Health check                      │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
          │
          ▼
  StringRay Orchestrator executes the command
          │
          ▼
  Returns result to skill
          │
          ▼
  Skill formats response
          │
          ▼
  OpenClaw sends to user via messaging app
```

### Why HTTP?

1. **Native Support**: OpenClaw skills can use `fetch` or `node-fetch` directly
2. **Cross-Process**: Works even if StringRay and OpenClaw are separate processes
3. **Simple**: Easy to debug, test, and secure
4. **Stateless**: No complex state management needed
5. **Firewalls**: Works on localhost without network exposure

### Skill Handler Example

```javascript
// ~/.openclaw/skills/stringray-orchestrator/index.mjs

const API_URL = process.env.STRINGRAY_API_URL || 'http://localhost:18431';

export async function run(params, context) {
  const { command, args } = params;
  
  // Make HTTP request to StringRay
  const response = await fetch(`${API_URL}/api/agent/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args })
  });
  
  const result = await response.json();
  return result;
}
```

---

## 3. Authentication Flow - How to Get Device Tokens

### Overview

OpenClaw uses device-based authentication. To connect StringRay to OpenClaw, you need:

1. **Device ID** - A unique identifier for the integration
2. **Device Token** - Obtained through pairing
3. **Scopes** - Permission levels

### How to Obtain Device Tokens

#### Option 1: QR Code Pairing (Recommended)

```bash
# 1. Start OpenClaw Gateway
openclaw gateway start

# 2. Generate pairing QR code
openclaw device pair --name "StringRay Integration"

# 3. Scan QR with OpenClaw mobile app
#    The app will show a token

# 4. Retrieve token
openclaw device list
# Output:
# DEVICE ID           | NAME                    | TOKEN
# strray-integration  | StringRay Integration  | oc_dev_xxxxx...
```

#### Option 2: CLI Token Generation (Production)

```bash
# For server-to-server integrations
openclaw device create \
  --name "StringRay Production" \
  --type server \
  --scopes "operator.read,operator.write,events.subscribe"

# Output:
# {
#   "deviceId": "strray-prod-xxxxx",
#   "deviceToken": "oc_dev_xxxxxxxxxxxxxxxxxxxxx",
#   "expiresAt": "2027-03-15T00:00:00Z"
# }
```

#### Option 3: Environment Variables (Development)

```bash
# In your shell or .env file
export OPENCLAW_DEVICE_ID=strray-dev-xxxxx
export OPENCLAW_DEVICE_TOKEN=oc_dev_xxxxxxxxxxxxxxxxxxxxx
```

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN LIFECYCLE                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

  Created ──▶ Active ──▶ Expired ──▶ Refreshed
     │                    │
     │                    └──▶ Can refresh before expiry
     │                         with: openclaw device refresh
     │
     └──▶ Store securely (keychain, env vars)
          NEVER log or expose in code
```

---

## 4. OpenClaw Architecture

### What OpenClaw Actually Is

**Not This:**
- ❌ Cloud webhook API service
- ❌ File operation monitoring service
- ❌ Event tracking analytics platform

**But This:**
- ✅ Self-hosted AI gateway running on local machine
- ✅ WebSocket-based control plane at `ws://127.0.0.1:18789`
- ✅ AgentSkills system with `SKILL.md` files
- ✅ Tool catalog for plugin capabilities
- ✅ Multi-channel support (WhatsApp, Telegram, Discord, Slack, iMessage, etc.)
- ✅ Device pairing system for secure connections
- ✅ Scope-based authentication and permissions

### OpenClaw Protocol v3

**WebSocket Handshake:**
```typescript
{
  "minProtocol": 3,
  "maxProtocol": 3,
  "client": {
    "id": "strray-integration",
    "version": "1.10.0",
    "platform": "node",
    "mode": "operator"
  },
  "role": "operator",
  "scopes": ["operator.read", "operator.write"],
  "caps": [],
  "commands": [],
  "device": {
    "id": "device-uuid",
    "token": "device-token"
  }
}
```

**Frame Types:**
- `req`: Request frames (client → server)
- `res`: Response frames (server → client)
- `event`: Event notifications (server → all connected clients)

### AgentSkills Format

Skills use `SKILL.md` files with frontmatter:

```yaml
---
name: my-skill
description: "Description of skill"
metadata:
  openclaw:
    primaryEnv: MY_ENV_VAR
    emoji: 🎯
user-invocable: true
requires:
  env:
    - STRINGRAY_API_URL
    - STRINGRAY_API_KEY
---

# Skill Documentation

Commands and usage information here.
```

---

## 5. Supported Features

### Channels
- ✅ WhatsApp
- ✅ Telegram
- ✅ Discord
- ✅ Slack
- ✅ iMessage
- ✅ SMS
- ✅ Email (limited support)

### Tool Capabilities
- ✅ Browser - Web browsing capabilities
- ✅ Canvas - Canvas manipulation
- ✅ Nodes - Node.js runtime access
- ✅ Cron - Scheduled task execution
- ✅ Sessions - Session management

### Security Model
- ✅ Device pairing with public/private key cryptography
- ✅ Scope-based permissions (operator.read, operator.write)
- ✅ Execution approval prompts for sensitive operations
- ✅ Device token rotation
- ✅ Connection authorization (operator mode)

---

## 6. Key Technical Constraints

### Limitations
- Skills run in agent context (no independent server process)
- Tools require type schemas for input/output validation
- WebSocket connection must be maintained for real-time updates
- Device pairing requires physical access or QR code scanning
- Protocol version locked to v3 (no backward compatibility guaranteed for v2)

### Performance Considerations
- WebSocket overhead for bidirectional communication
- Skill loading time impacts agent startup
- Tool execution subject to OpenClaw's performance
- Rate limiting may apply for tool invocations

### Security Considerations
- Device keys must be stored securely
- Auth tokens have expiration
- Scope-based permissions limit what skills can access
- Execution approvals require user interaction
- Network must be trusted (local loopback by default)

---

## 7. Documentation Sources

### Official Documentation
- **Gateway Protocol**: https://docs.openclaw.ai/gateway/protocol
- **AgentSkills Guide**: https://docs.openclaw.ai/skills
- **Tools System**: https://docs.openclaw.ai/tools
- **Security Model**: https://docs.openclaw.ai/security

### GitHub Repositories
- OpenClaw Core: https://github.com/openclawai/openclaw
- Example Skills: https://github.com/openclawaii/skills

### Community Resources
- Discord Server: [OpenClaw Community]
- Reddit: r/openclaw

---

## 8. Recommended Integration Pattern

Based on all findings, the **Skill-Based Integration** (Approach 1) is recommended because:

1. **Native to OpenClaw**: Follows OpenClaw's established skill pattern
2. **Distribution**: Skills can be shared via ClawHub
3. **Discovery**: Automatic skill discovery and registration
4. **Security**: Compatible with OpenClaw's scope and approval systems
5. **Simplicity**: Easier to implement and maintain than tool-based or full client

### Data Flow

```
User (via messaging app)
    │
    ▼
OpenClaw Gateway (receives message)
    │
    ▼
StringRay Skill (processes /strray command)
    │
    │ HTTP POST to localhost:18431
    ▼
StringRay HTTP API Server (executes request)
    │
    ▼
Result (returned to skill)
    │
    ▼
OpenClaw Gateway (sends response)
    │
    ▼
User (via messaging app)
```

---

## 9. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|-------|-----------|--------|------------|
| OpenClaw Gateway not running | Medium | High | Implement graceful degradation; show clear error messages |
| WebSocket protocol changes | Low | High | Pin to protocol v3; validate on connect; implement version checking |
| Network issues (firewalls) | Medium | High | Implement exponential backoff reconnection; support proxy settings |
| Skill loading failures | Medium | High | Add skill validation; implement health checks |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|-------|-----------|--------|------------|
| Hook interference with other integrations | Low | Medium | Use priority system; provide enable/disable config |
| Performance overhead on StringRay tools | Medium | Medium | Implement async hook handling; use efficient serialization |
| State synchronization issues | Low | Medium | Use event sourcing pattern; implement state versioning |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|-------|-----------|--------|------------|
| Configuration errors | Medium | High | Provide schema validation; offer config wizard |
| Device pairing failures | Medium | High | Provide pairing UI; implement retry logic |
| Resource exhaustion | Low | Medium | Implement connection pooling; add connection limits |

### Security Risks

| Risk | Probability | Impact | Mitigation |
|-------|-----------|--------|------------|
| Auth token leakage | Low | Critical | Never log tokens; use secure storage; rotate regularly |
| Malicious skill injection | Low | High | Implement skill validation; use sandboxing; restrict permissions |
| Unauthorized API access | Medium | High | Implement API keys/secrets manager; restrict capabilities; use scopes |

---

## 10. Next Steps

### Immediate
1. Review architect's detailed implementation plan (updated with invocation mechanism)
2. Confirm choice of skill-based integration
3. Define specific skills needed:
   - `stringray-orchestrator` - Main command interface
   - `stringray-tools` - Tool access layer
4. Create skill development templates

### Short-term
1. Implement WebSocket client foundation
2. Implement HTTP API server (critical for skill invocation!)
3. Create configuration management
4. Develop initial skills
5. Implement StringRay hook integration
6. Add comprehensive error handling

### Long-term
1. Full test coverage
2. Documentation for users and developers
3. ClawHub distribution (if applicable)
4. Community feedback collection
5. Iterative improvements based on usage

---

## Conclusion

The research phase is complete with full details on the invocation mechanism. We now have a clear understanding of:

1. ✅ What OpenClaw actually is (self-hosted gateway, not cloud API)
2. ✅ How OpenClaw's protocol works (WebSocket v3, AgentSkills)
3. ✅ **How skills invoke StringRay** (HTTP API server on port 18431)
4. ✅ How to authenticate (device tokens via pairing)
5. ✅ Four viable integration approaches ranked by viability
6. ✅ Comprehensive risk assessment with mitigation strategies
7. ✅ Clear recommendation for skill-based integration as primary approach

The architect has provided a detailed 7-phase implementation plan that should be reviewed and approved before proceeding.

---

**Researcher Recommendation:**
Approve architect's plan and begin with Phase 2 (Foundation) to implement the WebSocket client and HTTP API server, as this is the most viable and lowest-risk approach.

---

**Status:** ✅ Research Complete - Ready for Implementation Planning

*Updated: 2026-03-15 with invocation mechanism details*
