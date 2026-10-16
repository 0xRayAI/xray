quiet (match)

Plane: ground
From:
Digest: Home. The dev plane.
Plate:
Entry:
Exit:
Files: src, grok-bot/OP-PROC.md, grok-bot/LEXICON.md, src/opencode/agents, AGENTS.md, src/integrations, package.json, scripts/foundry
Skills: SKILLS.md
Setup:
Teardown:
Worn:

Plane: routing
From: ground
Digest: Task text becomes an agent.
Plate: docs-site/docs/plates/routing.md
Plates: orchestration, processor
Entry: task text · context · thresholds
Exit: agent · strategy · adjusted score · file
Files: src/nucleus/thin-dispatch.ts
Skills: .agents/skills/routing/SKILL.md
Setup:
Teardown:
Worn: dist/nucleus/thin-dispatch.js

Plane: house
From: ground
Digest: A state flow plate: the stages a house goes through before doctor says House: PASS.
Plate: docs-site/docs/plates/house.md
Plates: suit-wear
Entry: EMPTY
Exit: DOCTOR · House: PASS?
Files: grok-bot/lib/seat-doctor.cjs, grok-bot/templates/house/fleet/WAKE-ROUTINE.md, grok-bot/templates/house/HOUSE.md, src/__tests__/unit/grok-bot-house-template.test.ts, src/__tests__/unit/grok-bot-house-migrate.test.ts
Skills: .agents/skills/house/SKILL.md
Setup: no house/ folder yet
Teardown: doctor checks it yes: House: PASS
Worn:

Plane: boot
From: ground
Digest: `BootOrchestrator.executeBootSequence` brings the engine up.
Plate: docs-site/docs/plates/boot.md
Plates: suit-wear
Entry: process start · SIGINT / SIGTERM
Exit: BootResult
Files: src/core/boot-orchestrator.ts
Skills: src/skills/boot-orchestrator/SKILL.md
Setup:
Teardown:
Worn: dist/core/boot-orchestrator.js

Plane: governance
From: ground
Digest: A proposal is deliberated inside the suit, filtered by Dynamo Solar, then merged.
Plate: docs-site/docs/plates/governance.md
Entry: proposal
Exit: vote · codex decision
Files: src/governance/governance-service.ts, src/governance/llm-governance-provider.ts
Skills: .agents/skills/governance/SKILL.md
Setup:
Teardown:
Worn: dist/governance/governance-service.js

Plane: memory-recall
From: ground
Digest: Intent names one plate.
Plate: docs-site/docs/plates/memory-recall.md
Plates: record-map
Entry: intent
Exit: plate line · stamp file
Files: src/integrations/hooks/plates.cjs, src/__tests__/unit/plates.test.ts
Skills: .agents/skills/memory-recall/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/plates.cjs

Plane: orchestration
From: ground
Digest: Each tool is its own call.
Plate: docs-site/docs/plates/orchestration.md
Plates: routing, processor
Entry: tool name · arguments
Exit: tool result · aside id
Files: src/mcps/orchestrator/server.ts
Skills: .agents/skills/orchestration/SKILL.md
Setup:
Teardown:
Worn: dist/mcps/orchestrator/server.js

Plane: processor
From: ground
Digest: `ProcessorManager` runs the enabled pre processors, then the enabled post processors.
Plate: docs-site/docs/plates/processor.md
Plates: orchestration
Entry: tool · args · operation
Exit: pre result · post results
Files: src/processors/processor-manager.ts
Skills: src/skills/processor-pipeline/SKILL.md
Setup:
Teardown:
Worn: dist/processors/processor-manager.js

Plane: reporting
From: ground
Digest: Logs become a report.
Plate: docs-site/docs/plates/reporting.md
Plates: activity-log, suit-organs
Entry: activity log · schedule · CLI request
Exit: report file · realtime health
Files: src/reporting/framework-reporting-system.ts
Skills: .agents/skills/reporting/SKILL.md
Setup:
Teardown:
Worn: dist/reporting/framework-reporting-system.js

