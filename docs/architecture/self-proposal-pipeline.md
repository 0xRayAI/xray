# Self-Proposal Pipeline

**Status:** Draft — Phase 0 candidate

**Context:** The xray inference cycle (`src/inference/inference-cycle.ts`) already reads session files from `docs/inference/`, generates `InferenceProposal`s, submits them to the 3-agent + Dynamo governance pipeline, and applies approved changes. However, the system cannot yet propose its own evolution based on live operational signals from `activity.log` — it can only act on accumulated session artifacts. This limits the feedback loop to post-hoc analysis rather than real-time self-modification.

**Decision:** Build a dedicated self-proposal pipeline that reads `activity.log` entries in (near) real-time, feeds them through the existing semantic pattern analyzer, generates `GovernanceProposal`s with `metamorphosis: true`, submits them through the full governance gate, and applies approved changes via the deploy-verifier. The pipeline is a concrete implementation of the `MetamorphosisEngine` interface.

**Consequences:**
- Positive: The system can autonomously tune its own configuration, register new processors, adjust timeouts, and codify patterns without human intervention.
- Positive: Reuses the existing governance machinery (3 MCP skill servers, Dynamo Solar SSOT, governance-core.ts PHI/TAU matrix).
- Negative: Self-modification introduces safety surface area — requires circuit breaker, rate limits, and rollback capability.
- Negative: The feedback loop from log entry to applied change must be bounded (target < 60s for simple proposals).

---

## 1. Reader — activity.log Consumption

### Log Format

Entries are written by two loggers to `logs/framework/activity.log`:

**FrameworkUsageLogger** (`src/core/framework-logger.ts:237-357`) writes:
```
2026-06-09T10:30:00.123Z [job-abc123] [trace-xyz.span-def] [component] action - STATUS | {"details":{}}
```

**ActivityLogger** (`src/core/activity-logger.ts:258-271`) writes:
```
2026-06-09T10:30:00.123Z [job-abc123] [category] action - LEVEL | {"details":{}}
```

The `ActivityRecord` interface (line 42-52) provides structured fields: `timestamp`, `id`, `category`, `level`, `action`, `message`, `details`, `sessionId`, `jobId`.

### Consumption Strategy: Hybrid Streaming + Batch

**Recommendation:** Use a hybrid approach — streaming for high-signal events (governance outcomes, processor failures), batch polling for aggregate analytics (error frequency trends, performance degradation).

| Mode | Mechanism | Latency | Use Case |
|------|-----------|---------|----------|
| Streaming | `fs.watch` / `fs.watchFile` on `activity.log` | ~100ms | Governance votes, processor crashes, config changes |
| Batch | Cron-like interval (every 60s) reads tail + parses new lines | 60s | Error frequency, success rates, performance metrics |

**Implementation sketch (`src/self-proposal/reader.ts`):**

```typescript
import * as fs from "fs";
import * as readline from "readline";
import { EventEmitter } from "events";

export interface LogEntry {
  timestamp: Date;
  raw: string;
  parsed: {
    component?: string;
    category?: string;
    action: string;
    status?: string;
    level?: string;
  } | null;
}

export class ActivityLogReader extends EventEmitter {
  private logPath: string;
  private watchedBytes = 0;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(logPath: string = "logs/framework/activity.log") {
    super();
    this.logPath = logPath;
  }

  startStreaming(): void {
    this.watchedBytes = fs.statSync(this.logPath).size;
    fs.watch(this.logPath, (event) => {
      if (event === "change") this.readNewLines();
    });
  }

  startBatchPolling(intervalMs: number = 60000): void {
    this.pollTimer = setInterval(() => this.readNewLines(), intervalMs);
  }

  private readNewLines(): void { /* read from watchedBytes to EOF, parse, emit "entry" */ }
}
```

### Lines Parsed

A lightweight parser (`src/self-proposal/line-parser.ts`) extracts structured data from each line:

```
/^(\S+T\S+)\s+(\[[^\]]+\]\s+)?\[([^\]]+)\]\s+(\S+)\s+-\s+(\S+)(?:\s+\|\s+(.+))?$/
```

