# Autonomy Command — Suit Default Operating Model

**v3.4.1+** · Codex terms **67–68** · Skill: `autonomy-command` · Slash: `/autonomy-command`

---

## What it is

The **autonomy command** is the default operating model when the 0xRay suit is worn. Users describe goals in plain language ("fix this", "continue P0.1", "ship it") — not framework keywords. The lead agent takes the helm, creates phased plans with todos, delegates to the best subagents, and loops until tests are green.

**Problem it solves:** keyword-gated skills, unused todo lists, buck-passing, skipped researcher/architect/code-reviewer on major work, and "not my job" syndrome.

---

## Kernel-level activation (P0.0c — automatic)

The autonomy command is not only a skill — it is **`autonomy_kernel` in `features.json`**, wired into the exoskeleton:

| Layer | Mechanism | What it does |
|-------|-----------|--------------|
| **SessionStart hook** | `dist/integrations/grok/hooks/session-start.js` | Boots lead-dev mode; injects 7 rules at session start |
| **PreToolUse hook** | `pre-tool-use.js` | Flags full `npm test` runs → per-suite triage hint |
| **Orchestrator MCP** | `autonomy-intake` tool | Returns phased plan + todos + subagent routes as JSON |
| **features.json** | `autonomy_kernel.enabled: true` | Kernel config SSOT (threshold, triage, consults) |
| **Skill** | `autonomy-command` | Human-readable playbook (synced on grok install) |

```json
"autonomy_kernel": {
  "enabled": true,
  "default_on": true,
  "complexity_phased_plan_threshold": 25,
  "per_suite_test_triage": true,
  "auto_consult_major_work": true
}
```

**First substantive task in every session:** `xray-orchestrator` → `autonomy-intake({ description: "..." })`

## When it activates

| Condition | Result |
|-----------|--------|
| `npm install 0xray` + `npx 0xray grok install` | Hooks + MCP + skills synced |
| Grok **SessionStart** | Autonomy kernel boot JSON on stdout |
| Substantive user task | Agent calls `autonomy-intake` → phased todos |
| Full test suite command | PreToolUse emits `per_suite_triage_required` hint |

Tier 1 consumers (repertoire, groover, chrono-warp-drive) may add `npm run confirm:suit` for layered boot checks.

---

## The seven rules

1. **Phased plan + todos** — Every multi-step effort gets phases with detailed todos. Assign the best subagent per item. Monitor output. Iterate until done.
2. **Take the helm** — Loop: implement → test → fix → repeat. Do not stop for permission or status theater.
3. **Per-suite test triage** — After major changes, run **individual test suites**, triage, fix, rerun. Full suite **only** when all affected suites pass.
4. **Delegate, don't abdicate** — Lead stays on the main thread, reactive to the user. Subagents execute. Lead monitors and updates todos.
5. **Read all output** — Console, stderr, test logs. Triage every failure. Rerun until clean.
6. **No buck-passing** — Never defer errors as "pre-existing." Add a todo and resolve.
7. **Resolve all errors** — Zero open failures at phase completion.

---

## Lead-dev loop

```text
INTAKE → CLASSIFY (analyze-complexity + trap check)
  → PLAN (complexity >25: strategist + architect-tools)
  → DISPATCH (orchestrate-task / Task subagent)
  → MONITOR (lead reads all output; TodoWrite)
  → TEST (per-suite triage → full suite gate)
  → DONE or loop
```

**Hard stops (human only):** secrets/OAuth, production deploy/cron, explicit user redirect.

---

## Subagent routing

| Task | Subagent | MCP |
|------|----------|-----|
| Strategic phasing | `strategist` | `orchestrate-task` |
| Major refactor / architecture | `architect-tools` | `context-analysis`, `architecture-assessment` |
| Research / prior art | `researcher` | `search_codebase`, `get_documentation` |
| Implementation | `backend-engineer` / `frontend-engineer` | `orchestrate-task` |
| Test failures | `bug-triage` | triage → fix → rerun |
| Pre-merge review | `code-review` | `check_best_practices` |
| Trap-classified work | `architect` + repertoire | `repertoire__get_task_confidence` (stdio) |
| Codex gate | `enforcer` | `codex-enforcement` |

**Before major planning or refactors:** invoke researcher + architect-tools + code-review — automatically, not only when the user names them.

---

## Agent panel consensus (2026-06-18)

| Agent | Recommendation |
|-------|----------------|
| **Strategist** | Default ON after suit boot; complexity >25 requires phased plan before edits |
| **Architect-tools** | Document sync via `AGENTS-consumer.md` postinstall; architectural review on major refactors |
| **Researcher** | Use `search_codebase` / `get_documentation` when governance LLM unavailable |
| **Code-reviewer** | Per-suite triage; lead owns every error; skill doc passes 100/100 best practices |

---

## Operationalization in core repos

| Repo | Boot check | AGENTS.md |
|------|------------|-----------|
| **xray** | `npx 0xray health` | Framework + `AGENTS-consumer.md` (ships on postinstall) |
| **repertoire** | `npm run confirm:suit` | § Default operating mode |
| **groover** | `npx 0xray health` | § Default operating mode |
| **chrono-warp-drive** | `npx 0xray health` | § Default operating mode |

Skill source: `src/skills/autonomy-command/SKILL.md` · synced to `~/.grok/skills/` on `npx 0xray grok install`.

---

## Related

- [Grok Guide](../architecture/GROK_GUIDE.md)
- [Operating Procedures](../agents/OPERATING_PROCEDURES.md)
- [SKILLS.md](https://github.com/0xRayAI/xray/blob/main/SKILLS.md) — `autonomy-command` catalog entry
- Platform plan: `0x0/docs/SUIT-AUTONOMY-OPERATING-MODEL.md`