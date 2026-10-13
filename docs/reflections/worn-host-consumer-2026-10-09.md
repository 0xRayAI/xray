---
story_type: reflection
date: 2026-10-09
codex_terms: [7, 67, 68]
---

# The worn host, after the pack

Two local commits on `cursor/wear-grok-report` hold this episode: `dca96e65e` and `0ef59afd9`. Both are arch10x[bot]. Neither is pushed. Package version stays 4.0.41. The context window closed before this page existed, so the page is rebuilt from those commits, the logs in `/tmp/xray-env-e2e`, and the constraints already written down. The live turns are gone. The disk record was enough.

Net: a green factory suite can sit on a packed consumer that is wrong. The thing under test is the tarball the host suite installs, plus that host's real binary and its home config.

This page records the episode. It does not mint a repertoire law.

## What was tried

The four consumer suites pack this worktree and install it into a temp project: `scripts/test/test-opencode-e2e.mjs`, `test-hermes-e2e.mjs`, `test-grok-cli-e2e.mjs`, `test-openclaw-e2e.mjs`. They had not been run for a long while. Before them, a fresh Grok wear at `/private/tmp/xray-wear-fix` turned confer on, left synthesis off, and sent one `analyze-complexity` with six tasks.

The size wire held on that install. Plan complexity was 30. `requiresPhasedPlan` was true. Phase 1 was pending spawn consults: 1.1 researcher, 1.2 architect-tools, 1.3 code-review. Ask-file count was zero. `synthesisCheckpoint` was false. The project Grok config launched the worn CLI. The factory CLI was absent from that config. `npx 0xray report --session --ci` in that directory returned 50 events, including `lead-dev-plan-persisted`.

First pack run, before the second commit: OpenCode 42 passed, 0 failed. Grok 62 passed, 0 failed, 1 skipped. Hermes 45 passed, 1 failed. OpenClaw 88 passed, 1 failed, 4 skipped.

`0xray confer on` sets `confer.enabled` and `confer.on_synthesis` and leaves the synthesis block disabled. The three phase-1 todos are the size wire. The quorum and the ask files stay on a synthesis checkpoint. That checkpoint was left off on purpose.

## What failed

Hermes `bridge codex-check (bad)` returned `passed=true` with `enforcerRan` false. The bridge loads `ValidatorRegistry` from `dist/enforcement/index.js`. That file was absent: `src/enforcement/index.ts` had never been written, so the parent barrel was missing even though `src/enforcement/validators/index.ts` already exported the registry. With the registry unloaded, only the quality gate ran, and the quality gate allows a console method call. `ConsoleLogUsageValidator` was a stub on top of that hole. It returned success for a real console method. It failed only when the snippet contained one planted `frameworkLogger` fragment.

OpenClaw reported its first stderr line and treated that line as the failure: `plugins.allow is empty; discovered non-bundled plugins may auto-load: kimi`. That line is a warning printed on every `openclaw` invocation on this machine. Under it, token-only WebSocket `chat.send` returns `missing scope: operator.write`, and the suite falls back to `openclaw agent`. Without `--agent` the CLI exits `No target session selected`. With `--agent main --model xai/grok-4.5` agent `main` rejects the override. Agent `main` answers on `opencode-cli/big-pickle`. The suite kept the first 80–120 characters of stderr, so the exit reason never reached the log. Four chat phases skipped. Tool-calling failed. The kimi warning was the whole story the log could tell.

The write hook denies a source line that contains a literal console-method call. The unit test that proves the rule has to split the method name across a string concatenation. Codex 7 is doing that. A test file is still source.

Earlier on the same branch, Grok wear launched the factory CLI. User `config.toml` of the same server name beats `.mcp.json`. `grok mcp add` and `grok plugins trust` are absent on Grok 1.0.50, and the old installer swallowed those errors. `report --session` read a package-relative activity log and dropped lines that carried a ` | {json}` suffix, so a real session came back as zero events. After wear, confer stayed off until `features.json` was edited by hand.

