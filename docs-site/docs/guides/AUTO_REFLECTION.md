---
title: Auto-Reflection System
description: Automatic reflection generation and management
---

# Auto-Reflection System

The auto-reflection system automatically generates reflection stubs and manages the reflection lifecycle.

## Overview

The system monitors for significant events and automatically generates reflection stubs:

- **CI Failures** - Creates reflection when CI pipeline fails
- **Commit Threshold** - Triggers after configurable number of commits without reflection
- **Time Threshold** - Triggers after configurable days without reflection
- **Manual Trigger** - Can be invoked manually

## Configuration

### features.json Settings

```json
{
  "auto_reflection": {
    "mode": "full",
    "triggers": {
      "ci_failure": { "enabled": true, "auto_generate_stub": true },
      "commit_threshold": { "enabled": true, "threshold": 15 },
      "time_threshold": { "enabled": true, "days": 7 }
    },
    "thresholds": {
      "full": { "commit_threshold": 10, "days_threshold": 5 },
      "minimal": { "commit_threshold": 25, "days_threshold": 14 },
      "off": { "commit_threshold": 999, "days_threshold": 365 }
    }
  }
}
```

### Mode Options

| Mode | Commits | Days | Behavior |
|------|---------|------|----------|
| `full` | 10 | 5 | Auto-generate + prompt |
| `minimal` | 25 | 14 | Auto-generate + prompt |
| `off` | 999 | 365 | Disabled |

## Components

### Auto-Reflection Generator CLI

```bash
# Manual trigger
node scripts/node/auto-reflection-generator.mjs --trigger manual --title "Topic"

# Force generation
node scripts/node/auto-reflection-generator.mjs --trigger commit-threshold --force

# CI failure trigger
node scripts/node/auto-reflection-generator.mjs --trigger ci-failure

# Deployment trigger
node scripts/node/auto-reflection-generator.mjs --trigger deployment --version 1.18.0
```

### Post-Commit Hook Integration

The `hooks/post-commit` script checks for reflection needs:

```bash
# Automatically checks after each commit
# Triggers when:
# - More than threshold commits since last reflection
# - More than threshold days since last reflection
```

### CI Integration

**`.github/workflows/auto-reflection.yml`**
- Runs on CI failure
- Periodic check every 6 hours
- Auto-generates reflection stubs

**`.github/workflows/ci.yml`**
- Added auto-reflection on failure

### Reflection Validator

```bash
# Validate a reflection
./scripts/node/reflection-validate.sh docs/reflections/my-reflection.md
```

Validates:
- Executive Summary
- Dichotomy (What Was/Is/Should Be)
- INNER DIALOGUE
- Counterfactual Thinking
- Personal Journey
- Master's Wisdom
- Code Examples
- ASCII Diagrams
- Files Modified Table
- Test Evidence
- What Still Doesn't Work
- For Future AI

### Reflection Processor

```bash
# Process all reflections
node scripts/node/reflection-processor.cjs
```

Extracts:
- Patterns mentioned
- Code snippets
- Lessons learned
- Generates pattern suggestions for kernel

## Reflection Template v3.0

Use the unified template combining personal growth + technical:

```
docs/reflections/TEMPLATE_v3.md
```

### Parts

**Part A: Personal Growth**
1. Executive Summary
2. The Dichotomy (What Was/Is/Should Be)
   - INNER DIALOGUE
3. Counterfactual Thinking
4. Personal Journey
5. Master's Wisdom

**Part B: Technical**
6. What Changed with Code
7. Architecture Impact (ASCII)
8. Key Files Modified (table)
9. Test Evidence
10. What Still Doesn't Work
11. For Future AI

## Workflow

1. **Trigger** - Event causes reflection need detection
2. **Generate** - Auto-reflection generator creates stub
3. **Fill In** - User completes the reflection
4. **Validate** - Run validator script
5. **Commit** - Add to repository
6. **Process** - Run reflection processor to extract patterns

## Related Documentation

- [Features Configuration](./FEATURES_CONFIG.md)
- [Reflection System](../reflections/)
- [Template v3.0](../../reflections/TEMPLATE_v3.md)