| Group | Field | Example |
|-------|-------|---------|
| 1 | `timestamp` | `2026-06-09T10:30:00.123Z` |
| 3 | `componentOrCategory` | `inference-cycle` or `processor` |
| 4 | `action` | `govern-proposals-error` |
| 5 | `statusOrLevel` | `ERROR` or `success` |
| 6 | `details` (optional) | `{"error":"timeout"}` |

### Event Taxonomy for Self-Proposal

Not every log entry triggers a proposal. The reader classifies entries into signal buckets:

| Event | Log Pattern | Proposal Trigger |
|-------|-------------|-----------------|
| Governance rejection | `governance-service.*govern-start.*reject` | If 3 consecutive rejections on same pattern |
| Processor crash | `processor.*error.*crash` | Register recovery processor |
| Performance degradation | `job-context.*duration.*>threshold` | Adjust timeout or complexity scoring |
| Config error | `config.*error.*invalid` | Fix config value |
| Codex violation | `codex-compliance.*violation.*detected` | Register new Codex term |

---

## 2. Analyzer — Semantic Pattern Mapping

### Architecture

The Analyzer sits between the Reader and the Generator. It consumes raw `LogEntry` streams and produces `Signal` objects — structured observations that can seed proposals.

```
  LogEntry[]
     ↓
 [Sliding Window] — keeps last N entries (configurable, default 5000)
     ↓
 [Frequency Counter] — counts error rates per component/action per time bucket
     ↓
 [Trend Detector] — detects monotonic increases in error rates, duration creep
     ↓
 [Pattern Matcher] — maps composite signals to known patterns
     ↓
  Signal[]
```

### Integration with `semantic-patterns.ts`

The existing `src/inference/semantic-patterns.ts` analyzes git diffs for structural patterns (Extract Method, Registry Pattern, etc.). The self-proposal analyzer extends this with **operational patterns** derived from log signals:

```typescript
// src/self-proposal/analyzer.ts

export interface OperationalSignal {
  type: "error_frequency" | "governance_outcome" | "processor_health" | "performance" | "config_inconsistency";
  severity: "low" | "medium" | "high" | "critical";
  component: string;
  metric: number;         // normalized 0-1
  trend: "rising" | "falling" | "stable";
  evidence: string[];     // relevant log lines
  firstSeen: Date;
  lastSeen: Date;
  occurrenceCount: number;
}
```

The analyzer reuses `StructuralPattern` from `semantic-patterns.ts` (line 3-8) for the confidence/evidence/description shape, but the detection logic is log-based rather than git-diff-based.

### Concrete Detection Rules

| Signal | Detection Logic | Threshold |
|--------|----------------|-----------|
| Error frequency | Count `error` level entries per component in 5min window | > 3 std deviations from baseline |
| Governance outcome | Track `finalDecision: 'reject'` ratio per proposal type | > 60% rejection in 10 proposals |
| Processor health | Count `processor.*error` / total processor entries | > 20% failure rate |
| Performance | Extract `duration` from `job-completed` entries, compute rolling average | > 2x baseline |
| Config drift | Detect `config.*error.*invalid` or `config.*warn.*unexpected` | Any occurrence |

---

## 3. Generator — Signal to GovernanceProposal

### Proposal Format

The generator maps `OperationalSignal` → `GovernanceProposal` (from `src/governance/governance-types.ts:16-25`):

```typescript
export interface GovernanceProposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  evidence?: string[];
  source?: 'inference' | 'reflection' | 'manual' | 'ci' | 'phase-planning';
  confidence?: number;
  metadata?: Record<string, unknown>;
}
```

Key addition for self-proposals: `metadata.metamorphosis = true` and `metadata.metamorphosisResonance` — a score (0-1) computed by the Analyzer that represents how strongly the signal justifies self-modification.

### Signal-to-Proposal Mapping

