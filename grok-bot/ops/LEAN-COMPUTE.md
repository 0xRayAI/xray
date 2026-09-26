# Save compute — how we review work

Prefer the smallest review that matches risk.

## Review levels

| Level | Use when | Who checks | What to write |
|-------|----------|------------|---------------|
| **Light** | Typos, docs-only, chores — no running software change | Implementer + CI | Nothing extra |
| **Normal** | Small bug fixes, thin wiring, **ops/docs mirrors** | Implementer + CI | Short PR note (≤10 lines). **No Reviewer card** |
| **Strict** | **Ship / live / security / identity only** (publish, live URLs agents must read, credentials) | Reviewer PASS/FAIL | One short proof card (≤15 lines) |

Always pick the **lowest** level that covers the risk. Suit/mill wear for a **ship** is Strict. Copying ops docs into `grok-bot/` is Normal.

## Proof cards (Strict only)
Only when they prove something CI did not (live URL checks, install-from-tarball, publish gate). One place for proof — do not copy “CI is green” into four files.

## Stay quiet on repeats
If another agent only repeats known state, do nothing.
Stay quiet on eng re-acks of a beat already **CLOSED**, **MERGED**, or **LIVE**.
Speak up when ownership, blockers, live proof, or money/public/credentials change.

## Who does what

| Role | Does | Does not |
|------|------|----------|
| **Implementer** | Build, deploy, publish, merge after the gate, E2E from live docs | Ask the coordinator to deploy for them |
| **Reviewer** | Strict reviews only | Light/Normal by default; merge; rewrite the fix |
| **Coordinator** | Route, check proof, Dist drafts | Deploy, implement, merge, **or launch/drive Cursor clouds** (card forge) |
| **Human** | Money, public posts, credentials, destructive acts | Everyday eng execution |

## Fit for purpose (every pass)
- Smallest correct change that meets acceptance
- No theater — no extra agents, essays, or clouds for ceremony
- No enterprise-from-day-one — iterate
- Stop when the check passes
- **Friend test** OS docs before they hit git (`GIBBERISH-CHECK.md`)

## Grok host gleanings (2026-09-14) — lean wakes
- **PreToolUse** = Build/CLI only; chat seats use rules + Strict review (no fake hooks).
- **Subagents** return summaries — parent skips full context reload.
- **Workflows / skills** = focused seat + progress on disk; prefer stable prompt text (**prompt caching**).
- **Groups** share one thread — keep membership tight; park silent seats; disk SSOT beats room chatter.
- **Hooks + ACP** = tool routing on CLI plant path.
- No host multi-plant sync/churn wake yet — **we** own cascade wakes + Dist reply-vs-quiet.

## CoS cloud refuse (2026-09-14)
Coordinator must not launch/resume/dump eng CloudAgents. Card implementer. Ops law in `CLOUD-CONTINUITY.md` + `SEATS.md` — **not** a suit hook on chat.
