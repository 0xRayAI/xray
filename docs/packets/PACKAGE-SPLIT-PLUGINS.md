# 0xray v5.0.0 — package split and plugin model

Packet only. No code in this change. The word for the human is **owner**.

This file is a skeleton. The **Subsystem** and **Core** sections are **pending research**. Five researchers debate on the pull request for up to three rounds. When that debate is done, `[v5-packet]` posts one conjoin comment and folds that picture into this file.

## Packet

- goal: Split fleet infra out of this monorepo into `@0xray` packages and a provider-agnostic plugin model, shipped as 0xray 5.0.0.
- constraints: Packet only. No code. Say owner. No personal names. Issue 495 stays open. Subsystem and core stay pending until the conjoin.
- path: `docs/packets/PACKAGE-SPLIT-PLUGINS.md`. Researchers debate on the draft. One conjoin fills the pending sections.
- acceptance: The filled packet names packages and paths, the dependency graph, the plugin contract, config defaults, migration order, the 4.x to 5 guide, versioning, tests, risks, and the core map.
- gates: This docs PR carries C only, and only once the packet is filled. B and D stay off. The v5 publish gates are below and are not this PR.
- evidence: Pending the conjoin. The skeleton is this file.
- next owner: the five researchers, then `[v5-packet]` for the conjoin.
- escalate: the owner, if forge, critic, and Arch1 do not all sign off.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/record-map.md`, `docs-site/docs/plates/foundry.md`, `docs-site/docs/plates/repertoire.md`.

## Research

Debate on the pull request. Every comment is posted as forge0x1. Start the comment with the handle. A comment @mentions the party it addresses.

| Handle | Role |
| --- | --- |
| `[v5-inference]` | Subsystem: Inference |
| `[v5-governance]` | Subsystem: External Governance |
| `[v5-engine]` | Subsystem: Autonomous Engine |
| `[v5-generalist-1]` | Generalist 1 |
| `[v5-generalist-2]` | Generalist 2 |
| `[v5-packet]` | Moderator. Conjoins when the debate is done. |

Up to 3 rounds. Read these before arguing what is core:

- `docs-site/docs/introduction.md`
- `docs-site/docs/architecture/v3-from-v2.md`
- `docs/reflections/what-is-v3.md`
- `docs/archive/architecture/subsystem-map.md`

`[v5-packet]` then posts one conjoin: what is agreed, what is resolved and why, what is still open. That comment @mentions @forge0x1, @critic0x, and @arch10x. The same picture is folded into this file. Subsystem and Core stay pending until that fold.

## Locked decisions

These are owner decisions. Research maps the tree onto them. It does not reopen them.

- Frame: **0xray 5.0.0**, a major breaking release.
- 0xray leans on xAI and stays provider-agnostic.
- `@0xray/bifrost` owns the live board: server, collector, live-inbox, wake template, deploy script. Each install pins the version it runs.
- The core defines a sign-in plugin slot and a chat plugin slot. House config turns them on through `features` and `plugins`. Propose one of `config.json` or `features.json`. The default is no sign-in and no chat, so the board stays read-only.
- `@0xray/repertoire` moves from the owner account to the 0xRayAI org.
- `@0xray/auth-xai` is optional. It wraps the bedrock xAI OAuth package and refreshes tokens on Railway. Fleets on xAI are the only users.
- Kanban drag-and-drop (a status change saved on the card timeline) needs some sign-in plugin. It does not need xAI.
- A simple fallback sign-in (owner token or GitHub) lets a non-xAI board drag cards.
- `@0xray/chat` is the provider picker ported from jelly: pick a provider, set your own key. Optional per board. Bot chat is per board.
- Proposed, and decided in the filled packet: `@0xray/goggles`, `@0xray/hooks` (`.cursor` hooks), `@0xray/house` (the house template `@0xray/grok-bot` depends on).
- chrono and jelly stay on the owner account. They are out of scope.
- Inventory the whole repo, including the Foundry/mill contracts and their CI jobs `Foundry mill` and `Validate mill contract`, goggles, hooks, the house template, reflection and repertoire hooks, docs-site, and the rest. For each row, propose core or its own `@0xray` package (for example `@0xray/foundry` or `@0xray/mill`) with a one-line reason.
- v5 core is the three subsystems (Inference, External Governance, the Autonomous Engine) plus the suit lifecycle (wear, validate, doctor) and the Codex gate that wears them. Bifrost, foundry/mill, goggles, hooks, house, chat, and the auth plugins are modules around that core.
- Map each inventory row to the subsystem it plugs into, or to `module, not core`.
- The plugin and config loader belongs to External Governance. It is part of that subsystem.
- Migration order: bifrost, then auth-xai, then the fallback sign-in, then chat, then the rest.
- Issue 495, the sign-in card packet, is reworked so the card sits on the sign-in plugin slot. This packet leaves 495 open.
- `@0xray/grok-bot` and the new packages are versioned against v5. The filled packet says how.
- Release gates for the 5.0.0 publish: the tarball is proven on a 4.x suit; every seat posts install, wear, validate, and doctor receipts; forge, critic, and Arch1 all sign off.

## Subsystem

pending research

## Core

pending research

## Inventory

pending research

| Surface | Paths | Home | Plugs into | Reason |
| --- | --- | --- | --- | --- |
| pending research | pending research | pending research | pending research | pending research |

## Packages

pending research

The filled section names what each package owns, including the file paths that move. The locked set is `@0xray/bifrost`, `@0xray/repertoire`, `@0xray/auth-xai`, the fallback sign-in package, `@0xray/chat`, and the proposed `@0xray/goggles`, `@0xray/hooks`, and `@0xray/house`, plus Foundry/mill and whatever else the inventory moves.

## Dependency graph

pending research

## Plugin interface

pending research

The filled contract covers three things. Sign-in identifies the user and answers can-write. Chat sends and streams. Keys stay out of the repo.

## Config schema

pending research

One file, `features.json` or `config.json`. Defaults: no sign-in plugin, no chat plugin.

## Migration order

1. bifrost
2. auth-xai
3. fallback sign-in
4. chat
5. the rest

Per-step tests and the docs-check for each step: pending research

## Fleet migration

pending research

The docs sweep names setup, the house template, onboarding, OP-PROC, WAKE-ROUTINE, docs-site, CHANGELOG, and the migration steps.

## What breaks for 4.x fleets

pending research

## 4.x to 5 migration guide

pending research

## Versioning against v5

pending research

`0xray` is 5.0.0. How `@0xray/grok-bot` and each new package pin that line is pending research.

## Release gates

For the 5.0.0 publish, after this packet is signed off:

- The packed tarball is proven on a suit that is still on 4.x.
- Every seat posts install, wear, validate, and doctor receipts.
- Three-way sign-off: forge (@forge0x1), critic (@critic0x), Arch1 (@arch10x).

This pull request is the packet. It does not publish.

## Tests and docs-check

pending research

## Risks

pending research

## Open questions

pending research

## Sign-off

- [ ] forge (@forge0x1)
- [ ] critic (@critic0x)
- [ ] Arch1 (@arch10x)

Forge records its sign-off as a forge0x1 comment. Each comment @mentions the party it addresses.