| OperationalSignal | GovernanceProposal |
|---|---|
| `error_frequency` in processor X | `{ type: "fix", title: "Add processor type Y for error Z" }` |
| `governance_outcome` (repeated rejection of timeout-related proposals) | `{ type: "codify", title: "Modify timeout from 30s to 60s" }` |
| `processor_health` (crash loop) | `{ type: "fix", title: "Register circuit breaker for processor X" }` |
| `performance` (duration creep) | `{ type: "refactor", title: "Optimize processor X query path" }` |
| `config_inconsistency` | `{ type: "fix", title: "Register new Codex term for pattern W" }` |

### Generator Implementation Sketch

```typescript
// src/self-proposal/generator.ts

export class SelfProposalGenerator {
  generate(signals: OperationalSignal[]): GovernanceProposal[] {
    return signals
      .filter(s => s.severity !== "low" || s.occurrenceCount >= 3)
      .map(s => this.signalToProposal(s))
      .filter((p): p is GovernanceProposal => p !== null);
  }

  private signalToProposal(signal: OperationalSignal): GovernanceProposal | null {
    // Map signal type + component to a concrete proposal
    // Reuse classifyProposalType logic from inference-cycle.ts:1208-1215
  }
}
```

### Proposal Examples

```
1. "Add processor type 'timeout-recovery' for error 'ETIMEDOUT' (23 occurrences in 5min)"
   → type: "fix", confidence: 0.82, metamorphosisResonance: 0.74

2. "Modify inference-cycle timeout from 30s to 60s — 3 consecutive governance rejections"
   → type: "codify", confidence: 0.91, metamorphosisResonance: 0.88

3. "Register Codex term 'circuit-breaker' — processor crash-loop pattern detected"
   → type: "codify", confidence: 0.76, metamorphosisResonance: 0.65

4. "Optimize governance-service vote parsing — 500ms+ duration on 50% of calls"
   → type: "refactor", confidence: 0.70, metamorphosisResonance: 0.61
```

---

## 4. Governance Gate — 3-Agent + Dynamo with metamorphosis

### Standard Governance Flow (Reused)

The self-proposal pipeline reuses the existing `GovernanceService.govern()` method (`src/governance/governance-service.ts:56-122`):

```
[Self-Proposal Generator]
    ↓
GovernanceService.govern()
    ├── 3 skill MCPs in parallel: code-review, security-audit, researcher
    │   (src/governance/governance-service.ts:135-139)
    ├── External Dynamo Solar SSOT
    │   (src/governance/governance-service.ts:142)
    └── Merge via governance-core.ts mergeVotes()
        (src/governance/governance-core.ts:159-200)
    ↓
GovernanceResponse { overallDecision, results }
```

### Metamorphosis Flag

Each self-proposal carries `metadata.metamorphosis = true`. The governance MCP servers (`code-review`, `security-audit`, `researcher`) check this flag and apply stricter scrutiny:

- **code-review**: Requires at least 2 of 3 approvals from internal votes
- **security-audit**: Requires `moralTension !== 'Critical'` — self-modification that triggers a Critical moral tension is automatically rejected
- **researcher**: Validates that the proposed change references an actual codebase location

### Metamorphosis Resonance Scoring

The Analyzer computes a `metamorphosisResonance` score (0-1) per signal:

```
metamorphosisResonance = w1 * severity + w2 * trend + w3 * occurrenceCount / maxOccurrences
  where w1 = 0.4, w2 = 0.3, w3 = 0.3
```

- `severity`: 0.25 (low), 0.5 (medium), 0.75 (high), 1.0 (critical)
- `trend`: 0.3 (falling), 0.6 (stable), 1.0 (rising)
- `occurrenceCount`: normalized against a max (default 100)

### Gate Decision

```
IF metamorphosisResonance >= 0.7 AND overallDecision === 'approve':
    → PROCEED to Apply phase
ELSE:
    → REJECT / DEFER (logged for future re-evaluation)
```

The resonance threshold is stored in `config/self-proposal.json` and is tunable.

---

## 5. Apply — Deploy-Verifier Execution

### Deploy-Verifier

The existing `DeployVerifier` (`src/inference/deploy-verifier.ts:33-114`) handles: `npm run build` → `npm pack` → `npm install` → `cli health` → e2e tests.

For self-proposals, we extend it with a `SelfChangeApplier` that operates *before* verification:

```
SelfProposal (approved)
    ↓
SelfChangeApplier.apply(proposal)
    ├── directFileEdit  (config files, .json, .ts)
    ├── configUpdate    (features.json, codex.json)
    └── processorRegistration (processor registry)
    ↓
DeployVerifier.quickVerify()  — build + test
    ↓
IF pass: mark proposal "applied"
IF fail: rollback changes, mark proposal "failed"
```

### Apply Strategies

**Direct file edit:** For simple value changes (timeout, threshold):
```typescript
async applyDirectEdit(target: string, newValue: unknown): Promise<void> {
  // Read file, apply change, write back
  // Only for whitelisted config paths:
  //   - config/self-proposal.json
  //   - features.json
  //   - .opencode/xray/codex.json
  //   - src/processors/*/config.ts
}
```

**Config update:** For feature flag or governance config changes, use the existing config loaders (`featuresConfigLoader` from `src/core/features-config.ts`).

**Processor registration:** For adding new processor types, write to the processor registry (referenced in `PostProcessor` at `src/postprocessor/PostProcessor.ts:219-222`):
```typescript
processorManager.registerProcessor({
  name: "timeout-recovery",
  type: "pre" as const,
  priority: 45,
  enabled: true,
});
```

### Deployment Verification

After applying changes, `DeployVerifier.quickVerify()` (`src/inference/deploy-verifier.ts:116-146`) runs:

1. Check `package.json` exists
2. `npm run build` (120s timeout)
3. `npm test` (120s timeout)
4. Return `DeployVerificationResult`

If verification fails, the `SelfChangeApplier` calls `rollback()` which reverts the applied changes using a diff-based undo buffer.

---

## 6. Safety Mechanisms

### Rollback Strategy

Each applied change stores an undo record in `.xray/self-proposal/rollback/`:

```json
{
  "proposalId": "self-prop-1712345678-0",
  "appliedAt": "2026-06-09T10:35:00.000Z",
  "changes": [
    {
      "file": "features.json",
      "originalContent": "base64-encoded-original",
      "operation": "edit"
    }
  ],
  "verificationResult": { "success": false, "checks": [...] }
}
```

Rollback is automatic on verification failure. Manual rollback via `npx 0xray self-proposal rollback <id>`.

### Max Change Rate

| Limit | Value | Enforced At |
|-------|-------|-------------|
| Self-proposals per hour | 1 | Generator |
| Self-proposals per day | 5 | Generator |
| Concurrent proposals in governance | 1 | Governance gate (queue) |
| Max files changed per proposal | 3 | Apply phase |

### Human Override

Two mechanisms:

1. **Soft override**: Set `config/self-proposal.json` → `"enabled": false` to disable all self-proposals. Existing proposals in flight complete but no new ones are generated.

2. **Hard override**: `XRAY_SELF_PROPOSAL_OVERRIDE=block` environment variable at process start. Prevents the SelfProposalEngine from initializing.

3. **Approval hold**: `"requireHumanApproval": true` in config causes approved proposals to be logged to `logs/framework/self-proposal-hold.json` instead of applied. A human must run `npx 0xray self-proposal approve <id>`.

### Circuit Breaker

Track consecutive governance failures for self-proposals:

| Consecutive Failures | Action |
|----------------------|--------|
| 3 | Halt self-proposals for 24h |
| 5 | Halt until manual override (`XRAY_SELF_PROPOSAL_OVERRIDE=resume`) |
| 10 | Auto-disable self-proposals permanently (write `"enabled": false` to config) |

Circuit breaker state stored in `.xray/self-proposal/circuit-breaker.json`:

```json
{
  "consecutiveFailures": 3,
  "lastFailureAt": "2026-06-09T10:30:00.000Z",
  "cooldownUntil": "2026-06-10T10:30:00.000Z",
  "tripped": true,
  "permanent": false
}
```

---

## 7. MetamorphosisEngine Integration

### Interface

`src/postprocessor/metamorphosis/MetamorphosisEngine.ts:20-29`:

```typescript
export interface MetamorphosisEngine {
  name: string;
  onPhase?(phase: string, context: unknown): Promise<void>;
  onProposal?(proposal: MetamorphosisProposal): Promise<void>;
}
```

The self-proposal pipeline implements this interface as `SelfProposalEngine`:

```typescript
// src/self-proposal/engine.ts

import { MetamorphosisEngine, MetamorphosisProposal } from "../postprocessor/metamorphosis/MetamorphosisEngine.js";
import { ActivityLogReader } from "./reader.js";
import { SignalAnalyzer } from "./analyzer.js";
import { SelfProposalGenerator } from "./generator.js";
import { getGovernanceService } from "../governance/governance-service.js";
import { SelfChangeApplier } from "./applier.js";
import { CircuitBreaker } from "./circuit-breaker.js";

export class SelfProposalEngine implements MetamorphosisEngine {
  name = "self-proposal-pipeline";

  constructor(
    private reader: ActivityLogReader,
    private analyzer: SignalAnalyzer,
    private generator: SelfProposalGenerator,
    private applier: SelfChangeApplier,
    private breaker: CircuitBreaker,
  ) {}

  async onPhase(phase: string, context: unknown): Promise<void> {
    if (phase === "post-processor-complete") {
      await this.runCycle();
    }
  }

  async onProposal(proposal: MetamorphosisProposal): Promise<void> {
    // Handle proposals from other engines
  }

  private async runCycle(): Promise<void> {
    if (this.breaker.isTripped()) return;

    const entries = this.reader.drainBuffer();
    const signals = await this.analyzer.analyze(entries);
    const proposals = this.generator.generate(signals);

    for (const proposal of proposals) {
      const governanceResponse = await getGovernanceService().govern({
        proposals: [proposal],
        options: { requireExternalDynamo: true },
      });

      const resonance = (proposal.metadata?.metamorphosisResonance as number) ?? 0;
      if (resonance >= 0.7 && governanceResponse.overallDecision === "approve") {
        const result = await this.applier.apply(proposal);
        if (!result.success) {
          await this.breaker.recordFailure();
        } else {
          await this.breaker.recordSuccess();
        }
      } else {
        await this.breaker.recordFailure();
      }
    }
  }
}
```

### Lifecycle Hooks

The `PostProcessor` (at `src/postprocessor/PostProcessor.ts`) accepts `MetamorphosisEngine[]` in its constructor (per the comment at `src/postprocessor/metamorphosis/MetamorphosisEngine.ts:7`). The `SelfProposalEngine` is registered during boot:

```typescript
// In boot-orchestrator or equivalent:
const selfProposalEngine = new SelfProposalEngine(reader, analyzer, generator, applier, breaker);
const postProcessor = new PostProcessor(stateManager, sessionMonitor, {
  metamorphosisEngines: [selfProposalEngine],
});
```

---

## 8. Phasing — Phase 0 vs Phase 2

### Phase 0 (Current cycle)

Parts that can ship immediately because they build on existing infrastructure:

| Component | Files | Rationale |
|-----------|-------|-----------|
| ActivityLogReader | `src/self-proposal/reader.ts` | Pure file I/O, no new dependencies |
| LineParser | `src/self-proposal/line-parser.ts` | Regex-based, stateless |
| SignalAnalyzer (basic) | `src/self-proposal/analyzer.ts` | Error frequency + governance outcome tracking only |
| SelfProposalGenerator | `src/self-proposal/generator.ts` | Maps signals to `GovernanceProposal`, reuses existing types |
| SelfProposalEngine skeleton | `src/self-proposal/engine.ts` | Implements `MetamorphosisEngine`, hooks into PostProcessor |
| CircuitBreaker | `src/self-proposal/circuit-breaker.ts` | File-based state, no external deps |
| Config | `config/self-proposal.json` | Static config file |

Phase 0 delivers: **Read → Analyze → Generate → Gate → (log only)**. The pipeline runs but does not apply changes — it writes approved proposals to a log file for manual review.

### Phase 2 (Post v2.1)

Parts requiring additional testing and safety validation:

| Component | Files | Rationale | Dependency |
|-----------|-------|-----------|------------|
| SelfChangeApplier | `src/self-proposal/applier.ts` | Modifies live files — requires rollback testing | Phase 0 pipeline |
| Direct file edit strategy | `src/self-proposal/strategies/file-edit.ts` | Whitelist verification, content validation | Applier |
| Processor registration | `src/self-proposal/strategies/processor-reg.ts` | Requires ProcessorManager API stability | Applier |
| Auto-apply mode | `engine.ts` flag | Removes the manual review gate | All Phase 2 components |
| Performance trend detector | `analyzer.ts` (advanced) | Requires baseline computation, time-series storage | Phase 0 analyzer |
| Human override CLI | `src/cli/self-proposal.ts` | `npx 0xray self-proposal` subcommands | Phase 0 pipeline |
| Self-proposal metrics dashboard | `src/reporting/self-proposal.ts` | Track acceptance rate, cycle time, etc. | Phase 2 applier |

Phase 2 delivers: **Apply → Verify → Monitor loop**. Full autonomous self-modification with rollback.

---

## Flow Diagram

```
                                      ┌──────────────────────────────┐
                                      │     activity.log (file)      │
                                      │  logs/framework/activity.log │
                                      └──────────┬───────────────────┘
                                                 │
                                                 ▼
                                      ┌──────────────────────────────┐
              ┌───────────────────────│      ActivityLogReader       │──── Streaming (fs.watch)
              │                       │  src/self-proposal/reader.ts │──── Batch poll (60s)
              │                       └──────────┬───────────────────┘
              │                                  │ LogEntry[]
              │                                  ▼
              │                       ┌──────────────────────────────┐
              │                       │      SignalAnalyzer         │
              │                       │  src/self-proposal/analyzer │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ Frequency Counter    │   │
              │                       │  │ Trend Detector       │   │
              │                       │  │ Pattern Matcher      │   │
              │                       │  └──────────────────────┘   │
              │                       └──────────┬───────────────────┘
              │                                  │ OperationalSignal[]
              │                                  ▼
              │                       ┌──────────────────────────────┐
              │                       │   SelfProposalGenerator      │
              │                       │  src/self-proposal/generator │
              │                       │                              │
              │                       │  Maps signals → Governance   │
              │                       │  Proposals with metadata {   │
              │                       │    metamorphosis: true,      │
              │                       │    metamorphosisResonance: N │
              │                       │  }                           │
              │                       └──────────┬───────────────────┘
              │                                  │ GovernanceProposal[]
              │                                  ▼
              │                       ┌──────────────────────────────┐
              │                       │     Governance Gate          │
              │                       │  GovernanceService.govern()  │
              │                       │  src/governance/             │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ code-review MCP      │   │
              │                       │  │ security-audit MCP   │──┐│
              │                       │  │ researcher MCP       │  ││
              │                       │  └──────────────────────┘  ││
              │                       │          +                 ││
              │                       │  ┌──────────────────────┐  ││
              │                       │  │ Dynamo Solar SSOT    │◄─┘│
              │                       │  │ (external filter)    │   │
              │                       │  └──────────────────────┘   │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ mergeVotes()         │   │
              │                       │  │ governance-core.ts   │   │
              │                       │  └──────────────────────┘   │
              │                       └──────────┬───────────────────┘
              │                                  │ GovernanceResponse
              │                                  │ (overallDecision +
              │                                  │  metamorphosisResonance)
              │                                  ▼
              │                       ┌──────────────────────────────┐
              │                       │  Resonance Gate              │
              │                       │  score >= 0.7 AND            │
              │                       │  overallDecision === approve │
              │                       │                              │
              │                       │  YES ──────────────────┐     │
              │                       │  NO  ───→ log + defer  │     │
              │                       └────────────────────────│─────┤
              │                                                  │   │
              │                                                  ▼   │
              │                       ┌──────────────────────────────┘
              │                       │
              │                       ▼
              │                       ┌──────────────────────────────┐
              │                       │     SelfChangeApplier       │
              │                       │  src/self-proposal/applier   │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ Direct File Edit     │   │
              │                       │  │ Config Update        │   │
              │                       │  │ Processor Register   │   │
              │                       │  └──────────────────────┘   │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ Undo buffer written  │   │
              │                       │  └──────────────────────┘   │
              │                       └──────────┬───────────────────┘
              │                                  │
              │                                  ▼
              │                       ┌──────────────────────────────┐
              │                       │   DeployVerifier             │
              │                       │  quickVerify()               │
              │                       │  src/inference/              │
              │                       │  deploy-verifier.ts          │
              │                       │                              │
              │                       │  ┌──────────────────────┐   │
              │                       │  │ npm run build        │   │
              │                       │  │ npm test             │   │
              │                       │  │ → success/fail       │   │
              │                       │  └──────────────────────┘   │
              │                       └──────────┬───────────────────┘
              │                                  │
              │                 ┌─────────────────┼──────────────────┐
              │                 │                 │                  │
              │                 ▼                 ▼                  ▼
              │       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
              │       │  PASS        │   │  FAIL        │   │  FAIL        │
              │       │  → applied   │   │  → rollback  │   │  → circuit   │
              │       └──────┬───────┘   └──────┬───────┘   │  breaker ++  │
              │              │                  │           └──────┬───────┘
              │              ▼                  ▼                  │
              │       ┌──────────────┐   ┌──────────────┐          │
              │       │ Log success  │   │ Log failure  │          │
              │       │ Reset circuit│   │ to activity  │          │
              │       │ breaker      │   │ .log         │          │
              │       └──────────────┘   └──────────────┘          │
              │                                                     │
              └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │   Monitor Loop       │
                        │ (back to Reader)     │
                        └──────────────────────┘
```

