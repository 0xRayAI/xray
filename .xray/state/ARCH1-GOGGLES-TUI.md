# Arch1 — Goggles TUI power-up implementation plan

2026-10-01 · local · not Dist · calling OFF · under development until Blaze GO

Hand this whole file to Arch1 (architect seat). Plan only. Do not commit, push, Dist, or call anyone from this doc.

Stamps on every phase ticket and every handoff packet: local / not Dist / calling off / under development until Blaze GO.

## 1. One breath

Goggles is already the eyes organ on the suit — it can check the lens quietly and hand back a short card when you ask for digest or triage. What we are building next is how that shows up in the TUI: one clear look path, a card pane instead of a wall of text, status/health that admit the organ is worn, and after wear the TUI just sees it — no second install dance. Still local. Still calling off. Still not Dist. End-user plate stays Coming soon / under development until Blaze says GO.

Friend hear: put the glasses on in the terminal, pick one way to look, get a short card (or a quiet lens match), zoom only when you need to. Don’t try to see every plane at once. Don’t publish. Don’t call.

## 2. Done looks like (acceptance)

Concrete. If these are true, Phase A–D are done. Phase E stays parked.

| # | Acceptance | How you know |
| --- | --- | --- |
| A1 | One command path: `0xray look …` (or documented suit alias that lands on the same organ) | `0xray look --help` (or alias) runs; same organ as today’s `0xray goggles` / pipeline |
| A2 | Kind 0 quiet on match | `look kind 0` / `look actuality` → empty stdout (or blank LENS); no “suit ON” claim |
| A3 | Kind 1 non-card outers → reading string | e.g. `look dichotomy` → `The reading is dichotomy.` (+ optional `Scope is …`) |
| A4 | digest / triage → card, not reading string | Output is card fields; not `The reading is digest.` |
| A5 | Scope zoom works on look | ecosystem → part → one flow → one artifact; one artifact = one file only (no guess) |
| A6 | Leave-plane denied | Pipeline / plate drawing path → deny with leave-plane message; not treated as zoom |
| B1 | Card pane in TUI | digest/triage render as a pane/table (From · Digest · Plate · Entry · Exit · Files · Skills · Setup · Teardown · Worn), empty fields visible and empty |
| C1 | status shows worn organ + last Kind 0 | `0xray status` line(s): Goggles worn yes/no; last Kind 0 = quiet (match) or drift text |
| C2 | health shows same organ signal | `0xray health` includes Goggles organ presence + last Kind 0 outcome (same contract as status) |
| D1 | Wear → TUI discovery | After wear of a pack that includes the organ, status/health/look work without a second install step |
| E0 | Dist / calling / house dials / look-before-act in skills | Parked. Explicit Blaze GO required |

Honesty stamps must appear in status/health copy where end-user facing: under development / calling off / not Dist (builder TUI can be shorter; do not promise “try it live”).

## 3. Non-goals / hard brakes

Refuse these even if a ticket sounds convenient.

- Calling stays OFF. No call hooks, no “phone home,” no Confer product light-up.
- Not Dist. No publish, no npm Dist chrome, no end-user “shipped” claim. Local worn / local TUI only until Blaze GO.
- No Kind 0 → nine collapse. Kind 0 name-checks the six outer names only (dichotomy → syncopate → synthesis → digest → triage → loop). The nine card-map planes (ground … reporting) are a separate list. Do not “fix” Kind 0 by pointing it at the nine.
- Kind 0 does not inspect the running suit. File list ↔ code’s six names. Quiet on match. Live-suit read = new card, not a silent expand.
- No third kind. Scope is a zoom ladder, not a kind. OPEN slot stays empty. Lit ≠ feature unlocked.
- Pipelines/ground do NOT fold into scope. Pipeline drawing = leave-plane → stop. Not a zoom stop.
- No inventing plane count. Outer set is open (six so far; more may come). Do not lock “exactly six” as product law. Do not invent a tenth card-map plane.
- Refuse whole-plane / whole-set stories for Kind 1 outers. Name one. Label as a reading (except digest/triage → card).
- Empty honesty. Empty fields stay empty. Doors = plate INPUT/OUTPUT box titles only. Setup/teardown only if named. Skills = filename only. Don’t invent stamps. Mill path = `scripts/foundry`. Pipeline name alone stays quiet.
- No house dials sync / Dist / look-before-act in agent skills in this plan’s active phases — Phase E parked.
- Do not revive old kinds domain / pipelines / ground as kinds or scope stops without Blaze lock.
- Synchronicity unplaced. Confer dark. No mystery actuality plate_type.
- Friend-doc correction (carry forward): `GOGGLES-FOR-ARCH1-FRIEND-2026-09-30.md` has one stale line implying Kind 0 checks the nine planes. Corrected lock: Kind 0 = six outers only. Nine card-map planes stay separate. Prefer this plan + code (`WORN_PLANES` vs `CARD_PLANES`) over that stale line.

