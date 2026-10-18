Plane: dev
From:
Digest: This checkout.
Plate:
Entry: package.json, src, and grok-bot/OP-PROC.md.
Exit: A change that stays in this repo.
Files: src, grok-bot, docs-site, AGENTS.md, package.json, README.md
Skills: orchestrator, researcher, project-analysis, git-workflow, tech-writer
Setup: You are in this repo.
Teardown: Leave other repos alone.
Worn:

Plane: integration
From: dev
Digest: How one part calls the next.
Plate:
Entry: The hook, the dispatch, or the bridge this file sits on.
Exit: The next call. Stop there.
Files: src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates
Skills: routing, orchestration, boot-orchestrator, enforcer, hermes-agent
Setup: One connection at a time.
Teardown: Do not sweep the rest of the repo.
Worn:

Plane: domain
From: dev
Digest: The drawing of one area.
Plate: docs-site/docs/plates
Entry: The plate under docs-site/docs/plates, or the plate reader.
Exit: The entry and exit written on that plate.
Files: docs-site/docs/plates, src/integrations/hooks/plates.cjs, .agents/skills
Skills: lens-gate, stamp-plate, record-map, station-card, memory-recall
Setup: One plate is in the frame.
Teardown: The plate is the drawing. The code stays on dev or integration.
Worn:

Plane: ecosystem
From: dev
Digest: What this repo wears from outside.
Plate:
Entry: scripts/foundry, and the @0xray packages this repo wears.
Exit: Back to this checkout when the change is here.
Files: scripts/foundry, node_modules/@0xray
Skills: foundry, suit-wear, consumer-mcp, house, package-face
Setup: The outside package is not this repo.
Teardown: Do not edit a worn package from here.
Worn: node_modules/@0xray

Card: ground
Plane: dev
From: dev
Digest: Home. The dev plane.
Plate: docs-site/docs/plates/ground.md
Entry: this checkout
Exit: a change that stays in this repo
Files: src, grok-bot/OP-PROC.md, grok-bot/LEXICON.md, src/opencode/agents, AGENTS.md, src/integrations, package.json
Skills: orchestrator, researcher, project-analysis, git-workflow, tech-writer
Setup:
Teardown:
Worn:

Card: synthesis
Plane: integration
From: integration
Digest: The reflect checkpoint for this checkout.
Plate: docs-site/docs/plates/synthesis.md
Entry: a gate, a turn, or a finished todo
Exit: due or not due
Files: src/nucleus/synthesis.ts
Skills: synthesis, confer, inference-cycle, temperament
Setup:
Teardown:
Worn:

Card: routing
Plane: integration
From: integration
Digest: Task text becomes an agent.
Plate: docs-site/docs/plates/routing.md
Plates: orchestration, processor
Entry: task text · context · thresholds
Exit: agent · strategy · adjusted score · file
Files: src/nucleus/thin-dispatch.ts
Skills: routing, orchestration, processor-pipeline, delegation-gate
Setup:
Teardown:
Worn: dist/nucleus/thin-dispatch.js

Card: house
Plane: integration
From: integration
Digest: A state flow plate: the stages a house goes through before doctor says House: PASS.
Plate: docs-site/docs/plates/house.md
Plates: suit-wear
Entry: EMPTY
Exit: DOCTOR · House: PASS?
Files: grok-bot/lib/seat-doctor.cjs, grok-bot/templates/house/fleet/WAKE-ROUTINE.md, grok-bot/templates/house/HOUSE.md, src/__tests__/unit/grok-bot-house-template.test.ts, src/__tests__/unit/grok-bot-house-migrate.test.ts
Skills: house, suit-wear, record-map, activity-log
Setup: no house/ folder yet
Teardown: doctor checks it yes: House: PASS
Worn:

Card: boot
Plane: integration
From: integration
Digest: `BootOrchestrator.executeBootSequence` brings the engine up.
Plate: docs-site/docs/plates/boot.md
Plates: suit-wear
Entry: process start · SIGINT / SIGTERM
Exit: BootResult
Files: src/core/boot-orchestrator.ts
Skills: boot-orchestrator, suit-wear, hermes-agent, opencode
Setup:
Teardown:
Worn:

Card: governance
Plane: integration
From: integration
Digest: A proposal is deliberated inside the suit, filtered by Dynamo Solar, then merged.
Plate: docs-site/docs/plates/governance.md
Entry: proposal
Exit: vote · codex decision
Files: src/governance/governance-service.ts, src/governance/llm-governance-provider.ts
Skills: governance, enforcer, dynamo, confer
Setup:
Teardown:
Worn:

Card: memory-recall
Plane: domain
From: domain
Digest: Intent names one plate.
Plate: docs-site/docs/plates/memory-recall.md
Plates: record-map
Entry: intent
Exit: plate line · stamp file
Files: src/integrations/hooks/plates.cjs, src/__tests__/unit/plates.test.ts
Skills: memory-recall, record-map, repertoire, station-card
Setup:
Teardown:
Worn:

Card: orchestration
Plane: integration
From: integration
Digest: Each tool is its own call.
Plate: docs-site/docs/plates/orchestration.md
Plates: routing, processor
Entry: tool name · arguments
Exit: tool result · aside id
Files: src/mcps/orchestrator/server.ts
Skills: orchestration, routing, processor-pipeline, strategist
Setup:
Teardown:
Worn:

Card: processor
Plane: integration
From: integration
Digest: `ProcessorManager` runs the enabled pre processors, then the enabled post processors.
Plate: docs-site/docs/plates/processor.md
Plates: orchestration
Entry: tool · args · operation
Exit: pre result · post results
Files: src/processors/processor-manager.ts
Skills: processor-pipeline, orchestration, routing
Setup:
Teardown:
Worn:

Card: reporting
Plane: integration
From: integration
Digest: Logs become a report.
Plate: docs-site/docs/plates/reporting.md
Plates: activity-log, suit-organs
Entry: activity log · schedule · CLI request
Exit: report file · realtime health
Files: src/reporting/framework-reporting-system.ts
Skills: reporting, activity-log, suit-organs, write-home
Setup:
Teardown:
Worn:

Card: stamp-plate
Plane: domain
From: domain
Digest: A stamped plate is one drawing for one plane.
Plate: docs-site/docs/plates/stamp-plate.md
Plates: review
Entry: one plane that was opened
Exit: the plate the lens can open
Files: .agents/skills/stamp-plate/SKILL.md
Skills: stamp-plate, lens-gate, record-map, site-manual
Setup:
Teardown:
Worn:

Card: record-map
Plane: domain
From: domain
Digest: Five pages are what an agent writes, the package face is what a release writes, and the trail is what the suit writes under .xray.
Plate: docs-site/docs/plates/record-map.md
Plates: station-card, notes-page, reflection-page, site-manual, package-face, write-home, activity-log, session-capture, lens-page
Entry: which file
Exit: the one path to open
Files: docs-site/docs/plates/record-map.md, src/integrations/hooks/wake-cascade.cjs, src/integrations/hooks/session-note-index.cjs
Skills: record-map, station-card, notes-page, reflection-page, site-manual
Setup:
Teardown:
Worn:

Card: write-home
Plane: integration
From: integration
Digest: Every runtime write belongs under .xray, and the consumers and organs that still name logs/framework, docs/inference, or .opencode/logs have to be pointed at that home.
Plate: docs-site/docs/plates/write-home.md
Plates: activity-log, session-capture, inference-files, trail-state, suit-wear
Entry: activity log · inference files · cycle state
Exit: .xray/logs/activity.log · .xray/inference
Files: src/integrations/hooks/write-home.cjs
Skills: write-home, activity-log, session-capture, inference-files, trail-state
Setup:
Teardown:
Worn:

Card: activity-log
Plane: dev
From: dev
Digest: A tool hook appends one JSON line, and reporting, pulse, and monitor read that same file back.
Plate: docs-site/docs/plates/activity-log.md
Plates: write-home, reporting, suit-organs
Entry: pipeline hook · grok hook · hermes · logger
Exit: .xray/logs/activity.log
Files: src/core/activity-logger.ts
Skills: activity-log, write-home, reporting, suit-organs
Setup:
Teardown:
Worn:

Card: session-capture
Plane: dev
From: dev
Digest: Station writes latest-session.json when HEAD moves, and saveSessionInference writes the same kind of file for a graded session.
Plate: docs-site/docs/plates/session-capture.md
Plates: write-home, inference-files, suit-organs
Entry: station HEAD move · saveSessionInference
Exit: .xray/inference/latest-session.json
Files: src/inference/session-capture.ts
Skills: session-capture, write-home, inference-files, suit-organs
Setup:
Teardown:
Worn:

Card: suit-wear
Plane: dev
From: dev
Digest: Wear copies hooks, features.json, and the consumer gitignore into the project, and those copies still name the old log folder.
Plate: docs-site/docs/plates/suit-wear.md
Plates: suit-settings, write-home, package-face
Entry: wear / postinstall
Exit: consumer .xray/logs and .xray/inference
Files: src/core/features-config.ts, scripts/node/install-bridges.cjs, scripts/node/setup.cjs, src/integrations/cursor/hooks/xray-cloud-hook.sh
Skills: suit-wear, suit-settings, write-home, package-face
Setup:
Teardown:
Worn:

Card: suit-organs
Plane: integration
From: integration
Digest: Reporting, station, and the inference cycle are the organs that read or write the activity log and the session file.
Plate: docs-site/docs/plates/suit-organs.md
Plates: activity-log, session-capture, inference-files, trail-state
Entry: activity log · latest-session.json
Exit: report · heat line · cycle state
Files: src/reporting/framework-reporting-system.ts
Skills: suit-organs, activity-log, session-capture, inference-files, trail-state
Setup:
Teardown:
Worn:

Card: station-card
Plane: integration
From: integration
Digest: The station card is the one-line ticket at .xray/state/STATION.md.
Plate: docs-site/docs/plates/station-card.md
Plates: notes-page, record-map, kept-line
Entry: the card on disk
Exit: the same job continues
Files: src/integrations/hooks/station-hook-runtime.cjs, src/integrations/hooks/wake-cascade.cjs
Skills: station-card, notes-page, record-map, kept-line
Setup:
Teardown:
Worn:

Card: notes-page
Plane: integration
From: integration
Digest: Notes are the body the station card cannot hold.
Plate: docs-site/docs/plates/notes-page.md
Plates: station-card, record-map
Entry: the pickup line
Exit: the next seat continues
Files: src/integrations/hooks/station-hook-runtime.cjs, src/integrations/hooks/session-note-index.cjs
Skills: notes-page, station-card, record-map, pickup-stamp
Setup:
Teardown:
Worn:

Card: reflection-page
Plane: dev
From: dev
Digest: A reflection is one episode written under docs/reflections.
Plate: docs-site/docs/plates/reflection-page.md
Plates: record-map
Entry: a session ends
Exit: one reflection file
Files: src/inference/inference-accumulator.ts
Skills: reflection-page, record-map, inference-files, storyteller
Setup:
Teardown:
Worn:

Card: site-manual
Plane: dev
From: dev
Digest: The published manual is docs-site/docs.
Plate: docs-site/docs/plates/site-manual.md
Plates: record-map
Entry: the product changed
Exit: the manual matches the product
Files: docs-site/docs/introduction.md, docs-site/docs/index.md, docs-site/docs/full-reference.md, docs-site/docs/guides/features-since-3.1.md
Skills: site-manual, record-map, package-face, tech-writer
Setup:
Teardown:
Worn:

Card: package-face
Plane: dev
From: dev
Digest: A release writes the package face, and the agent reads it.
Plate: docs-site/docs/plates/package-face.md
Plates: record-map, suit-wear
Entry: a release runs
Exit: the published package
Files: package.json, grok-bot/README.md, grok-bot/llms.txt, grok-bot/CHANGELOG.md, src/cli/index.ts, src/cli/commands/plugin-commands.ts, src/__tests__/unit/plugin-commands.test.ts
Skills: package-face, record-map, suit-wear, tech-writer
Setup:
Teardown:
Worn:

Card: suit-settings
Plane: dev
From: dev
Digest: Suit settings are features, config, and codex.
Plate: docs-site/docs/plates/suit-settings.md
Plates: suit-wear, record-map
Entry: the suit is worn
Exit: the agent reads settings
Files: xray/features.json
Skills: suit-settings, suit-wear, record-map
Setup:
Teardown:
Worn:

Card: trail-state
Plane: integration
From: integration
Digest: The suit writes its trail under .xray.
Plate: docs-site/docs/plates/trail-state.md
Plates: write-home, suit-organs
Entry: a wake starts
Exit: state under .xray
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: trail-state, write-home, suit-organs, station-card
Setup:
Teardown:
Worn:

Card: inference-files
Plane: dev
From: dev
Digest: Inference cycle state already lives under .xray/inference.
Plate: docs-site/docs/plates/inference-files.md
Plates: session-capture, write-home, suit-organs
Entry: a cycle closes
Exit: files under .xray/inference
Files: src/inference/inference-accumulator.ts
Skills: inference-files, session-capture, write-home, suit-organs
Setup:
Teardown:
Worn:

Card: grok-compact
Plane: integration
From: integration
Digest: Grok PreCompact runs session-start.js with the pre_compact event.
Plate: docs-site/docs/plates/grok-compact.md
Plates: payload-heat, cursor-compact, work-fresh
Entry: a compact is about to happen
Exit: the station card is written
Files: src/integrations/grok/hooks/session-start.js
Skills: grok-compact, payload-heat, cursor-compact, work-fresh
Setup:
Teardown:
Worn:

Card: payload-heat
Plane: integration
From: integration
Digest: buildSessionBootPayload calls applyStationHeat and writes the station card.
Plate: docs-site/docs/plates/payload-heat.md
Plates: station-heat, pickup-stamp
Entry: the compact event
Exit: STATION.md is on disk
Files: src/integrations/grok/hooks/grok-hook-utils.js
Skills: payload-heat, station-heat, pickup-stamp, grok-compact
Setup:
Teardown:
Worn:

Card: station-heat
Plane: integration
From: integration
Digest: On a compact event applyStationHeat stamps the notes pickup line.
Plate: docs-site/docs/plates/station-heat.md
Plates: pickup-stamp, notes-page
Entry: the compact hook
Exit: the pickup matches intent
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: station-heat, pickup-stamp, notes-page, station-card
Setup:
Teardown:
Worn:

Card: pickup-stamp
Plane: integration
From: integration
Digest: stampNotesPickup writes one pickup line and leaves the rest of NOTES.md alone.
Plate: docs-site/docs/plates/pickup-stamp.md
Plates: notes-page
Entry: the intent line
Exit: the body is untouched
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: pickup-stamp, notes-page, station-heat
Setup:
Teardown:
Worn:

Card: cursor-compact
Plane: integration
From: integration
Digest: Cursor preCompact writes the station card and cannot block the compact.
Plate: docs-site/docs/plates/cursor-compact.md
Plates: payload-heat, station-heat
Entry: the host fires preCompact
Exit: the compact continues
Files: src/integrations/cursor/hooks/pre-compact.js
Skills: cursor-compact, payload-heat, station-heat, grok-compact
Setup:
Teardown:
Worn:

Card: work-fresh
Plane: integration
From: integration
Digest: Refresh writes one Fresh line from git and the published package.
Plate: docs-site/docs/plates/work-fresh.md
Plates: station-card, grok-compact
Entry: the repo and the published version
Exit: one line on the station card
Files: src/nucleus/work-freshness.mjs
Skills: work-fresh, station-card, grok-compact, kept-line
Setup:
Teardown:
Worn:

Card: kept-line
Plane: integration
From: integration
Digest: A station rewrite keeps one Fresh line and drops the copies.
Plate: docs-site/docs/plates/kept-line.md
Plates: station-card, work-fresh
Entry: the card already on disk
Exit: one Fresh line in the stock card
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: kept-line, station-card, work-fresh
Setup:
Teardown:
Worn:

Card: lens-gate
Plane: integration
From: integration
Digest: A search inside the current card runs.
Plate: docs-site/docs/plates/lens-gate.md
Plates: pre-tool
Entry: the tool call and the file path
Exit: the card for the plane you are on
Files: src/integrations/hooks/goggles-pipeline.mjs, src/__tests__/unit/goggles-pipeline.test.ts
Skills: lens-gate, pre-tool, lens-page, stamp-plate
Setup:
Teardown:
Worn:

Card: pre-tool
Plane: integration
From: integration
Digest: The tool hook is where the lens gate runs.
Plate: docs-site/docs/plates/pre-tool.md
Plates: lens-gate
Entry: the tool name and its arguments
Exit: deny when the lens gate denies
Files: src/integrations/grok/hooks/pre-tool-use.js
Skills: pre-tool, lens-gate, delegation-gate
Setup:
Teardown:
Worn:

Card: lens-page
Plane: integration
From: integration
Digest: The lens page is the card for one plane.
Plate: docs-site/docs/plates/lens-page.md
Plates: record-map, lens-gate
Entry: one plane name
Exit: the skill and the plates on that card
Files: src/integrations/hooks/goggles-pipeline.mjs
Skills: lens-page, record-map, lens-gate
Setup:
Teardown:
Worn:

Card: centrifuge
Plane: integration
From: integration
Digest: One wake is one turn.
Plate: docs-site/docs/plates/centrifuge.md
Plates: station-card, goggles
Entry: GOGGLES
Exit: DOMAIN
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: centrifuge, station-card, inference-cycle
Setup:
Teardown: JUDGEMENT    LOOP                   STATE       PAYMENTS off                STATION                    · off fixed                            FOUNDRY      · fixed MEMORY
Worn:

Card: repertoire
Plane: dev
From: dev
Digest: The memory organ matches named laws.
Plate: docs-site/docs/plates/repertoire.md
Entry: a task and its signals
Exit: one law, or none
Files: src/memory-routing
Skills: repertoire, memory-recall, record-map, governance
Setup:
Teardown:
Worn:

Card: dynamo
Plane: dev
From: dev
Digest: Dynamo is the external governance service.
Plate: docs-site/docs/plates/dynamo.md
Entry: a proposal
Exit: pass, revision, or reject
Files: docs-site/docs/guides/self-hosting-dynamo.md
Skills: dynamo, governance, enforcer, confer
Setup:
Teardown:
Worn:

Card: foundry
Plane: ecosystem
From: ecosystem
Digest: The mill builds and ships a suit.
Plate: docs-site/docs/plates/foundry.md
Entry: a version bump
Exit: the registry lists that version
Files: scripts/foundry, scripts/foundry/release.mjs
Skills: foundry, suit-wear, package-face, consumer-mcp
Setup:
Teardown:
Worn:

Card: delegation-gate
Plane: integration
From: integration
Digest: The pre-tool gate for every host.
Plate: docs-site/docs/plates/delegation-gate.md
Entry: a tool call
Exit: allow, or deny
Files: src/nucleus/delegation-gate.ts
Skills: delegation-gate, temperament, orchestration, routing
Setup:
Teardown:
Worn:

Card: temperament
Plane: integration
From: integration
Digest: Ceremony scales by host.
Plate: docs-site/docs/plates/temperament.md
Entry: a host
Exit: frontier warns, guided denies
Files: src/nucleus/suit-temperament.ts
Skills: temperament, delegation-gate, confer, orchestrator
Setup:
Teardown:
Worn:

Card: asides
Plane: integration
From: integration
Digest: A user aside is one parallel track.
Plate: docs-site/docs/plates/asides.md
Entry: a named track
Exit: that track, or the main line
Files: src/nucleus/user-aside.ts
Skills: asides, orchestration, station-card, record-map
Setup:
Teardown:
Worn:

Card: inference-cycle
Plane: dev
From: dev
Digest: The inference cycle turns a corpus into a proposal.
Plate: docs-site/docs/plates/inference-cycle.md
Entry: a session corpus
Exit: a governed proposal, or no change
Files: src/inference/inference-cycle.ts
Skills: inference-cycle, inference-files, session-capture, repertoire
Setup:
Teardown:
Worn:

Card: hermes
Plane: integration
From: integration
Digest: Hermes wears the suit through its bridge.
Plate: docs-site/docs/plates/hermes.md
Entry: a Hermes session
Exit: the suit on that host
Files: src/integrations/hermes-agent
Skills: hermes, hermes-agent, boot-orchestrator, consumer-mcp
Setup:
Teardown:
Worn:

Card: openclaw
Plane: integration
From: integration
Digest: OpenClaw wears the suit through its plugin.
Plate: docs-site/docs/plates/openclaw.md
Entry: an OpenClaw session
Exit: the suit on that host
Files: src/integrations/openclaw
Skills: openclaw, boot-orchestrator, consumer-mcp, hermes
Setup:
Teardown:
Worn:

Card: opencode
Plane: dev
From: dev
Digest: OpenCode install writes the plugin.
Plate: docs-site/docs/plates/opencode.md
Entry: an install
Exit: the OpenCode plugin on disk
Files: src/cli/commands/opencode-install.ts
Skills: opencode, boot-orchestrator, consumer-mcp, orchestrator
Setup:
Teardown:
Worn:

Card: consumer-mcp
Plane: dev
From: dev
Digest: The worn checkout lists seven MCP servers.
Plate: docs-site/docs/plates/consumer-mcp.md
Entry: a worn checkout
Exit: the seven servers
Files: src/mcps, .mcp.json
Skills: consumer-mcp, boot-orchestrator, hermes, openclaw
Setup:
Teardown:
Worn:

Card: confer
Plane: integration
From: integration
Digest: Confer stays off unless it is enabled.
Plate: docs-site/docs/plates/confer.md
Entry: a synthesis checkpoint
Exit: skipped, unless it is enabled
Files: src/nucleus/confer.ts
Skills: confer, governance, code-review, researcher
Setup:
Teardown:
Worn:
