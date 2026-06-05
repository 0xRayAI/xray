# xray — MCP-Centric AI Governance OS

xray is a pure v2 three-subsystem AI orchestration framework with MCP-centric governance.

## Commands

- Build: `npm run build`
- Test: `npm test` (vitest)
- TypeCheck: `npx tsc --noEmit`
- Lint: `npx eslint src/`
- CLI: `npx 0xray --help`

## Codex

This project enforces the Universal Development Codex (66 terms) via Dynamo governance.

Rules live in `xray/codex.json`. Key rules:

- **One thing at a time** — complete one task before starting the next
- **Triage. Fix. Loop.** — assess, fix, verify, repeat
- **Watch commands for errors** — never assume success from exit codes
- **Always add .gitignore** — never commit generated/transient files
- **Write tests for new code** — no production code without tests
- **Integration/E2E use real UI** — no stubs in integration tests
- **Surgical fixes** — fix root cause, not symptoms
- **No patches/stubs/bridge code** — every line has permanent purpose
- **Type safety first** — no `any`, `@ts-ignore`, or `@ts-expect-error`
- **Resolve all errors** — zero tolerance for unresolved errors

## Conventions

- Follow existing code patterns
- frameworkLogger only, never console.*
- Keep functions small and focused
- Early returns and guard clauses
- Meaningful naming (verbs for functions, nouns for classes)