## 4. Current baseline (honest table)

Verified lightly against `/workspace/critic-161/xray/` on `feat/goggles-look` (organ tree) and Sept 30 blueprints. Update ship honesty from 2026-10-01 Blaze/CoS note (overrides older “not committed” lines in Sept 30 friend doc).

### 4.1 What already shipped (organ)

| Piece | Status | Notes |
| --- | --- | --- |
| Kit organ files | Landed | `src/integrations/hooks/goggles-pipeline.mjs`, `goggles-planes.json` |
| Unit tests | Landed | `src/__tests__/unit/goggles-pipeline.test.ts` — Kind 0 quiet, Kind 1 reading, digest/triage card, leave-plane deny, scope stop |
| Orchestrator SKILL note | Landed | `src/skills/orchestrator/SKILL.md` — Goggles section (local honesty; Kind 0 = six; digest/triage card) |
| CLI shim | Partial | `0xray goggles [args…]` in `src/cli/index.ts` spawns pipeline; no first-class `look` alias yet |
| Kind 0 | Works in organ | `actualityOf` / `actualityLine` — quiet on match; drift string on mismatch; does not read live suit |
| Kind 1 outers | Works in organ | One named outer → `The reading is …` (+ scope) |
| digest / triage cards | Works in organ | Text card rows; nine card-map planes; empty fields allowed |
| Leave-plane / scope stop | Works in organ | `organStop` / `cardStop` deny messages |
| PR #161 | Merged on `feat/goggles-look` (critic PASS) | Organ cut in; not Dist |
| Wear proof | Proved local | npm 4.0.31 wear on throwaway home `/tmp/xray-wear-431-VaF5`: organ in tarball, Kind 0 quiet, git validate OK; non-git fails hooks-by-design. Checkout not touched. |
| Calling | OFF | Still off |
| Dist | No | Still not Dist |
| End-user plate | Coming soon / under development | Do not promise live try-it |

Workspace snapshot note: critic tree `package.json` may still read 4.0.30 depending on checkout; wear proof cited 4.0.31. Trust wear evidence over a stale version string in a review checkout.

### 4.2 What’s still missing (TUI)

| Piece | Status | Gap |
| --- | --- | --- |
| `0xray look` (or suit alias) as the friend command | Missing / incomplete | Only goggles shim; product speak wants `look` |
| Kind 0 / Kind 1 branching presented as TUI UX | Organ only | Works as argv → text; not framed as TUI command surface |
| Card pane (layout, not wall of text) | Missing | digest/triage already emit line-oriented card text; no dedicated TUI pane renderer |
| status shows Goggles organ + last Kind 0 | Missing | `src/cli/commands/status.ts` has OpenCode / skills / agents / inference / health — no Goggles block |
| health shows same | Missing | `0xray health` in `src/cli/index.ts` — no organ / LENS signal yet |
| Wear → TUI discovery without second install | Partial / unproven for TUI | Organ packs into dist via build copy of `.mjs`; status/validate do not yet advertise Goggles the way repertoire is checked |
| Last Kind 0 surface | Organ writes LENS | `maintainLens` → `.xray/state/LENS.md` (quiet = blank/newline); status/health do not read it yet |
| Phase E (skills look-before-act, house dials, Dist) | Parked | Blaze GO only |

### 4.3 Two lists (do not collapse)

| List | Names | Role |
| --- | --- | --- |
| Kind 0 outers (six so far) | dichotomy · syncopate · synthesis · digest · triage · loop | Map/list compare; quiet on match. Open set — more may come. |
| Nine card-map planes | ground · routing · house · boot · governance · memory-recall · orchestration · processor · reporting | Digest/triage card rows only. Not Kind 0. |

`goggles-planes.json` today: six outers + scope ladder + sparse seeds for ground / routing / house. Other card planes assembled from plates/code paths inside the organ.

## 5. Phases (ordered tickets for Forge)

Each phase uses packet fields: goal · constraints · path · acceptance · evidence · next owner · escalate.

Uncertain paths marked (?). Prefer verifying against the worn tree before editing.

### Phase A — TUI command surface (look / alias)

Goal: One friend command path into the existing organ. Kind 0 quiet. Kind 1 reading string vs digest/triage card branch. Scope zoom. Leave-plane stays deny.

Constraints: local / not Dist / calling off; do not reimplement organ logic in the CLI layer — wire to `goggles-pipeline.mjs`; do not collapse Kind 0 into nine; no live-suit Kind 0; no third kind; OPEN empty.

| Path | Role | Certainty |
| --- | --- | --- |
| `src/cli/index.ts` | Add `look` command and/or alias → same spawn as `goggles` | likely |
| `src/integrations/hooks/goggles-pipeline.mjs` | Keep as source of truth (`look`, `readGoggles`, `actualityLine`, …) | touch only if argv UX needs thin glue |
| `src/integrations/hooks/goggles-planes.json` | Outers + scope + sparse card seeds | avoid invent; touch only if Blaze-named |
| `src/__tests__/unit/goggles-pipeline.test.ts` | Keep green; add CLI smoke if needed | likely tests |
| `src/cli/commands/look.ts` (?) | Optional thin wrapper if index grows | uncertain — may stay inline like `goggles` |
| `src/skills/orchestrator/SKILL.md` | Doc `look` as the path (still local stamps) | likely light edit |
| Docs / AGENTS (?) | Builder note only; no Dist chrome | uncertain |

Acceptance:

- `0xray look kind 0` (and `actuality`) → quiet on match.
- `0xray look dichotomy` → `The reading is dichotomy.`
- `0xray look digest ground` → card text (fields), not reading string.
- `0xray look triage routing` → card + empty/hole notes.
- Multi-outer / whole-set / kind 2 → refuse or quiet per existing organ rules (`Name one plane.` / empty).
- Scope: `look dichotomy part` → reading + scope; `look digest routing one artifact` → single-file card or empty if not exactly one file.
- Leave-plane behavior unchanged (deny reason includes leave / not the plane).
- Existing `0xray goggles` either aliases to same path or stays as synonym (document one primary: prefer `look`).

Evidence: unit tests green; short CLI smoke transcript in chat or `.xray/state/` sample (local only).

Next owner: Forge (implement) → Arch1 review → Critic.

Escalate: If CLI would need Dist packaging or calling hooks — stop. If someone asks Kind 0 to read live suit — new card, stop.

#### Ticket A1 — Wire look

- goal: first-class `0xray look` → organ
- constraints: stamps; no organ rewrite
- path: cli index → spawn `dist|src/.../goggles-pipeline.mjs` (same as `goggles`)
- acceptance: `look` argv parity with `goggles` for Kind 0 / 1 / digest / triage
- evidence: smoke commands
- next owner: Forge
- escalate: Dist/call request

#### Ticket A2 — Kind branch honesty in help text

- goal: `--help` / description states: Kind 0 quiet; outers = reading; digest/triage = card; calling off; under development
- constraints: no “try it live” end-user promise
- path: commander description strings
- acceptance: help text matches lock
- evidence: `0xray look --help` paste
- next owner: Forge
- escalate: marketing copy wanting Dist

### Phase B — Card pane renderer (digest / triage)

Goal: When the outer is digest or triage, TUI shows a card pane, not a wall of prose. Map card fields → layout. Empty cells stay empty and visible.