Plane: stamp-plate
From: ground
Digest: A stamped plate is one drawing for one plane.
Plate: docs-site/docs/plates/stamp-plate.md
Plates: review
Entry: one plane that was opened
Exit: the plate the lens can open
Files: .agents/skills/stamp-plate/SKILL.md
Skills: .agents/skills/stamp-plate/SKILL.md
Setup:
Teardown:
Worn:

Plane: record-map
From: ground
Digest: Five pages are what an agent writes, the package face is what a release writes, and the trail is what the suit writes under .xray.
Plate: docs-site/docs/plates/record-map.md
Plates: station-card, notes-page, reflection-page, site-manual, package-face, write-home, activity-log, session-capture, lens-page
Entry: which file
Exit: the one path to open
Files: docs-site/docs/plates/record-map.md, src/integrations/hooks/wake-cascade.cjs, src/integrations/hooks/session-note-index.cjs
Skills: .agents/skills/record-map/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/wake-cascade.cjs

Plane: write-home
From: ground
Digest: Every runtime write belongs under .xray, and the consumers and organs that still name logs/framework, docs/inference, or .opencode/logs have to be pointed at that home.
Plate: docs-site/docs/plates/write-home.md
Plates: activity-log, session-capture, inference-files, trail-state, suit-wear
Entry: activity log · inference files · cycle state
Exit: .xray/logs/activity.log · .xray/inference
Files: src/integrations/hooks/write-home.cjs
Skills: .agents/skills/write-home/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/write-home.cjs

Plane: activity-log
From: ground
Digest: A tool hook appends one JSON line, and reporting, pulse, and monitor read that same file back.
Plate: docs-site/docs/plates/activity-log.md
Plates: write-home, reporting, suit-organs
Entry: pipeline hook · grok hook · hermes · logger
Exit: .xray/logs/activity.log
Files: src/core/activity-logger.ts
Skills: .agents/skills/activity-log/SKILL.md
Setup:
Teardown:
Worn: dist/core/activity-logger.js

Plane: session-capture
From: ground
Digest: Station writes latest-session.json when HEAD moves, and saveSessionInference writes the same kind of file for a graded session.
Plate: docs-site/docs/plates/session-capture.md
Plates: write-home, inference-files, suit-organs
Entry: station HEAD move · saveSessionInference
Exit: .xray/inference/latest-session.json
Files: src/inference/session-capture.ts
Skills: .agents/skills/session-capture/SKILL.md
Setup:
Teardown:
Worn: dist/inference/session-capture.js

Plane: suit-wear
From: ground
Digest: Wear copies hooks, features.json, and the consumer gitignore into the project, and those copies still name the old log folder.
Plate: docs-site/docs/plates/suit-wear.md
Plates: suit-settings, write-home, package-face
Entry: wear / postinstall
Exit: consumer .xray/logs and .xray/inference
Files: src/core/features-config.ts, scripts/node/install-bridges.cjs, scripts/node/setup.cjs, src/integrations/cursor/hooks/xray-cloud-hook.sh
Skills: .agents/skills/suit-wear/SKILL.md
Setup:
Teardown:
Worn: dist/core/features-config.js

Plane: suit-organs
From: ground
Digest: Reporting, station, and the inference cycle are the organs that read or write the activity log and the session file.
Plate: docs-site/docs/plates/suit-organs.md
Plates: activity-log, session-capture, inference-files, trail-state
Entry: activity log · latest-session.json
Exit: report · heat line · cycle state
Files: src/reporting/framework-reporting-system.ts
Skills: .agents/skills/suit-organs/SKILL.md
Setup:
Teardown:
Worn: dist/reporting/framework-reporting-system.js

