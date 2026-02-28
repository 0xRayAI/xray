# stringray - Project Agents Guide

**Last Updated**: 2026-02-28
**Maintained by**: Manual updates (see Post-Processors below)

---

## AGENTS.md Post-Processors

AGENTS.md is maintained by **two post-processors**:

### 1. Rule Enforcer (Pre-Commit Validation)
- **Purpose**: Validates AGENTS.md exists and is current
- **Behavior**: Blocks commits if AGENTS.md is missing or >30 days old
- **Config**: `src/enforcement/rule-enforcer.ts`

### 2. Librarian Auto-Update (Post-Processing)
- **Purpose**: Auto-generate AGENTS.md from project analysis
- **Status**: Currently experimental/unreliable
- **Config**: `src/agents/librarian-agents-updater.ts`
- **Note**: May fail silently - manual updates recommended

---

## Languages
- TypeScript
- JavaScript
- Python

## APIs
- REST API
- WebSocket

## Project Components
- Services
- Data Models
- Hooks
- State Management
- Utilities
- Configuration

## Plugin Systems (IMPORTANT: Two Different Systems!)

StringRay has **two distinct plugin systems** - do NOT confuse them:

### 1. OpenCode Plugin (`.opencode/plugin/`)
**Purpose:** Injects StringRay into OpenCode framework
- Location: `.opencode/plugin/strray-codex-injection.js`
- What it does: Injects Universal Development Codex into OpenCode's AI agents
- For: OpenCode integration, NOT for third-party extensions

### 2. StringRay Plugin Ecosystem (`src/plugins/`)
**Purpose:** Third-party plugin system for extending StringRay
- Location: `src/plugins/`
- Components:
  - `plugin-system.ts` - Core: PluginRegistry, PluginSandbox, PluginValidator
  - `marketplace/` - Plugin discovery and download service
- What it does: Allows third-party developers to create custom agents
- For: Third-party plugins, NOT OpenCode integration

### Quick Reference
| What You Want | Use This |
|---------------|----------|
| Extend StringRay with custom agents | `src/plugins/` |
| Inject codex into OpenCode | `.opencode/plugin/` |
---
*This AGENTS.md is auto-maintained by StringRay AI Librarian*