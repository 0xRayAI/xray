---
name: Ship-ready mill gate
description: >-
  use this when deciding if a mill/factory product may merge or release;
  Strict full gate — Light/Normal skip long reviews; plain language
---
# Ship-ready mill gate

## Review level first
| Level | When | Gate |
|-------|------|------|
| Light | Docs/chore, no runtime | Implementer + CI |
| Normal | Small fix, ops/docs mirrors | Implementer + CI; **no Reviewer card** |
| Strict | Ship / live / security / identity only | Tasks below + reviewer short proof |

## Strict tasks
**A — PR + CI** worktree + PR · CI updated · green  
**B — Pack proof** when releasing a package: pack · temp install · tests pass  
**C — Docs** core first: README · CHANGELOG · llms.txt · AGENTS.md · SKILLS.md · package.json · docs site — then project-specific. Friend test. Patch stamps: `package.json` + CHANGELOG + stamped JSON only. Guides and Station do not pin a cut. `release:docs-check` runs `reconcile-version.mjs --check` then `validate-release-docs.mjs`.  
**C2 — Live agent docs** when agents must read them: HTTP 200 real content (not error page / banner). Paste curls.  
**D — Release** reviewer PASS · merge · `foundry gate` + `gate --verify-only` · implementer deploy/publish · live verify. Exact ship script: `npx @0xray/foundry release [patch|minor|major] --i-mean-it` (`scripts/foundry/release.mjs`). Already-bumped `package.json`: `--publish-only`. Green CI is gate A only. **Subject review. Fix n ship.** After PASS, review dest/domain, close leftovers, then D. PASS is not ship.

### Publish OTP (lead only — not a subagent)

The lead runs the CLI. A browser subagent is the wrong seat.

1. Stay logged in. Do **not** `npm logout`.
2. Every time run `npm publish --access public` in the live TTY — **no** `--auth-type=web`, **no** `--otp=` from chat, no `tee`.
3. Give the human the clickable `https://www.npmjs.com/auth/cli/<id>` URL. Do not press Enter. Do not open a VM browser. Do not ask for a 6-digit authenticator code in chat.
4. Wait on the same CLI for `+ <name>@<version>`.
5. Poll `npm view <name> version` until it equals the published version. The plus-line can precede the registry by minutes.
6. Then tag `v<version>` if missing. Do not start the next cut on a stale `npm view`.
7. **Registry install — both paths:** `npm view` is not an install.
   - Fresh: empty temp dir → `npm init -y` → `npm install <name>@<version>` from the registry.
   - Upgrade: existing consumer on the prior live version → `npm install <name>@<version>`. Hooks leave; wear stays.
8. Assert version, `_resolved` is `registry.npmjs.org`, `REQUIRED_PACK_PATHS`, then `npx <name> status`, `health`, and `validate`. `validate` is the wear check — not leftover `init.sh`. Do not move on until both paths are proven.
9. After the version is live, clean the `/loop` prompt this cycle (unsubscribe then resubscribe). Do not leave a tick waiting on the auth URL.  

Do not rebuild old processor-manager loops as bot gates.

## Who
Implementer builds · reviewer Strict only · coordinator routes · human for capital

Reviewer card lives in `ops/SEATS.md` (critic ✶). Lead dispatches ticket + PR URLs only. Critic Reads Station, verifies the diff, posts COMMENT (not self-APPROVE), proof card ≤15 lines + friend-test line. Does not merge or publish.

A new critic or any new subagent that does not already have this thread gets the latest commit SHA on the branch under review (fetch it; do not reuse an earlier SHA from a previous pass) and the Station card (`.xray/state/STATION.md`: intent, plan, git). If the card is missing, give branch + HEAD + what just changed. If the branch moves after you brief them, send the new SHA before they verdict.

The lead keeps control. Do not assume the subagent has the context. Give the duty, the latest SHA, the Station card, and the laws that apply. The subagent wears the applicable 0xRay suit before it works: the tree under review, built and installed. An older published package is not that suit. The lead checks the result.

Chat is not the brain. A cascade that must survive compaction is a named repertoire signal on the stack overlay, hydrated onto the project law list. NOTES holds the same cascade for the second Read. Station stays the ticket. A reflection is not this capture. Capture priority: a law is an invariant you would otherwise re-read the source to relearn. One law per subsystem bone. Heat touches last_seen and does not append a confidence sample, so more hits do not raise conviction. Heat touches last_seen only when the diary contains that signal's name; two definition words are not a hit; a weak session score is not lifted to 0.55 and a sample below 0.55 is not recorded. Constructing the organ does not append workspace samples. Hero names: `heat-is-not-conviction`, `inference-cycle-invariant`, `governance-vote-invariant`, `thin-dispatch-invariant`. Repertoire mergeStackOverlay refreshes a changed stack definition and keeps observation stats.

## Fail closed
Red CI, missing proof, docs lag, a guide pinning a patch, local version ≤ npm, live docs fail, gate fail, Strict without reviewer, or friend-test fail on public/OS docs.

Jargon is not the job. Review and cadence ask whether the change works. Do not spend the loop reciting dest names, mill liturgy, or host mantras.

Feat rebase: when the mandated work turns into mantra, or the job has split across planes that no longer share one present, stop. Go up a level and answer the original message again from this seat. Do not continue the side thread and call that the job.

### Engine cadence

This suite is the engine that builds the engine. When a seat sees OP-PROC, write it onto these existing surfaces in the same wake. Do not open a new skill.

1. Change the engine with precision.
2. Ship it local: build and install the tree. A live npm version stays live. Once a version is live, the stamper strips that patch ref from shipped guides and shipped OP-PROC, or reconcile advances the next cut. The stamper does not edit Station, NOTES, dest, or node_modules. It does not publish.
3. Test the change.
4. Run another deep review of the diff you just made.
5. Monitor long-term memory (dest name count and whether observations are the only growth) and short-term memory (Station: intent, plan, git).
6. Ship the PR.

### Planes

Operating planes: code, OP-PROC, model, suit, mill, host, and test/ship. Test/ship is the critical OP-PROC plane. Test then ship is the hero. Ship without that proof is the catastrophe. Long-term memory is the project law list. Each wake refreshes a changed stack definition and keeps observation stats. Heat writes the matched names onto Station, the short-term card that survives compaction. Reactive decisions move out of TypeScript into OP-PROC as the model improves. That move is why the mill and the suit exist. It is not fully proved. Once a version is live, the stamper strips that patch ref from shipped guides and shipped OP-PROC, or reconcile advances the next cut. The stamper does not edit Station, NOTES, dest, or node_modules. It does not publish. Do not freeze the live cut.