Constraints: fields exactly From · Digest · Plate · Entry · Exit · Files · Skills · Setup · Teardown · Worn; Skills = filename only; Worn only when running path ≠ source; don’t invent stamps; doors = INPUT/OUTPUT box titles only; setup/teardown only if named; mill path `scripts/foundry`; non-card outers stay `The reading is …`.

| Path | Role | Certainty |
| --- | --- | --- |
| `src/integrations/hooks/goggles-pipeline.mjs` | `formatPlaneCard` / `cardRows` / `assemblePlane` — may emit structured JSON or keep text and add a formatter | likely small |
| New: `src/cli/commands/goggles-card-pane.ts` (?) or `src/cli/tui/card-pane.ts` (?) | Render pane from card object | uncertain layout home — no dedicated `tui/` dir today |
| `src/cli/index.ts` | Route digest/triage through pane printer when stdout is TTY (?) | uncertain |
| `src/__tests__/unit/goggles-pipeline.test.ts` | Card field order / empty honesty | likely |
| New unit test for pane formatter (?) | Snapshot of pane | uncertain |

Acceptance:

- digest/triage in TUI → bordered or column card showing all ten fields (plus Plane header as today).
- Empty fields render as blank (not “n/a” invent, not dropped unless zoom narrows — existing one-artifact narrow may omit empties; document that as scope zoom, not honesty break).
- triage still surfaces empty/hole notes (e.g. `Empty: skills, setup, teardown`) without turning into an essay.
- dichotomy/syncopate/synthesis/loop still reading string only — no fake card.
- Non-TTY / pipe may keep line-oriented text for scripts (document); TTY gets pane.

Evidence: before/after screenshot or ANSI dump in local notes; unit snapshot.

Next owner: Forge → Arch1 → Critic.

Escalate: If pane work wants a full Ink/React TUI rewrite of the whole suit — stop and ask Blaze (scope creep). Prefer thin formatter over new framework.

#### Ticket B1 — Structured card object

- goal: stable in-memory / JSON shape for one plane card (see §6)
- constraints: empty allowed; no invent
- path: export from pipeline or thin adapter
- acceptance: digest ground matches field contract
- evidence: unit assert on object keys
- next owner: Forge
- escalate: request to fill Entry inventively

#### Ticket B2 — TTY pane printer

- goal: render card object as pane
- constraints: local stamps in footer optional one-liner (“under development · calling off”)
- path: cli formatter
- acceptance: visual pane; empties visible
- evidence: ANSI dump
- next owner: Forge
- escalate: Dist chrome / marketing plate

### Phase C — status + health show worn organ + last Kind 0

Goal: `0xray status` and `0xray health` surface: (1) Goggles organ present/worn, (2) last Kind 0 outcome (quiet = match).

Constraints: quiet must read as success/match, not as “broken missing output”; no live-suit inspect; calling off; not Dist; don’t claim nine planes checked.

| Path | Role | Certainty |
| --- | --- | --- |
| `src/cli/commands/status.ts` | Extend `StatusReport` + `printStatus` | likely |
| `src/cli/index.ts` (health command block ~261+) | Add Goggles lines to health output | likely |
| `src/integrations/hooks/goggles-pipeline.mjs` | Reuse `actualityLine`, `lensPath`, maybe `maintainLens` | read/call only |
| `.xray/state/LENS.md` | Last Kind 0 text (empty = quiet match after maintain) | runtime state |
| `src/cli/commands/validate.ts` (?) | Optional parallel check like repertoire organ | optional — don’t conflate validate with status |
| Tests: status unit (?) / small integration | Assert Goggles section | uncertain — status may lack tests today |

Acceptance:

- status includes something like: `Goggles: worn` | `Goggles: not found` and `Kind 0: quiet (match)` | `Kind 0: Actuality. Drift: …` | `Kind 0: (no LENS yet)`.
- health includes the same two signals (wording can share a helper).
- Missing organ ≠ Kind 0 drift. Separate lines.
- Stamps: builder-facing OK; no Dist claim.

Evidence: `0xray status` / `0xray health` paste from local worn home.

