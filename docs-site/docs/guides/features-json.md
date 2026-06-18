# features.json Reference

0xRay behavior is controlled by `.xray/features.json` (consumer) or `xray/features.json` (framework repo). Postinstall deploys a copy from the package; schema validation applies to `memory_routing` via `features.schema.json`.

## File locations

| Context | Path |
|---------|------|
| Consumer project | `.xray/features.json` |
| Framework repo | `xray/features.json` |
| Schema | `xray/features.schema.json` |

## memory_routing (v3.3+)

```json
{
  "$schema": "./features.schema.json",
  "memory_routing": {
    "enabled": true,
    "provider": "repertoire",
    "module_path": "../repertoire/dist/provider/memory-routing-provider.js",
    "config": {
      "dataDir": "../repertoire/data",
      "signalsPath": "../repertoire/data/curated_signals.json",
      "statePath": "../repertoire/data/inference-state.json",
      "logDir": "../repertoire/logs/groover-inference"
    }
  }
}
```

| `provider` | Behavior |
|------------|----------|
| `"null"` | NullMemoryRoutingProvider — no enrichment |
| `"repertoire"` | Load Repertoire via `module_path` |
| `"custom"` | Load any module exporting `createMemoryRoutingProvider()` |

When `enabled: true` and provider is `repertoire` or `custom`, `module_path` is **required**.

See [Repertoire Integration](./repertoire.md).

## inference_governance

External Dynamo governance endpoint. See [Self-Hosting Dynamo](./self-hosting-dynamo.md).

```json
"inference_governance": {
  "enabled": true,
  "endpoint_url": "https://your-governance-endpoint/governance",
  "request_timeout_ms": 10000,
  "min_confidence_threshold": 0.5,
  "proposal_defaults": {
    "source": "agent",
    "onChain": false
  }
}
```

Framework repo (`0xray` package) uses `source: 'system'`, `onChain: true` automatically.

## delegation

```json
"delegation": {
  "confidence_threshold": 0.5,
  "enable_intelligent_routing": true
}
```

Works with memory routing confidence signals and thinDispatch tiers.

## complexity_thresholds

```json
"complexity_thresholds": {
  "simple": 15,
  "moderate": 25,
  "complex": 50,
  "enterprise": 100
}
```

Maps to thinDispatch routing: single agent → tools → multi-agent → orchestrator-led.

## multi_agent_orchestration

```json
"multi_agent_orchestration": {
  "enabled": true,
  "max_concurrent_agents": 3,
  "task_distribution_strategy": "capability-based",
  "conflict_resolution": "expert-priority"
}
```

## token_optimization

```json
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
```

## pattern_learning

```json
"pattern_learning": {
  "enabled": true,
  "learning_interval_ms": 300000,
  "auto_apply_threshold": 0.9,
  "min_success_rate": 0.7
}
```

## security

```json
"security": {
  "enabled": true,
  "prompt_sanitization": true,
  "vulnerability_scanning": true,
  "code_review_enforcement": true,
  "security_score_threshold": 70
}
```

## agent_spawn

```json
"agent_spawn": {
  "max_concurrent": 8,
  "max_per_type": 3,
  "spawn_cooldown_ms": 500,
  "rate_limit_per_minute": 20
}
```

## activity_logging

```json
"activity_logging": {
  "enabled": true,
  "level": "info",
  "log_to_file": true,
  "log_path": ".opencode/logs"
}
```

Production paths also write to `logs/framework/activity.log` via `frameworkLogger`.

## Validation

`memory_routing` is validated at load by `src/memory-routing/validate-config.ts` against `features.schema.json`. Misconfiguration throws at boot rather than silently disabling.

## Related

- [Repertoire Integration](./repertoire.md)
- [Features Since 3.1](./features-since-3.1.md)
- [Full Reference](../full-reference.md)