---

## File Map Summary

| File | Purpose | Phase |
|------|---------|-------|
| `src/self-proposal/reader.ts` | Reads `activity.log` via streaming + batch | 0 |
| `src/self-proposal/line-parser.ts` | Parses log lines into structured entries | 0 |
| `src/self-proposal/analyzer.ts` | Detects operational signals from entry streams | 0 |
| `src/self-proposal/generator.ts` | Maps signals to `GovernanceProposal[]` | 0 |
| `src/self-proposal/engine.ts` | `MetamorphosisEngine` implementation, orchestrates pipeline | 0 |
| `src/self-proposal/circuit-breaker.ts` | Tracks consecutive failures, enforces cooldown | 0 |
| `config/self-proposal.json` | Rate limits, thresholds, feature flags | 0 |
| `src/self-proposal/applier.ts` | Applies approved proposals to the filesystem | 2 |
| `src/self-proposal/strategies/file-edit.ts` | Direct config/file modification strategy | 2 |
| `src/self-proposal/strategies/config-update.ts` | Config update strategy | 2 |
| `src/self-proposal/strategies/processor-reg.ts` | Processor registration strategy | 2 |
| `src/cli/self-proposal.ts` | CLI commands for human override, status, rollback | 2 |
| `src/reporting/self-proposal.ts` | Metrics and telemetry for self-proposals | 2 |

---

## Configuration Reference (`config/self-proposal.json`)

```json
{
  "enabled": true,
  "requireHumanApproval": false,
  "reader": {
    "streaming": true,
    "batchIntervalMs": 60000,
    "maxBufferSize": 10000
  },
  "analyzer": {
    "errorFrequencyWindowMs": 300000,
    "errorFrequencyStdDevThreshold": 3,
    "governanceRejectionWindow": 10,
    "governanceRejectionThreshold": 0.6,
    "processorFailureThreshold": 0.2,
    "performanceMultiplierThreshold": 2.0
  },
  "generator": {
    "maxProposalsPerCycle": 3,
    "minConfidence": 0.6,
    "minResonance": 0.7
  },
  "rateLimit": {
    "maxPerHour": 1,
    "maxPerDay": 5,
    "maxConcurrentInGovernance": 1
  },
  "circuitBreaker": {
    "failuresToHalt": 3,
    "haltDurationHours": 24,
    "failuresToPermanent": 10
  },
  "applier": {
    "maxFilesPerProposal": 3,
    "whitelistedPaths": [
      "config/",
      "features.json",
      ".opencode/xray/codex.json",
      "src/processors/"
    ]
  }
}
```