Next owner: Forge → Arch1 → Critic.

Escalate: If health wants to phone home — refuse (calling off).

#### Ticket C1 — Shared organ probe helper

- goal: one function: `{ organPresent, kind0Text, kind0Quiet }`
- constraints: Kind 0 = six outers only via existing `actualityLine` / LENS
- path: small module under `src/cli/` or import from pipeline
- acceptance: unit-tested probe
- evidence: test
- next owner: Forge
- escalate: live process inspect

#### Ticket C2 — Wire status + health

- goal: print probe results
- constraints: stamps
- path: `status.ts` + health in `index.ts`
- acceptance: both commands show organ + Kind 0
- evidence: CLI paste
- next owner: Forge
- escalate: Dist badge

### Phase D — Wear → TUI discovery (no second install)

Goal: After wear of a pack that includes the Goggles organ, TUI (`look` / `status` / `health`) finds the organ without a second install step.

Constraints: local wear only; throwaway homes OK for proof; do not touch Blaze’s real checkout in tests; non-git failing hooks-by-design stays as-is (document, don’t “fix” by disabling hooks silently); not Dist.

| Path | Role | Certainty |
| --- | --- | --- |
| Build copy of hooks `.mjs` → `dist/integrations/hooks/` | Already in `package.json` build script | verify, don’t break |
| `src/cli/index.ts` | Resolve organ from `packageRoot` dist then src (already for `goggles`) | verify `look` same |
| Wear scripts `scripts/node/wear-*.cjs` (?) | Ensure hooks/organ files land where CLI probes | uncertain — verify pack file list |
| `src/__tests__/unit/wear-pack-file-list.test.ts` | Assert `goggles-pipeline` + `planes.json` in pack | likely add assert |
| `src/cli/commands/validate.ts` (?) | Optional “goggles organ on disk” check mirroring repertoire | optional |
| Probe helper from Phase C | Discover via worn package paths | likely |

Acceptance:

- Fresh wear on throwaway home → `0xray look kind 0` quiet; `0xray status` shows Goggles worn; no manual `npm link` / second copy step.
- Organ present in tarball/pack file list (`pipeline` + `planes.json`).
- Document: git validate OK; non-git hooks-by-design fail (expected).

Evidence: wear transcript on a throwaway path (pattern like `/tmp/xray-wear-…`); do not modify user checkout.

Next owner: Forge → Critic (wear proof) → Arch1.

Escalate: If wear would require Dist publish to prove — stop; use local pack / `npm pack` + wear instead.

#### Ticket D1 — Pack list assert

- goal: wear-pack test includes goggles organ files
- constraints: local
- path: `wear-pack-file-list.test.ts`
- acceptance: files listed
- evidence: test green
- next owner: Forge
- escalate: missing files needing Dist

#### Ticket D2 — End-to-end wear smoke (manual or scripted)

- goal: throwaway wear → look + status see organ
- constraints: throwaway home only
- path: documented smoke steps
- acceptance: no second install
- evidence: transcript
- next owner: Forge / Critic
- escalate: hooks redesign

### Phase E — Later / Blaze GO only (parked)

Explicitly out of scope until Blaze says GO. Do not start these tickets from this plan.

| Parked item | Why parked |
| --- | --- |
| Look-before-act in agent skills (auto-hold from skills) | Product + safety; needs Blaze lock |
| House dials sync | House ≠ kit; dual stack forbidden while CLI owns worn cut |
| Dist / publish / end-user “try it” | Calling off · not Dist · under development |
| Kind 0 live-suit inspect | New card required |
| Pipeline-as-zoom | New Blaze lock required |
| OPEN slot features | Lit ≠ unlocked; stay empty |
| Confer / calling / synchronicity place | Locked dark / unplaced |

Ticket E-PARK (documentation only): one paragraph in Arch1 notes listing the parked list + “Blaze GO required.” No code.

## 6. Data contracts

### 6.1 Kind 0 I/O

