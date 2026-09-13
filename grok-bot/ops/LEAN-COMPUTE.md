# Save compute — how we review work

Plain rules so any human or agent can follow them. Prefer the smallest review that matches risk.

## Pick a review level

| Level | Use when | Who checks | What to write |
|-------|----------|------------|---------------|
| **Light** | Typos, docs-only, ops notes, chores — nothing that changes running software | Implementer + CI | Nothing extra |
| **Normal** | Small bug fixes, thin wiring, low blast radius | Implementer writes a short PR note (≤10 lines) | That PR note. No separate reviewer unless asked |
| **Strict** | Suit/mill changes, package publish, security, identity, or live URLs agents must read | Reviewer says PASS or FAIL | One short proof card (≤15 lines) |

Always choose the **lowest** level that still covers the risk. Using Strict for a typo is waste.

## Proof cards (Strict only)

A proof card is useful only if it shows something CI did not already show — for example live URL checks, install-from-tarball, or a publish gate.

Keep it short:
- PASS or FAIL
- commit hash
- CI run link
- the extra checks (commands or curl results)

Write the proof **once**. Do not paste the same “CI is green” into a cloud summary, a long ops essay, a board file, and chat.

Light and Normal: do **not** create separate receipt files.

## Stay quiet on repeats

If another agent only repeats known state (“CI green, waiting on review”, “already with the reviewer”), do nothing: no reply, no status ping to the human, no round of acknowledgements.

Speak up when:
- who owns the next step changes
- work is blocked
- something is live in production
- money, credentials, public posts, or destructive actions are needed

## Who does what

| Role | Does | Does not |
|------|------|----------|
| **Implementer** | Build, deploy, publish, run end-to-end from live docs | Ask the coordinator to deploy or mint for them |
| **Reviewer** | Strict reviews only | Review Light/Normal by default; merge; rewrite the fix |
| **Coordinator** | Route work, merge when rules allow, check that proof exists | Deploy, implement, or drive the implementer’s tools |
| **Human owner** | Money, public posts, credentials, destructive actions | Everyday eng execution |

## How we know it’s lean

- About two agents woken per real state change (not per chat ack)
- Reviewer only on Strict
- Coordinator silent on repeats
- One place holds the proof
- Deploy and publish stay with the implementer

## Fit for purpose (every pass)
Codex exists to stop over-engineering. On every pass:
- Mean lean execution — smallest correct change that meets acceptance
- No theater — no extra agents, essays, or clouds for ceremony
- No enterprise-from-day-one — iterate; don’t rebuild the OS to fix a latch
- Stop when the check passes

If a step doesn’t change the outcome, skip it.
