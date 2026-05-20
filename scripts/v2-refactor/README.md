# 0xRay v2 Refactor — Scripts & Validation Harness

**Purpose:** Supporting automation and validation tools for the three-subsystem refactoring.

**Location Rule:** Everything in this directory is for the v2 refactor only. Do not mix with general framework scripts.

## Current Contents (Phase 1)

- `README.md` (this file)
- `validation/` — the refactor validation harness (see below)

## How to Use

Before declaring any slice complete, run the commands documented in the current Phase Execution Plan + `Protected Paths & Validation Contract`.

The harness in `validation/` is the canonical place for reusable checks.

## Adding New Helpers

Any new validation, boundary linter, or migration helper that is reusable across slices belongs here.

All scripts must:
- Use `frameworkLogger` (or structured output) — never raw console.log for important events
- Be executable from the project root
- Be documented in this README and referenced from the active Phase plan

---

**Maintained as part of the 2026-05-20 v2 execution layer.**