| | |
| --- | --- |
| Input | Intent: actuality / kind 0 / lens (via look argv or `maintainLens`) |
| Compare | Drawn list from `goggles-planes.json` `planes` ↔ code constant six outers (`WORN_PLANES`) |
| Output (match) | Empty string. Quiet. `LENS.md` may be `"\n"`. |
| Output (drift) | `Actuality. Drift: worn is not the map.` |
| Does not | Inspect running suit; check nine card-map planes; speak on match |

### 6.2 Kind 1 — non-card outer (reading)

| | |
| --- | --- |
| Input | Exactly one outer name from open set + optional one scope level |
| Output | `The reading is <name>.` or `The reading is <name>. Scope is <scope>.` |
| Refuse | Whole set / kind 1 alone / multiple outers / multiple scopes → `Name one plane.` or quiet per organ rules |

### 6.3 Kind 1 — digest card JSON shape (target for pane)

Logical shape (field order matters for display):

```json
{
  "plane": "ground",
  "flavor": "digest",
  "from": "",
  "digest": "Home. The dev plane.",
  "plate": "",
  "entry": "",
  "exit": "",
  "files": ["src", "grok-bot/OP-PROC.md", "src/opencode/agents", "Agents.md", "src/integrations", "package.json", "scripts/foundry"],
  "skills": "SKILLS.md",
  "setup": "",
  "teardown": "",
  "worn": ""
}
```

Rules: empty string/omission allowed and meaningful; skills = filename only; worn only if dist≠src (or equivalent); do not invent plate stamps; files for one artifact scope = length 1 or refuse/empty.

Today’s text form (acceptable interim):

```
Plane: ground
From:
Digest: Home. The dev plane.
Plate:
Entry:
Exit:
Files: …
Skills: SKILLS.md
Setup:
Teardown:
Worn:
```

Pane maps the same fields. Prefer exporting the object for TUI; keep text for pipes/tests.

### 6.4 Triage flags

Same card as digest, plus honesty lines, e.g.:

- `Empty: skills, setup, teardown` (list actually empty fields)
- Hold / drawing notes as organ already emits (`Holds.`, `Drawing only.`)

Do not invent holes that aren’t empty. Do not auto-fill.

### 6.5 Scope args

| Scope | Friend | Rule |
| --- | --- | --- |
| ecosystem | whole place | Default zoom; widest |
| part | piece | Don’t cross parts (dirs) under hold |
| one flow | path | One flow / one path discipline under hold |
| one artifact | one thing | One file only — no guess; if ≠1 file → empty/refuse |

Not kinds. Not pipelines. Not ground-as-zoom.

### 6.6 Leave-plane deny message

Examples already in organ (keep / do not soften into zoom):

- `The reading is <plane>. That drawing is not the plane.`
- `The reading is <plane>. The action is <other>.`
- `The reading is <plane>. Scope is one artifact. This action is wider.`

Pipeline name alone → quiet (no open). Drawing / plate path under wrong hold → deny.

## 7. Test plan

### 7.1 Unit (organ — already strong; keep green)

- Kind 0 quiet on match; drift on mismatch.
- Kind 1 reading for dichotomy / syncopate / synthesis / loop (+ scope).
- digest card fields; triage empty flags.
- Refuse set / open / kind 2 / TEGHAL.
- Leave-plane deny; scope wider deny.
- Session boot / compact lens notes (existing).

### 7.2 TUI / CLI smoke (new)

| Smoke | Expect |
| --- | --- |
| `0xray look kind 0` | quiet |
| `0xray look dichotomy` | reading string |
| `0xray look digest ground` | card / pane |
| `0xray look triage routing` | card + `Empty: …` |
| `0xray look digest routing one artifact` | one-file card |
| `0xray look digest ground one artifact` | empty (many files — no guess) |
| `0xray status` | Goggles + Kind 0 lines |
| `0xray health` | same signals |

### 7.3 Wear smoke

- Git throwaway: wear → look + status see organ; validate OK (git).
- Non-git: expect hooks-by-design failure — document, don’t “fix” into false green.
- Prefer `/tmp/…` homes; do not wear over active checkout in CI notes.

### 7.4 Honesty cases

