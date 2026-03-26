# ⚡ StringRay AI

**Enterprise AI Orchestration Framework for OpenCode/Claude Code**

[![Version](https://img.shields.io/badge/version-1.14.2-blue?style=flat-square)](https://npmjs.com/package/strray-ai)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-2368%20passed-brightgreen?style=flat-square)](src/__tests__)
[![GitHub stars](https://img.shields.io/github/stars/htafolla/stringray?style=social)](https://github.com/htafolla/stringray)

> **Intelligent Multi-Agent Coordination with 99.6% Systematic Error Prevention**

StringRay extends OpenCode/Claude Code with intelligent multi-agent orchestration, Codex compliance validation, and enterprise-grade security. It automatically routes tasks to specialized agents based on complexity and provides systematic error prevention.

## What is StringRay?

StringRay is a **one-command level-up** for OpenCode. Instead of installing OpenCode first, then adding StringRay, just run:

```bash
npx strray-ai install
```

This single command:
1. Detects if OpenCode is installed
2. Auto-installs OpenCode if missing
3. Layers on the full StringRay kernel (Codex, orchestrator, enforcer, processors, MCP, reflections)
4. Installs skills (Antigravity + Impeccable + OpenViking + Claude SEO)
5. Adds CLI commands for agent publishing and status

**Goal:** Any developer can run one command and instantly get a production-grade, governed agent runtime.

### Who is it for?

- **Developers** using OpenCode or Claude Code who want AI-assisted development
- **Teams** needing consistent code quality and error prevention
- **Enterprises** requiring security, compliance, and audit capabilities

## 🚀 Quick Start

```bash
# Install StringRay (auto-configures OpenCode on install)
npm install strray-ai

# That's it! StringRay is now active.
# Restart OpenCode/Claude Code to load the plugin.
```

**What happens during install?**
- Copies OpenCode configuration files to your project
- Configures 26 agents with proper capabilities
- Sets up Codex enforcement rules
- Enables webhook triggers for CI/CD integration
- Ready to use with Claude Code immediately

## ✨ Features

- **🤖 26 Specialized Agents** - From code review to mobile development
- **📏 99.6% Error Prevention** - Universal Development Codex (60 terms)
- **⚡ 30 Lazy-Loading Skills** - Plus Claude SEO & Antigravity integrations
- **🛡️ Enterprise Security** - Comprehensive validation and scanning
- **📊 Real-time Monitoring** - Performance tracking and health checks
- **🔄 Complexity-Based Routing** - Intelligent task delegation
- **🔌 Webhook Integration** - GitHub, GitLab, Bitbucket, Stripe
- **✅ 2368 Tests** - Production-ready with comprehensive test coverage

## 🤖 Available Agents

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Complex multi-step task coordination |
| `@architect` | System design & technical decisions |
| `@security-auditor` | Vulnerability detection |
| `@code-reviewer` | Quality assessment |
| `@refactorer` | Technical debt elimination |
| `@testing-lead` | Testing strategy & coverage |
| `@bug-triage-specialist` | Error investigation |
| `@storyteller` | Narrative deep reflections |
| `@researcher` | Codebase exploration |
| `@mobile-developer` | iOS/Android/React Native/Flutter |

> **Note:** StringRay auto-configures all agents during installation. To customize agent settings, see the [Agent Configuration Guide](https://github.com/htafolla/stringray/blob/main/docs/AGENT_CONFIG.md).

[View all 26 agents →](https://github.com/htafolla/stringray/blob/main/AGENTS.md)

## 📦 OpenClaw Integration

StringRay integrates with **OpenClaw** - a self-hosted AI gateway that connects messaging platforms (WhatsApp, Telegram, Discord, Slack) to AI coding agents.

### What It Does

- **WebSocket Connection**: Connect to OpenClaw Gateway at `ws://127.0.0.1:18789`
- **Skill Invocation**: OpenClaw skills invoke StringRay agents via HTTP API (port 18431)
- **Tool Events**: Forward tool.before/tool.after events to OpenClaw for real-time tracking
- **Offline Buffering**: Events queued when disconnected, sent on reconnect

### Quick Setup

```bash
# Configure in .opencode/openclaw/config.json
{
  "gatewayUrl": "ws://127.0.0.1:18789",
  "authToken": "your-device-token",
  "deviceId": "your-device-id",
  "apiServer": { "enabled": true, "port": 18431 },
  "hooks": { "enabled": true, "toolBefore": true, "toolAfter": true }
}

# Initialize in code
import { initializeOpenClawIntegration } from 'strray-ai';
const integration = await initializeOpenClawIntegration();
```

See [OpenClaw Integration Guide](src/integrations/openclaw/README.md) for details.

## 📖 Documentation

| Guide | Description |
|-------|-------------|
| [Agent Configuration](https://github.com/htafolla/stringray/blob/main/docs/AGENT_CONFIG.md) | Copy-paste opencode.json agent setup |
| [Configuration Reference](https://github.com/htafolla/stringray/blob/main/docs/CONFIGURATION.md) | Complete features.json settings |
| [Agent Documentation](https://github.com/htafolla/stringray/blob/main/AGENTS.md) | Detailed agent specifications |
| [Universal Codex](https://github.com/htafolla/stringray/blob/main/.opencode/strray/codex.json) | 60-term codex reference |
| [Troubleshooting](https://github.com/htafolla/stringray/blob/main/docs/TROUBLESHOOTING.md) | Common issues & solutions |

## 🔧 CLI Tools

StringRay provides CLI utilities for managing and monitoring your installation:

```bash
# Core commands
npx strray-ai status              # Check configuration and plugin status
npx strray-ai validate            # Validate installation and dependencies
npx strray-ai capabilities       # Show all available features
npx strray-ai health             # Run health check on framework components
npx strray-ai report             # Generate usage and performance reports

# Agent management
npx strray-ai publish-agent --agent orchestrator  # Package agent for AgentStore

# Skills management
npx strray-ai antigravity status  # Show all skills with licenses
```

**Note:** Installation is automatic via `npm install strray-ai`. The postinstall hook configures everything automatically.

## ⚙️ Configuration

### Default Configuration

StringRay works out of the box with sensible defaults. The npm postinstall hook automatically sets up:

```
.opencode/
├── agents/         # 24+ agent configurations
├── skills/         # Framework skills
├── strray/
│   ├── codex.json      # Codex rules
│   ├── features.json   # Feature flags
│   └── config.json    # Token/memory management
└── hooks/          # Pre/post processing hooks
```

### Customizing Agents

Edit `.opencode/agents/` to customize agent behavior:

```yaml
# Example: Customize enforcer agent
name: enforcer
maxComplexity: 40  # Only handle simple tasks
temperature: 0.2   # More precise responses
enabled: true
```

### Feature Flags

Edit `.opencode/strray/features.json` to enable/disable features:

```json
{
  "codexEnforcement": true,
  "agentGovernance": true,
  "analytics": true,
  "webhooks": true
}
```

### Token Management

Edit `.opencode/strray/config.json` to adjust token limits:

```json
{
  "token_management": {
    "maxPromptTokens": 20000,
    "warningThreshold": 15000
  }
}
```

See [Configuration Reference](https://github.com/htafolla/stringray/blob/main/docs/CONFIGURATION.md) for full options.

### Version Pinning

StringRay supports pinning versions for reproducible installations:

```json
{
  "version_pinning": {
    "strray_ai": "^1.15.0",
    "opencode": "^2.14.0",
    "skills": {
      "antigravity": "latest",
      "impeccable": "latest",
      "openviking": "latest",
      "claude_seo": "latest"
    }
  }
}
```

Add to `.opencode/strray/features.json` to pin specific versions.

## 📁 Project Structure

```
stringray/
├── src/
│   ├── __tests__/              # Test suites (unit, integration, performance)
│   ├── agents/                 # Agent implementations
│   ├── analytics/              # Pattern analysis & learning
│   ├── cli/                    # CLI commands
│   ├── circuit-breaker/        # Resilience patterns
│   ├── core/                   # Core framework
│   ├── delegation/             # Task routing & delegation
│   ├── enforcement/            # Codex enforcement
│   ├── infrastructure/         # IaC validation
│   ├── integrations/           # External integrations
│   │   ├── base/              # BaseIntegration framework
│   │   └── openclaw/          # OpenClaw integration
│   ├── mcps/                  # MCP server implementations
│   ├── monitoring/            # System monitoring
│   ├── orchestrator/          # Multi-agent orchestration
│   ├── performance/           # Performance optimization
│   ├── plugins/              # Plugin system
│   ├── postprocessor/         # Post-processing pipeline
│   ├── reporting/             # Report generation
│   ├── security/              # Security systems
│   ├── session/               # Session management
│   ├── test-utils/            # Test utilities and helpers
│   ├── validation/            # Agent config & estimation validators
│   └── jobs/                  # Background job management
├── .opencode/                 # OpenCode configuration
│   ├── agents/               # Agent configs (26 agents)
│   ├── strray/               # StringRay config
│   │   ├── codex.json        # 60-term development codex
│   │   ├── features.json     # Feature flags
│   │   └── config.json       # Token management
│   └── hooks/                # Git hooks
├── skills/                    # StringRay skills
├── docs/                      # Documentation
│   ├── reflections/          # Deep technical reflections
│   └── research/             # Research documents
└── scripts/                   # Build & utility scripts
```

## 💬 Usage

```bash
# Code quality enforcement
@enforcer analyze this code for issues

# Complex task orchestration  
@orchestrator implement user authentication system

# System design
@architect design database schema for e-commerce

# Security audit
@security-auditor scan for vulnerabilities
```

## 🔌 Framework Integration

StringRay integrates with your existing infrastructure via webhooks and APIs:

```bash
# CLI tool for integration
npx strray-integration --help
```

```typescript
// Programmatic integration
import { StringRayIntegration } from 'strray-ai/integration';

const postProcessor = new PostProcessor(stateManager);
const integration = new StringRayIntegration(postProcessor);

// Express
app.use('/webhooks', integration.getWebhookApp());
app.use('/api/post-process', integration.getAPIApp());

// Fastify
fastify.register(integration.getWebhookRouter(), { prefix: '/webhooks' });
fastify.register(integration.getAPIRouter(), { prefix: '/api/post-process' });
```

**Supported Webhooks:**
- GitHub (push, PR, issues)
- GitLab (push, merge requests)
- Bitbucket (push, pull requests)
- Stripe (subscriptions, payments)

## 🎯 Skills Integration

StringRay comes with **30+ curated skills** out of the box:

| Skill Pack | Count | License | Description |
|------------|-------|---------|-------------|
| Antigravity | 17 | MIT | Language experts, DevOps, Security, Business |
| Claude SEO | 12 | MIT | SEO optimization and analysis |
| Impeccable | 1 | Apache 2.0 | AI frontend design language |
| OpenViking | 1 | Apache 2.0 | Context database for agents |

### Impeccable - AI Frontend Design

[Impeccable](https://github.com/pbakaus/impeccable) is a design language skill that teaches AI coding assistants professional frontend design:

```bash
/audit           # Find issues
/critique       # UX design review  
/polish          # Pre-ship refinement
/typeset         # Fix typography
/arrange         # Fix layout & spacing
```

**Anti-patterns it teaches AI to avoid:**
- Overused fonts (Inter, Arial)
- Purple gradients
- Cards on colored backgrounds
- Gray text on colored backgrounds

### Claude SEO (216 Skills)

Comprehensive SEO optimization via [claude-seo](https://github.com/AgriciDaniel/claude-seo):

```bash
/seo audit <url>         # Full website audit
/seo technical <url>     # Technical SEO (8 categories)
/seo content <url>       # E-E-A-T analysis
/seo geo <url>           # AI search optimization
/seo schema <url>        # Schema markup
/seo sitemap <url>      # Sitemap analysis
/seo programmatic <url> # Programmatic SEO
/seo competitor-pages   # Comparison pages
/seo hreflang <url>     # Multi-language SEO
```

### Antigravity Skills (17 Curated)

Enterprise-grade skills from [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) (MIT License):

| Category | Skills |
|----------|--------|
| Languages | typescript-expert, python-patterns, react-patterns, go-patterns, rust-patterns |
| DevOps | docker-expert, aws-serverless, vercel-deployment |
| Security | vulnerability-scanner, api-security-best-practices |
| Business | copywriting, pricing-strategy, seo-fundamentals |
| AI/Data | rag-engineer, prompt-engineering |
| General | brainstorming, planning |

```bash
# Install Antigravity skills
node scripts/integrations/install-antigravity-skills.js --curated

# Install Claude SEO skills  
node scripts/integrations/install-claude-seo.js --full
```

### OpenViking - Context Database for AI Agents

[OpenViking](https://github.com/volcengine/OpenViking) provides hierarchical context management using a filesystem paradigm:

```bash
ov init              # Initialize workspace
ov status            # Check status
ov add-memory        # Add new memory
ov ls viking://      # List all context
```

**Key features:**
- Filesystem paradigm for memory organization
- Tiered context loading (L0/L1/L2) to save tokens
- Directory-aware search and retrieval
- Session memory persistence

## License Information

All bundled skills are properly licensed:

| Skill | License | File |
|-------|---------|------|
| Antigravity | MIT | LICENSE.antigravity |
| Claude SEO | MIT | LICENSE.claude-seo |
| Impeccable | Apache 2.0 | LICENSE.impeccable |
| OpenViking | Apache 2.0 | LICENSE.openviking |
```

## 🙏 Support & Star

If StringRay helps you build better software, please consider:

- ⭐ **Starring the repo** on [GitHub](https://github.com/htafolla/stringray)
- 📢 **Sharing** with your team
- 🐛 **Reporting issues** at [github.com/htafolla/stringray/issues](https://github.com/htafolla/stringray/issues)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with precision for enterprise-grade AI orchestration*
