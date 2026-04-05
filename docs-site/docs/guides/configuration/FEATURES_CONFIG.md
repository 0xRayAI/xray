---
title: Features Configuration
description: Complete guide to StringRay features.json configuration
---

# Features Configuration

StringRay uses `features.json` to control all framework behavior. This document covers all configuration options.

## Location

- **Development**: `.opencode/strray/features.json`
- **Consumer**: Loaded from npm package (frozen at v1.7.5)

## Configuration Sections

### Auto Reflection

Controls automatic reflection generation.

```json
{
  "auto_reflection": {
    "mode": "full",
    "triggers": {
      "ci_failure": { "enabled": true, "auto_generate_stub": true },
      "commit_threshold": { "enabled": true, "threshold": 15 },
      "time_threshold": { "enabled": true, "days": 7 },
      "test_failure": { "enabled": true, "auto_generate_stub": true },
      "deployment": { "enabled": true, "auto_generate_stub": true }
    },
    "thresholds": {
      "full": { "commit_threshold": 10, "days_threshold": 5 },
      "minimal": { "commit_threshold": 25, "days_threshold": 14 },
      "off": { "commit_threshold": 999, "days_threshold": 365 }
    }
  }
}
```

| Mode | Trigger After | Behavior |
|------|---------------|----------|
| `full` | 10 commits or 5 days | Auto-generates stub + prompts |
| `minimal` | 25 commits or 14 days | Auto-generates stub + prompts |
| `off` | Never | Disabled |

### Inference

Controls inference system behavior.

```json
{
  "inference": {
    "enabled": true,
    "workflow_dir": ".strray/inference",
    "reports_dir": ".strray/reports",
    "pattern_matching": {
      "enabled": true,
      "confidence_threshold": 0.7
    }
  }
}
```

### Processors

Controls processor pipeline order.

```json
{
  "processors": {
    "enabled": true,
    "pre_processors": {
      "enabled": true,
      "priority_order": ["preValidate", "codexCompliance"]
    },
    "post_processors": {
      "enabled": true,
      "priority_order": ["storytellingTrigger", "testExecution", "regressionTesting"]
    }
  }
}
```

### Kernel

Controls kernel and pattern learning.

```json
{
  "kernel": {
    "enabled": true,
    "pattern_learning": {
      "enabled": true,
      "learning_interval_ms": 300000,
      "auto_apply_threshold": 0.9,
      "min_success_rate": 0.7
    },
    "confidence": {
      "default_threshold": 0.5,
      "routing_adjustment": 0.1
    }
  }
}
```

### Enforcement

Controls rule enforcement.

```json
{
  "enforcement": {
    "enabled": true,
    "auto_fix": {
      "enabled": true,
      "require_approval": false
    },
    "codex_validation": {
      "enabled": true,
      "strict_mode": false
    }
  }
}
```

### Commit Cycle

Controls auto-commit behavior.

```json
{
  "commit_cycle": {
    "auto_commit": {
      "enabled": false,
      "min_changes_to_commit": 3,
      "force_commit_after_minutes": 10
    },
    "require_reflection": {
      "enabled": true,
      "max_commits_since_reflection": 15
    }
  }
}
```

### Storytelling

Controls reflection/story generation triggers.

```json
{
  "storytelling": {
    "enabled": true,
    "reflection_triggers": {
      "commit_count": { "enabled": true, "threshold": 10 },
      "publish": { "enabled": true, "require_saga": true },
      "complex_changes": { "enabled": true, "file_count_threshold": 15 },
      "session_duration": { "enabled": true, "duration_minutes_threshold": 60 }
    }
  }
}
```

## Other Configuration Sections

### Token Optimization

```json
{
  "token_optimization": {
    "enabled": true,
    "max_context_tokens": 20000,
    "prune_after_task": true,
    "context_compression": {
      "enabled": true,
      "threshold_tokens": 15000,
      "compression_ratio": 0.4
    }
  }
}
```

### Agent Spawn

```json
{
  "agent_spawn": {
    "max_concurrent": 8,
    "max_per_type": 3,
    "spawn_cooldown_ms": 500,
    "rate_limit_per_minute": 20
  }
}
```

### Performance Monitoring

```json
{
  "performance_monitoring": {
    "enabled": true,
    "alerting": {
      "enabled": true,
      "performance_degradation_threshold": 20,
      "error_rate_threshold": 5,
      "cost_threshold_daily": 10
    }
  }
}
```

## CLI Commands for Configuration

```bash
# View current features
cat .opencode/strray/features.json

# Get specific config
npx strray-ai config get --feature auto_reflection.mode

# Set config value
npx strray-ai config set --feature auto_reflection.mode --value minimal
```

## Auto-Reflection System

The auto-reflection system automatically generates reflection stubs when:

1. **CI Failure** - GitHub Actions workflow fails
2. **Commit Threshold** - More than threshold commits without reflection
3. **Time Threshold** - More than threshold days since last reflection
4. **Test Failure** - Significant test failures
5. **Deployment** - New version deployed

### Usage

```bash
# Generate reflection manually
node scripts/node/auto-reflection-generator.mjs --trigger manual --title "My Topic"

# Force generation even if not needed
node scripts/node/auto-reflection-generator.mjs --trigger commit-threshold --force

# Validate reflection
./scripts/node/reflection-validate.sh docs/reflections/my-reflection.md
```

## Related Documentation

- [Reflection System](../reflections/)
- [Pipeline Architecture](../architecture/pipelines/)
- [Agent Configuration](../agents/AGENT_CONFIG.md)