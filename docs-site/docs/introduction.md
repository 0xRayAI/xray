# 0xRay — Self-Healing AI Governance OS

**v3.0.0** — 41 agents · 44 skills · 15 MCP servers · 68 codex terms · 2,196 tests

0xRay prevents AI coding mistakes before they happen. It's an intelligent governance layer that sits between you and your AI coding tools — intercepting bad proposals, enforcing code quality rules, and orchestrating multi-agent workflows automatically.

## Quick Start

```bash
npm install 0xray

# Verify installation
npx 0xray status

# Install for your platform
npx 0xray opencode install      # OpenCode (most common)
npx 0xray grok install          # Grok CLI
npx 0xray hermes install        # Hermes Agent

# Install starter skills
npx 0xray skill:install
```

## How It Works

Every code change is checked against a **68-term Codex** (coding constitution), deliberated by **3 specialized AI reviewers** (code review, security audit, research), and either approved, revised, or blocked before it ever touches your codebase.

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Reasoning · Pattern learning · Execution       │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · v3 gate (TUI/CLI hooks for 4 plugins) + CI script (full 29-validator) · SSOT (codex.json matrix)  │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  Task routing · Multi-agent coordination        │
└─────────────────────────────────────────────────┘
```

## Why 0xRay?

| Problem | Solution |
|---------|----------|
| AI hallucinates bad code | Governance gate blocks non-compliant proposals |
| No quality enforcement | v3 Enforcement Pipeline: enforcement-gate.ts (hooks) + enforce-validators.mjs (CI) + governance MCP pipeline (governance-service.ts + Dynamo) for full 29 + terms 69-81 |
| Single-agent blindspots | 3 specialized reviewers debate each proposal |
| Scattered edits | Multi-agent orchestrator coordinates work |

## Next Steps

- [Full Reference](full-reference) — Complete documentation, CLI reference, configuration
- [Docs](https://0xrayai.github.io/xray/) — Full documentation site (you are here)
- [Self-Hosting Dynamo Governance](guides/self-hosting-dynamo) — External governance service (fork, deploy, and configure your own instance)
- [GitHub](https://github.com/0xRayAI/xray) — Source code, issues, discussions
- [npm](https://www.npmjs.com/package/0xray) — Package registry