- Empty Entry/Exit/Setup/Teardown visible.
- Worn only when paths differ.
- Kind 0 never lists nine card planes as the compare set.
- Leave-plane never becomes scope.

## 8. Risks / overshoots to refuse

| Risk | Refuse by |
| --- | --- |
| Collapsing Kind 0 into nine card planes | Separate constants; tests assert digest set ≠ outer set |
| “Quiet means broken” in status UI | Label quiet as match |
| Live-suit Kind 0 creep | Escalate — new card |
| Pipeline-as-zoom in TUI copy | Leave-plane wording only |
| Full TUI framework rewrite | Thin pane formatter first |
| Dist / npm publish “to finish look” | Local pack + wear proof |
| Calling / Confer light-up | Hard brake |
| Inventing Entry/Setup to look complete | Empty stays empty |
| Treating OPEN lit as unlocked | Keep empty; no feature flag theater |
| Dual house goggles stack | CLI owns worn cut; house dials parked |
| Friend-doc stale Kind 0→nine line guiding tickets | This plan wins; fix friend doc later if Blaze asks |
| Alias soup (`look` / `goggles` / glimpse / host verbs) | One primary (`look`); one synonym max |

## 9. Engineer appendix (short)

### 9.1 Kind / scope / outer vs nine

- Goggles = kit organ (with Repertoire, Dynamo, Clearing). Not a Host Pack. Not “Grok Bot kit.”
- Kind 0 = THE LENS = actuality = six outer names map vs code. Quiet on match.
- Kind 1 = THE OUTER ONES = open set; name one; reading or (digest/triage) card.
- Scope = zoom ladder only (ecosystem → part → one flow → one artifact). Not a kind.
- Nine card-map planes = ground…reporting = card rows for digest/triage only.
- Seven operating planes (code, OP-PROC, model, suit, mill, host, test/ship) = another layer — do not collapse into outers or nine.
- OPEN = empty. Calling = off. Dist = no until Blaze GO.

### 9.2 Packet fields (every ticket)

goal · constraints · path · acceptance · evidence · next owner · escalate

Always stamp constraints with: local / not Dist / calling off / under development until Blaze GO.

### 9.3 Code anchors (verify before edit)

```
src/integrations/hooks/goggles-pipeline.mjs   # organ
src/integrations/hooks/goggles-planes.json    # outers + scope + sparse seeds
src/__tests__/unit/goggles-pipeline.test.ts   # contract tests
src/cli/index.ts                              # goggles shim; look/status/health live here
src/cli/commands/status.ts                    # status report (no Goggles yet)
src/skills/orchestrator/SKILL.md              # builder honesty
.xray/state/LENS.md                           # last Kind 0 (runtime)
```

Review checkouts: `/workspace/critic-161/xray/` (preferred organ tree) or `/workspace/xray-review/`.

### 9.4 Prior blueprints

- `GOGGLES-BLUEPRINT-FOR-ARCH1-2026-09-30.md` — dial lock + worn cut brakes
- `GOGGLES-FOR-ARCH1-FRIEND-2026-09-30.md` — friend card table (fix Kind 0≠nine stale line)
- This file — TUI power-up plan only (2026-10-01)

### 9.5 CoS shortlist → phase map

| CoS shortlist item | Phase |
| --- | --- |
| Surface look in status/health | C |
| One command path look + scope; Kind 0 silent; readings vs card | A |
| Card outer in TUI | B |
| Wear wiring → TUI sees organ | D |
| Skip Dist chrome | All active phases + E parked |

## 10. Hand-off

Arch1: cut Phase A tickets first. Do not start E. Do not Dist. Do not call. After A–D green + wear smoke, park and wait for Blaze GO before any Dist / skills look-before-act / house dials work.

End stamps: local · not Dist · calling OFF · under development until Blaze GO · 2026-10-01

## E-PARK

Phase E was not started. Parked until Blaze GO: look-before-act in agent skills, house dials, Dist or publish or a live try-it, Kind 0 reading the running suit, pipeline-as-zoom, OPEN features, Confer, calling, and synchronicity. No code for those. A non-git wear still skips Cursor hooks on purpose. That miss is not a green validate.