Plane: station-card
From: ground
Digest: The station card is the one-line ticket at .xray/state/STATION.md.
Plate: docs-site/docs/plates/station-card.md
Plates: notes-page, record-map, kept-line
Entry: the card on disk
Exit: the same job continues
Files: src/integrations/hooks/station-hook-runtime.cjs, src/integrations/hooks/wake-cascade.cjs
Skills: .agents/skills/station-card/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: notes-page
From: ground
Digest: Notes are the body the station card cannot hold.
Plate: docs-site/docs/plates/notes-page.md
Plates: station-card, record-map
Entry: the pickup line
Exit: the next seat continues
Files: src/integrations/hooks/station-hook-runtime.cjs, src/integrations/hooks/session-note-index.cjs
Skills: .agents/skills/notes-page/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: reflection-page
From: ground
Digest: A reflection is one episode written under docs/reflections.
Plate: docs-site/docs/plates/reflection-page.md
Plates: record-map
Entry: a session ends
Exit: one reflection file
Files: src/inference/inference-accumulator.ts
Skills: .agents/skills/reflection-page/SKILL.md
Setup:
Teardown:
Worn: dist/inference/inference-accumulator.js

Plane: site-manual
From: ground
Digest: The published manual is docs-site/docs.
Plate: docs-site/docs/plates/site-manual.md
Plates: record-map
Entry: the product changed
Exit: the manual matches the product
Files: docs-site/docs/introduction.md, docs-site/docs/index.md, docs-site/docs/full-reference.md, docs-site/docs/guides/features-since-3.1.md
Skills: .agents/skills/site-manual/SKILL.md
Setup:
Teardown:
Worn:

Plane: package-face
From: ground
Digest: A release writes the package face, and the agent reads it.
Plate: docs-site/docs/plates/package-face.md
Plates: record-map, suit-wear
Entry: a release runs
Exit: the published package
Files: package.json, grok-bot/README.md, grok-bot/llms.txt, grok-bot/CHANGELOG.md, src/cli/index.ts, src/cli/commands/plugin-commands.ts, src/__tests__/unit/plugin-commands.test.ts
Skills: .agents/skills/package-face/SKILL.md
Setup:
Teardown:
Worn: dist/cli/index.js

Plane: suit-settings
From: ground
Digest: Suit settings are features, config, and codex.
Plate: docs-site/docs/plates/suit-settings.md
Plates: suit-wear, record-map
Entry: the suit is worn
Exit: the agent reads settings
Files: xray/features.json
Skills: .agents/skills/suit-settings/SKILL.md
Setup:
Teardown:
Worn:

Plane: trail-state
From: ground
Digest: The suit writes its trail under .xray.
Plate: docs-site/docs/plates/trail-state.md
Plates: write-home, suit-organs
Entry: a wake starts
Exit: state under .xray
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: .agents/skills/trail-state/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: inference-files
From: ground
Digest: Inference cycle state already lives under .xray/inference.
Plate: docs-site/docs/plates/inference-files.md
Plates: session-capture, write-home, suit-organs
Entry: a cycle closes
Exit: files under .xray/inference
Files: src/inference/inference-accumulator.ts
Skills: .agents/skills/inference-files/SKILL.md
Setup:
Teardown:
Worn: dist/inference/inference-accumulator.js

Plane: grok-compact
From: ground
Digest: Grok PreCompact runs session-start.js with the pre_compact event.
Plate: docs-site/docs/plates/grok-compact.md
Plates: payload-heat, cursor-compact, work-fresh
Entry: a compact is about to happen
Exit: the station card is written
Files: src/integrations/grok/hooks/session-start.js
Skills: .agents/skills/grok-compact/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/grok/hooks/session-start.js

Plane: payload-heat
From: ground
Digest: buildSessionBootPayload calls applyStationHeat and writes the station card.
Plate: docs-site/docs/plates/payload-heat.md
Plates: station-heat, pickup-stamp
Entry: the compact event
Exit: STATION.md is on disk
Files: src/integrations/grok/hooks/grok-hook-utils.js
Skills: .agents/skills/payload-heat/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/grok/hooks/grok-hook-utils.js

Plane: station-heat
From: ground
Digest: On a compact event applyStationHeat stamps the notes pickup line.
Plate: docs-site/docs/plates/station-heat.md
Plates: pickup-stamp, notes-page
Entry: the compact hook
Exit: the pickup matches intent
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: .agents/skills/station-heat/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: pickup-stamp
From: ground
Digest: stampNotesPickup writes one pickup line and leaves the rest of NOTES.md alone.
Plate: docs-site/docs/plates/pickup-stamp.md
Plates: notes-page
Entry: the intent line
Exit: the body is untouched
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: .agents/skills/pickup-stamp/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: cursor-compact
From: ground
Digest: Cursor preCompact writes the station card and cannot block the compact.
Plate: docs-site/docs/plates/cursor-compact.md
Plates: payload-heat, station-heat
Entry: the host fires preCompact
Exit: the compact continues
Files: src/integrations/cursor/hooks/pre-compact.js
Skills: .agents/skills/cursor-compact/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/cursor/hooks/pre-compact.js

Plane: work-fresh
From: ground
Digest: Refresh writes one Fresh line from git and the published package.
Plate: docs-site/docs/plates/work-fresh.md
Plates: station-card, grok-compact
Entry: the repo and the published version
Exit: one line on the station card
Files: src/nucleus/work-freshness.mjs
Skills: .agents/skills/work-fresh/SKILL.md
Setup:
Teardown:
Worn: dist/nucleus/work-freshness.mjs

Plane: kept-line
From: ground
Digest: A station rewrite keeps one Fresh line and drops the copies.
Plate: docs-site/docs/plates/kept-line.md
Plates: station-card, work-fresh
Entry: the card already on disk
Exit: one Fresh line in the stock card
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: .agents/skills/kept-line/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/station-hook-runtime.cjs

Plane: lens-gate
From: ground
Digest: A search names one plane or it stops.
Plate: docs-site/docs/plates/lens-gate.md
Plates: pre-tool
Entry: the tool name and the spoken text
Exit: allow on one name, otherwise stop
Files: src/integrations/hooks/goggles-pipeline.mjs, src/__tests__/unit/goggles-pipeline.test.ts
Skills: .agents/skills/lens-gate/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/goggles-pipeline.mjs

Plane: pre-tool
From: ground
Digest: The tool hook is where the lens gate runs.
Plate: docs-site/docs/plates/pre-tool.md
Plates: lens-gate
Entry: the tool name and its arguments
Exit: deny when the lens gate denies
Files: src/integrations/grok/hooks/pre-tool-use.js
Skills: .agents/skills/pre-tool/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/grok/hooks/pre-tool-use.js

Plane: lens-page
From: ground
Digest: The lens page is the card for one plane.
Plate: docs-site/docs/plates/lens-page.md
Plates: record-map, lens-gate
Entry: one plane name
Exit: the skill and the plates on that card
Files: src/integrations/hooks/goggles-pipeline.mjs
Skills: .agents/skills/lens-page/SKILL.md
Setup:
Teardown:
Worn: dist/integrations/hooks/goggles-pipeline.mjs

Plane: centrifuge
From: ground
Digest: One wake is one turn.
Plate: docs-site/docs/plates/centrifuge.md
Plates: station-card, goggles
Entry: GOGGLES
Exit: DOMAIN
Files: src/integrations/hooks/station-hook-runtime.cjs
Skills: .agents/skills/centrifuge/SKILL.md
Setup:
Teardown: JUDGEMENT    LOOP                   STATE       PAYMENTS off                STATION                    · off fixed                            FOUNDRY      · fixed MEMORY
Worn: dist/integrations/hooks/station-hook-runtime.cjs
