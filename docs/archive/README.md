# Archived in-repo docs

Not the 4.0 wear contract. Live architecture for the suit is `docs-site/docs/architecture/v4-*.md` and `v3-from-v2.md`.

| Path | Why archived |
|---|---|
| `architecture/subsystem-map.md` | 2026-06-10 v3 file/LOC snapshot |
| `architecture/v3-nucleus.md` | Nucleus thesis; superseded by v3-from-v2 |
| `migration/v2-to-v3.md` | 41-MCP / Codex 72 migration that did not ship |
| `psa-2026-06-13-governance-source-enforcement.md` | Point-in-time PSA |
| `reports/` | StringRay v1.3.4 / v2 commercial mill output (not 4.0 wear) |
| `reflection-stringray-assessment-2026-03-10.md` | 2026-03-10 StringRay reflection (was in `logs/`) |
| `scripts/v2-refactor/` | 2026-05-20 v2 harness; unused by pack/CI; mac leftover `/Users/blaze/dev/stringray` |
| `scripts/test/vote-*.mjs` | v3 one-off governance vote harnesses |
| `logs-reports/` | Feb 2026 StringRay report digest + leftover job-auto/session dumps (was in `logs/reports/`) |
| `scripts/ci/` | Unused v3 CI scanners; live `.github` does not call them |
| `scripts/test-v2-consumer/` | Unused v2 consumer playbook paces |
| `scripts/bash/purge-legacy-docs-0xray-v2.sh` | One-off `rm -rf docs/archive` leftover; no callers |
| `scripts/test/test-*-integration.cjs` + `validate-e2e-full.cjs` + `test-consumer-e2e.mjs` + `test-cjs-mjs-scripts.cjs` | Duplicate runners; live floor tests stay `test-*-e2e.mjs` |
| `scripts/test/test-consumer-readiness.cjs` | Pre-mill duplicate; `test:consumer` now aliases packed mjs |
| `scripts/governance/retro-governance.mjs` | Phase-0 ritual; no npm/CI callers |

**Kept in `docs/`:** `architecture/governance-model.md` (Dynamo SSOT, 4.0 still uses it), `api/plugin-api.md` (nucleus plugin freeze), `reflections/` (session reflections).