The Grok suite skip is still there after the wear fix: `active hook execution — no structured decision output (may be env-dependent)`. The same run denied a codex-violating write and allowed a clean read. That skip was left.

This page is late. The compact ran while the lesson was still only in the turn. The commits and the logs survived it.

## What worked

`dca96e65e` fastens Grok at the installed CLI. Wear writes the project `.grok/config.toml` with `scopedMcpLaunch` pointed at `node_modules/0xray/dist/cli/index.js` when that file is present, and appends the folder to `$HOME/.grok/trusted_folders.toml`. It strips only the suit `[mcp_servers.xray-*]` blocks, so repertoire, goggles, and plugins stay. The session report reads `logs/framework/activity.log` from the consumer cwd and accepts the pipe suffix. `0xray confer on|off` is a real command. On sets the two confer flags and does not enable synthesis. Off clears `confer.enabled`, `confer.on_synthesis`, and `confer_on_synthesis`. A missing confer key stays off. Schema text that said the missing key defaults on was corrected on this branch. `loadConferConfig` was left alone, because flipping that default is the #138 failure.

`0ef59afd9` gives the Hermes bridge an enforcement entry and makes the console-usage rule look for a console method. `src/enforcement/index.ts` re-exports `ValidatorRegistry` and `globalValidatorRegistry`. `ConsoleLogUsageValidator` strips comments and fails on `console.(log|debug|info|warn|error|trace)`. Empty code and clean code keep their old success messages. The OpenClaw helper calls `openclaw agent --thinking low --timeout … --agent main --message …` and passes no model flag, so the agent keeps `opencode-cli/big-pickle`. The reported error drops the `plugins.allow is empty` line, and the exit reason can show through.

Retest after that commit and a rebuild: Hermes 46 passed, 0 failed, 0 skipped (`/tmp/xray-env-e2e/hermes2.log`). The bad snippet caught three rules: `clean-debug-logs`, `console-log-usage`, `error-resolution`. The clean snippet passed. OpenClaw 98 passed, 0 failed, 0 skipped (`/tmp/xray-env-e2e/openclaw2.log`). The live agent answered 4, walked 56 then 60 then a number that is not prime, and answered Monday. OpenCode and Grok were already green and were not run again.

A direct bridge spawn against the worktree dist matched the suite: bad snippet `passed` false and `enforcerRan` true, clean snippet `passed` true.

## Left where it was

Synthesis stays `{enabled:false, every_n_gates:12, every_n_turns:0, every_n_todos_completed:0}`. Ask files and quorum voting wait for that checkpoint. #138 stays open. #243 stays unmerged. Issue 171 stays open. Phase E stays unstarted. No version bump. No npm publish. No push until the fleet blackout ends on Sunday 2026-10-11. Factory `main` stays `d309bb32c`. `.xray/state` on the worktree stays untracked.

The home OpenClaw file still has no `plugins.allow`. The duplicate `xray-pre-tool` id still resolves to `/Users/blaze/dev/xray/src/integrations/openclaw/plugin/xray-pre-tool/index.js` on the factory tree. Those warnings printed through the green retest. The home file was not edited, and the gateway was not restarted.

Hermes phase 0 runs `hermes plugins enable xray-hermes` against the real Hermes home when the plugin is visible. `hermes -z` is defined in that suite and is not called. Postinstall still only links the vendored repertoire and prints `Run npx 0xray wear`.

One known score shape is still true and is not a wire failure. Each of the six tasks scored 7 with `recommendedStrategy: single-agent`, while the plan scored 30 and `requiresPhasedPlan` was true. The wire keys off the plan score and the task count.

## What to do next time

Write this page in the same turn as the retest. A station card continues the job. It does not keep the episode. The loader hears a reflection only when the markdown has a Tried, a Failed, or a Worked section, and it keeps about four sentences of each. Put the lesson in those opening sentences. The rest of the page is for the person who has to pick the work up after a compact.
