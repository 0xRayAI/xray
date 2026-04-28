# Release Tweet Format Guide

## For AI agents generating release tweets after publishing.

## Canonical Format

```
🎉 0xRay v{VERSION} is LIVE - {THEME}!
{EMOJI} {feature - consumer benefit, max 90 chars}
{EMOJI} {feature - consumer benefit, max 90 chars}
{EMOJI} {feature - consumer benefit, max 90 chars}
{EMOJI} {feature - consumer benefit, max 90 chars}
{EMOJI} {feature - consumer benefit, max 90 chars}
```
npm install strray-ai@latest
```
What 0xRay is: {one sentence positioning - what it does for the user}
#{HASHTAGS}
```

## Rules

1. **Header**: `🎉 0xRay v{VERSION} is LIVE - {THEME}!` — theme is 2-4 words summarizing the release
2. **5 bullets** with emoji role markers:
   - ✅ = verified / tested / passing
   - 🔧 = bug fix / repair
   - ✨ = new feature / capability
   - 🛡️ = guardrail / security / compliance
   - 📦 = package / deliverable / integration
   - 🧪 = test coverage / E2E / validation
   - 📚 = docs / documentation
3. **Each bullet**: consumer benefit, not internal changelog. What the user GETS, not what we changed.
4. **Code block**: always ````npm install strray-ai@latest```` — never changes
5. **Positioning**: one sentence answering "what is this for me?" — varies by release focus
6. **Hashtags**: `#0xRay` always, then 2-4 from `#AIOps #DevTools #SelfHealing #NPM #E2E #OpenSource`

## Examples

### v1.22.27 — E2E testing focus
```
🎉 0xRay v1.22.27 is LIVE - E2E Integration Testing!
✅ 144 E2E tests against live AI runtimes (not mocks - real gateways, real models)
🔧 OpenClaw handshake fix - 3 bugs found that 2,533 unit tests missed
🧪 Hermes + OpenClaw full lifecycle: chat orchestration, multi-turn sessions, hooks
🛡️ API server auth, CORS, tool event forwarding, offline event queuing
📦 Hermes bridge: codex enforcement, routing, post-processors verified
```
npm install strray-ai@latest
```
What 0xRay is: guardrails for AI dev - hallucination prevention, codex compliance, structured tool routing via OpenCode/Hermes/OpenClaw.
#0xRay #AIOps #DevTools #SelfHealing #NPM
```

### v1.22.15 — Version standardization focus
```
🎉 0xRay v1.22.15 is LIVE - Universal Version Standardization!
✨ Smart merge opencode.json (preserves settings, adds new agents)
🛡️ Nudge Watchdog - detects stuck AI patterns (think-loops, syntax-loops)
📦 Community MCP Registry (13 curated MCPs: xmcp, github-mcp, discord-mcp...)
🧹 Context-aware reflection hook before compaction
```
npm install strray-ai@latest
```
What 0xRay is: middleware that makes AI agents governed & compliance-aware via OpenCode/Hermes/OpenClaw.
#0xRay #AIOps #DevTools #SelfHealing #NPM
```

### v1.22.14 — Production readiness focus
```
🚀 StringRay v1.22.14 is live
✨ Production-ready MCPs + complete docs
✅ Fixed 22 pipeline tests - all green
🛡️ New voting/metrics/security systems
📚 Deprecated enforcer/orchestrator
🔧 Memory leak fixes + ES6 imports
```
npm install strray-ai@latest
```
What 0xRay is: your AI dev workflow, leveled up.
#StringRay #AI #DevTools #OpenSource
```

## How to Generate

After `npm publish` completes:

1. Read `git log v{PREV_VERSION}..HEAD --oneline` for commit history
2. Identify the theme (most impactful change or pattern across commits)
3. Pick 5 consumer-facing features from the commits
4. Assign emoji role markers by what kind of change each is
5. Write bullets as benefits ("X now works" not "fixed X")
6. Write positioning sentence based on what this release means for users
7. Save to `tweets/v{VERSION}.md`

## File Location

Always save to: `tweets/v{VERSION}.md`

## Tone

Punchy. Direct. No fluff. Written for developers who are busy and want to know "should I update?" in 5 seconds. The bullets answer that question. The positioning answers "what even is this thing?"
