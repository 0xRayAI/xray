# 0xRay — Self-Healing AI Governance OS

**v2.0.0** — 42 agents · 44 skills · 41 MCP servers · 68 codex terms · 2,822 tests

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
│  Codex enforcement · Multi-agent review · SSOT  │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  Task routing · Multi-agent coordination        │
└─────────────────────────────────────────────────┘
```

## Why 0xRay?

| Problem | Solution |
|---------|----------|
| AI hallucinates bad code | Governance gate blocks non-compliant proposals |
| No quality enforcement | 68-rule Codex checks every change |
| Single-agent blindspots | 3 specialized reviewers debate each proposal |
| Scattered edits | Multi-agent orchestrator coordinates work |

## Next Steps

- [Full Reference](full-reference) — Complete documentation, CLI reference, configuration
- [Docs](https://0xrayai.github.io/xray/) — Full documentation site (you are here)
- [GitHub](https://github.com/0xRayAI/xray) — Source code, issues, discussions
- [npm](https://www.npmjs.com/package/0xray) — Package registry
