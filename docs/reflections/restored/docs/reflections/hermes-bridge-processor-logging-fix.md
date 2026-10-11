# Reflection: Hermes Bridge Processor Logging Fix

## Problem
6 Hermes E2E failures: `[pre-processors]` and `[post-processors]` entries missing from activity.log. The test at `test-hermes-e2e.mjs` Phase 4 greps for these tags to verify the bridge pipeline ran.

## Root Causes

### Cause 1: Stale `dist/` (primary)
Source edits to `src/integrations/hermes-agent/bridge.mjs` added `[pre-processors]`/`[post-processors]` logging in March but `dist/` was never rebuilt. The bridge at `~/.hermes/plugins/strray-hermes/bridge.mjs` — the *actual* file called by Hermes — was the June 2 version (27,375 bytes). The updated `dist/integrations/hermes-agent/bridge.mjs` (28,197 bytes) was never deployed.

The Python plugin resolves `BRIDGE_PATH = PLUGIN_DIR / "bridge.mjs"` where `PLUGIN_DIR = ~/.hermes/plugins/strray-hermes/`. The `node_modules/0xray/dist/` bridge is never called directly.

### Cause 2: `Array.isArray(results)` mismatch
`executePreProcessors()` returns `{ success, results: [...] }` (object), but `executePostProcessors()` returns `[...]` (array directly). The bridge code used a single `Array.isArray(results)` check to normalize:
- Pre: `false` → `details = []`, `processorCount = 0` 
- Post: `true` → `details = results.map(...)`, correct counts

This meant processor details were never included in pre-processor responses, and individual `[pre-processor]` log entries were never written.

## Fix
1. **Normalized return format**: Split the check into `Array.isArray(rawResults) ? rawResults : (rawResults.results || [])` so both pre and post work correctly
2. **Added missing logging**: `handlePreProcess` now logs `[pre-processors] N processor(s)`, `handlePostProcess` logs `[post-processors] N processor(s)`, and `runProcessors` logs individual `[pre-processor] name — ok` / `[post-processor] name — FAILED: err`
3. **Rebuilt dist**: `npm run build && npm pack`
4. **Deployed to plugin dir**: Copied updated `bridge.mjs` (+ `__init__.py`, `schemas.py`, `tools.py`) to `~/.hermes/plugins/strray-hermes/`

## Verification
- Hermes E2E solo: 49/0/0 (was 43/6/0)
- Full consumer E2E gate: Hermes 46/0/0, OpenCode 34/0/0, OpenClaw 96/0/0, Grok CLI 55/0/2 — **all pass**
