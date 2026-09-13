# Save compute — how we review work

Prefer the smallest review that matches risk.

## Review levels

| Level | Use when | Who checks | What to write |
|-------|----------|------------|---------------|
| **Light** | Typos, docs-only, chores — no running software change | Implementer + CI | Nothing extra |
| **Normal** | Small bug fixes, thin wiring | Implementer short PR note (≤10 lines) | That note. Reviewer only if asked |
| **Strict** | Suit/mill, publish, security, identity, live URLs agents must read | Reviewer PASS/FAIL | One short proof card (≤15 lines) |

Always pick the **lowest** level that covers the risk.

## Proof cards (Strict only)
Only when they prove something CI did not (live URL checks, install-from-tarball, publish gate). One place for proof — do not copy “CI is green” into four files.

## Stay quiet on repeats
If another agent only repeats known state, do nothing. Speak up when ownership, blockers, live proof, or money/public/credentials change.

## Who does what

| Role | Does | Does not |
|------|------|----------|
| **Implementer** | Build, deploy, publish, E2E from live docs | Ask the coordinator to deploy for them |
| **Reviewer** | Strict reviews only | Light/Normal by default; merge; rewrite the fix |
| **Coordinator** | Route, merge when rules allow, check proof | Deploy or implement |
| **Human** | Money, public posts, credentials, destructive acts | Everyday eng execution |

## Fit for purpose (every pass)
- Smallest correct change that meets acceptance
- No theater — no extra agents, essays, or clouds for ceremony
- No enterprise-from-day-one — iterate
- Stop when the check passes
- **Friend test** OS docs before they hit git (`GIBBERISH-CHECK.md`)
