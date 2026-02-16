# ⚡ StringRay AI

**Enterprise AI Orchestration Framework**

![Version](https://img.shields.io/badge/version-1.4.2-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Tests](https://img.shields.io/badge/tests-100%25%20passing-brightgreen?style=flat-square)

> **Limitless Intelligence. Zero Compromises. Enterprise Scale Since Day One.**

StringRay AI provides intelligent multi-agent coordination with 99.6% systematic error prevention. Eliminate spaghetti code, hallucinations, and code rot through systematic validation and intelligent agent delegation.

## 🚀 Quick Start

```bash
# Install
npm install strray-ai

# Run postinstall setup
npx strray-ai install

# Validate installation
npx strray-ai validate

# Check status
npx strray-ai status
```

## ✨ Features

- **🤖 14 Specialized Agents**: Intelligent task orchestration with automatic delegation
- **📏 99.6% Error Prevention**: Systematic validation through Universal Development Codex (59 terms)
- **⚡ 26 Lazy-Loading Skills**: On-demand MCP server activation (14 MCP servers)
- **🛡️ Enterprise Security**: Comprehensive validation and security scanning
- **📊 Real-time Monitoring**: Performance tracking and health monitoring
- **🔄 Complexity-Based Routing**: Tasks routed based on file count, dependencies, and risk level

### CLI Commands

```bash
npx strray-ai install     # Install and configure StringRay
npx strray-ai status       # Check framework configuration
npx strray-ai validate    # Validate installation
npx strray-ai capabilities # Show all available capabilities
npx strray-ai health      # Health check
```

## 🤖 Available Agents

| Agent | Role | Use Case |
|-------|------|----------|
| **@orchestrator** | Task coordination | Complex multi-step tasks |
| **@enforcer** | Code quality | Codex compliance validation |
| **@architect** | System design | Technical decisions |
| **@test-architect** | Testing strategy | Test planning & coverage |
| **@bug-triage-specialist** | Error investigation | Root cause analysis |
| **@code-reviewer** | Quality assessment | Standards validation |
| **@security-auditor** | Security analysis | Vulnerability detection |
| **@refactorer** | Code consolidation | Technical debt elimination |

### Agent Pipeline Flow

| Agent | Role | Threshold | Tools | Strategy |
|-------|------|-----------|-------|----------|
| **enforcer** | Compliance | All | read, grep, lsp_* | Block violations |
| **architect** | Design | High | read, grep, lsp_*, background_task | Expert priority |
| **orchestrator** | Coordination | Enterprise | read, grep, lsp_*, call_omo_agent | Consensus |
| **bug-triage-specialist** | Fixes | Debug | read, grep, ast_grep_* | Majority vote |
| **code-reviewer** | Quality | Changes | read, grep, lsp_diagnostics | Expert priority |
| **security-auditor** | Vulnerabilities | Security | read, grep, grep_app_searchGitHub | Block critical |
| **refactorer** | Debt | Refactor | read, grep, lsp_rename | Majority vote |
| **test-architect** | Testing | Tests | read, grep, lsp_* | Expert priority |
| **librarian** | Codebase exploration | Analysis | project-analysis_* | N/A (solo) |
| **ci-cd-auto-fix** | Autonomous pipeline healing | CI/CD | exec, fs, git | Auto-recovery |

**Routing Logic**: Tasks are routed based on complexity analysis (file count, change volume, dependencies, risk level). Score ≤25 = Single-agent; 96+ = Orchestrator-led multi-agent.

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ / Bun (recommended)
- OpenCode installed & running

### Setup

```bash
# Install package
npm install strray-ai

# Run postinstall setup (required)
npx strray-ai install

# Validate
npx strray-ai validate
```

### Usage

Once installed, StringRay agents are available via `@` commands:

```bash
# Intelligent task orchestration
@orchestrator implement user authentication system

# Code quality enforcement
@enforcer analyze this code for issues

# System design assistance
@architect design database schema for e-commerce

# Testing strategy
@test-architect create test plan for payment module
```

## 📚 Documentation

For comprehensive documentation including architecture details, API references, and troubleshooting guides, visit the [docs](./docs) directory.

### Key Documentation

- **[Plugin Deployment Guide](./docs/PLUGIN_DEPLOYMENT_GUIDE.md)** - Complete setup guide
- **[API Reference](./docs/api/API_REFERENCE.md)** - Developer API documentation
- **[Agent Documentation](./docs/agents/)** - Detailed agent specifications
- **[Architecture](./docs/ORCHESTRATOR_INTEGRATION_ARCHITECTURE.md)** - Framework design

## ⚙️ Configuration

Create `.opencode/strray/features.json` in your project root:

```json
{
  "version": "1.4.2",
  "description": "StringRay Framework Configuration",

  "token_optimization": {
    "enabled": true,
    "max_context_tokens": 50000,
    "prune_after_task": true,
    "summarize_tool_outputs": true,
    "context_compression": {
      "enabled": true,
      "threshold_tokens": 40000,
      "compression_ratio": 0.5
    }
  },

  "model_routing": {
    "enabled": true,
    "default_model": "claude-sonnet-4",
    "fallback_model": "claude-haiku-4"
  },

  "multi_agent_orchestration": {
    "enabled": true,
    "max_concurrent_agents": 3,
    "coordination_model": "async-multi-agent",
    "task_distribution_strategy": "capability-based",
    "conflict_resolution": "expert-priority",
    "progress_tracking": true,
    "session_persistence": true
  },

  "agent_management": {
    "disabled_agents": [],
    "performance_limits": {
      "max_task_duration_ms": 30000,
      "max_memory_usage_mb": 512,
      "max_tokens_per_request": 16000
    }
  },

  "activity_logging": {
    "enabled": true,
    "level": "info",
    "include_performance_metrics": true,
    "include_agent_states": true,
    "include_token_usage": true,
    "retention_days": 7,
    "log_to_file": true,
    "log_path": ".opencode/logs"
  },

  "security": {
    "enabled": true,
    "prompt_sanitization": true,
    "vulnerability_scanning": true,
    "code_review_enforcement": true,
    "security_score_threshold": 70
  },

  "performance_monitoring": {
    "enabled": true,
    "real_time_metrics": true,
    "benchmark_tracking": true,
    "token_tracking": true,
    "cost_tracking": true,
    "alerting": {
      "enabled": true,
      "performance_degradation_threshold": 20,
      "error_rate_threshold": 5,
      "cost_threshold_daily": 10.0
    }
  },

  "caching": {
    "enabled": true,
    "file_content_cache": true,
    "search_result_cache": true,
    "cache_ttl_seconds": 300,
    "max_cache_size_mb": 50
  }
}
```

### Configuration Parameters

#### Core Settings

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | string | "1.1.1" | Configuration version |
| `description` | string | - | Configuration description |

#### Token Optimization

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `token_optimization.enabled` | boolean | true | Enable token optimization |
| `token_optimization.max_context_tokens` | number | 50000 | Maximum context window size |
| `token_optimization.prune_after_task` | boolean | true | Auto-prune context after tasks |
| `token_optimization.summarize_tool_outputs` | boolean | true | Summarize long tool outputs |
| `token_optimization.context_compression.enabled` | boolean | true | Enable context compression |
| `token_optimization.context_compression.threshold_tokens` | number | 40000 | Compression trigger threshold |
| `token_optimization.context_compression.compression_ratio` | number | 0.5 | Compression ratio (0-1) |

#### Model Routing

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model_routing.enabled` | boolean | true | Enable intelligent model routing |
| `model_routing.default_model` | string | "claude-sonnet-4" | Default model for general tasks |
| `model_routing.fallback_model` | string | "claude-haiku-4" | Fallback model for errors |

#### Multi-Agent Orchestration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `multi_agent_orchestration.enabled` | boolean | true | Enable multi-agent coordination |
| `multi_agent_orchestration.max_concurrent_agents` | number | 3 | Maximum simultaneous agents |
| `multi_agent_orchestration.coordination_model` | string | "async-multi-agent" | Coordination strategy |
| `multi_agent_orchestration.task_distribution_strategy` | string | "capability-based" | How tasks are distributed |
| `multi_agent_orchestration.conflict_resolution` | string | "expert-priority" | Conflict resolution method |
| `multi_agent_orchestration.progress_tracking` | boolean | true | Track agent progress |
| `multi_agent_orchestration.session_persistence` | boolean | true | Persist sessions across restarts |

#### Agent Management

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_management.disabled_agents` | array | [] | List of disabled agent names |
| `agent_management.performance_limits.max_task_duration_ms` | number | 30000 | Max task execution time |
| `agent_management.performance_limits.max_memory_usage_mb` | number | 512 | Max memory per agent |
| `agent_management.performance_limits.max_tokens_per_request` | number | 16000 | Max tokens per request |

#### Activity Logging

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `activity_logging.enabled` | boolean | true | Enable activity logging |
| `activity_logging.level` | string | "info" | Log level (debug/info/warn/error) |
| `activity_logging.include_performance_metrics` | boolean | true | Log performance data |
| `activity_logging.include_agent_states` | boolean | true | Log agent state changes |
| `activity_logging.include_token_usage` | boolean | true | Log token consumption |
| `activity_logging.retention_days` | number | 7 | Days to keep logs |
| `activity_logging.log_to_file` | boolean | true | Write logs to file |
| `activity_logging.log_path` | string | ".opencode/logs" | Log file directory |

#### Security

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `security.enabled` | boolean | true | Enable security features |
| `security.prompt_sanitization` | boolean | true | Sanitize prompts for safety |
| `security.vulnerability_scanning` | boolean | true | Scan code for vulnerabilities |
| `security.code_review_enforcement` | boolean | true | Enforce code review |
| `security.security_score_threshold` | number | 70 | Minimum security score (0-100) |

#### Performance Monitoring

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `performance_monitoring.enabled` | boolean | true | Enable performance monitoring |
| `performance_monitoring.real_time_metrics` | boolean | true | Collect real-time metrics |
| `performance_monitoring.benchmark_tracking` | boolean | true | Track performance benchmarks |
| `performance_monitoring.token_tracking` | boolean | true | Track token usage |
| `performance_monitoring.cost_tracking` | boolean | true | Track API costs |
| `performance_monitoring.alerting.enabled` | boolean | true | Enable performance alerts |
| `performance_monitoring.alerting.performance_degradation_threshold` | number | 20 | Alert on >20% slowdown |
| `performance_monitoring.alerting.error_rate_threshold` | number | 5 | Alert on >5% error rate |
| `performance_monitoring.alerting.cost_threshold_daily` | number | 10.0 | Daily cost alert threshold ($) |

#### Caching

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `caching.enabled` | boolean | true | Enable caching |
| `caching.file_content_cache` | boolean | true | Cache file contents |
| `caching.search_result_cache` | boolean | true | Cache search results |
| `caching.cache_ttl_seconds` | number | 300 | Cache time-to-live (seconds) |
| `caching.max_cache_size_mb` | number | 50 | Maximum cache size (MB) |

### Environment Variables

```bash
# Logging & Debugging
export STRRAY_LOGGING_ENABLED=false        # Disable all logging
export STRRAY_LOG_LEVEL=debug              # Log level: debug/info/warn/error
export STRRAY_PERFORMANCE_MODE=true        # Enable performance mode logging
export STRRAY_DEBUG_LOGGING=true           # Debug logging for components

# Path Overrides (Advanced)
export STRRAY_AGENTS_PATH="../custom/agents"
export STRRAY_MCP_PATH="../custom/mcp"
export STRRAY_STATE_PATH="../custom/state"

# Enterprise & Clustering
export STRRAY_INSTANCE_ID="production-1"   # Instance identification
export STRRAY_CLUSTER_NAME="prod-cluster"  # Cluster name
export STRRAY_TEST_MODE=true               # Enable test mode
```

## 📊 Performance Metrics

- **Error Prevention**: 99.6% systematic validation
- **Test Pass Rate**: 100% (989/989 tests)
- **Resource Reduction**: 90%+ with lazy-loading architecture
- **Response Time**: Sub-millisecond task delegation

## 👤 Creator

**StringRay AI** was created by **[@blaze0x1](https://x.com/blaze0x1)**

## 💬 Support

- **Telegram**: [StringRay AI Support](https://t.me/StringRayAI)
- **GitHub Issues**: [Report bugs or request features](https://github.com/htafolla/stringray/issues)
- **Documentation**: [Full docs](./docs)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⚡ StringRay: Enterprise AI orchestration for systematic error prevention ⚡**

_Built on the Universal Development Codex with Skills-Based Lazy Loading Architecture_
