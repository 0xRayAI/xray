#!/usr/bin/env node

/**
 * Tweet Template Reference
 * 
 * When user says "release" or "give me a tweet", generate:
 * 
 * "give me a tweet succinct with 5 tidy bullets with emojis. 
 *  a quip before or after and hashtags based on the commits in this session. 
 *  should be consumer focused."
 * 
 * This is a guide, not enforcement - let the AI be creative and punchy.
 */

console.log(`
🐦 Tweet Generator - Usage Guide
=================================

When asked for a release tweet, generate:

"give me a tweet succinct with 5 tidy bullets with emojis. 
 a quip before or after and hashtags based on the commits in this session. 
 should be consumer focused."

Example output:
---
🚀 v1.18.7 dropped

✨ add real validator tests for new codex terms
⚖️  connect enforcement system - plugin now uses RuleEnforcer
✅ wired MCP processor-pipeline to CodexLoader
📦 added 5 new codex validators (#12, #19, #16, #3, #13)
🔧 fixed orchestrator config loading & conflict resolution

Your dev workflow just got an upgrade. 🚀

#StringRay #AI #DevTools #OpenSource
---

Format: Punchy title • 5 tidy bullets with emojis • quip before/after • hashtags
Tone: Consumer-focused, creative, punchy - not boxed with guardrails
`);