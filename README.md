# ⚡ StringRay AI

**Enterprise AI Orchestration Framework for OpenCode/Claude Code**

[![Version](https://img.shields.io/badge/version-1.12.0-blue?style=flat-square)](https://npmjs.com/package/strray-ai)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-2368%20passed-brightgreen?style=flat-square)](src/__tests__)
[![GitHub stars](https://img.shields.io/github/stars/htafolla/stringray?style=social)](https://github.com/htafolla/stringray)

> **Intelligent Multi-Agent Coordination with 99.6% Systematic Error Prevention**

StringRay extends OpenCode/Claude Code with intelligent multi-agent orchestration, Codex compliance validation, and enterprise-grade security. It automatically routes tasks to specialized agents based on complexity and provides systematic error prevention.

## What is StringRay?

StringRay is a **framework layer** for OpenCode that adds:

- **Multi-Agent Orchestration** - Automatically coordinates 27 specialized agents
- **Codex Compliance** - 60-term Universal Development Codex prevents errors
- **Complexity-Based Routing** - Simple tasks get quick responses, complex ones get full team coordination
- **Enterprise Security** - Webhooks, validation, and audit trails
- **Skills Integration** - SEO, DevOps, Security, and more

### Who is it for?

- **Developers** using OpenCode or Claude Code who want AI-assisted development
- **Teams** needing consistent code quality and error prevention
- **Enterprises** requiring security, compliance, and audit capabilities

## 🚀 Quick Start

```bash
# 1. Install StringRay
npm install strray-ai

# 2. Run setup (required - configures OpenCode)
npx strray-ai install

# 3. Verify installation
npx strray-ai status
```

**What does `strray-ai install` do?**
- Copies OpenCode configuration files to your project
- Configures 27 agents with proper capabilities
- Sets up Codex enforcement rules
- Enables webhook triggers for CI/CD integration
- Ready to use with Claude Code immediately

## ✨ Features

- **🤖 27 Specialized Agents** - From code review to mobile development
- **📏 99.6% Error Prevention** - Universal Development Codex (60 terms)
- **⚡ 29 Lazy-Loading Skills** - Plus Claude SEO & Antigravity integrations
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

[View all 27 agents →](https://github.com/htafolla/stringray/blob/main/AGENTS.md)

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

## 🔧 CLI Commands

```bash
npx strray-ai install      # Install and configure
npx strray-ai status       # Check configuration
npx strray-ai validate     # Validate installation
npx strray-ai capabilities # Show all features
npx strray-ai health       # Health check
```

## ⚙️ Configuration

### Default Configuration

StringRay works out of the box with sensible defaults. The `strray-ai install` command sets up:

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
│   └── session/               # Session management
├── .opencode/                 # OpenCode configuration
│   ├── agents/               # Agent configs (27 agents)
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

### Claude SEO (29 Skills)

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

Enterprise-grade skills from [antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills):

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

## 🙏 Support & Star

If StringRay helps you build better software, please consider:

- ⭐ **Starring the repo** on [GitHub](https://github.com/htafolla/stringray)
- 📢 **Sharing** with your team
- 🐛 **Reporting issues** at [github.com/htafolla/stringray/issues](https://github.com/htafolla/stringray/issues)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with precision for enterprise-grade AI orchestration*
