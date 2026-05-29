#!/usr/bin/env node

/**
 * Release Tweet Template Reference
 *
 * Format guide: tweets/FORMAT.md
 * Tweet output: tweets/v{VERSION}.md
 *
 * The release script (scripts/node/release.mjs) auto-generates
 * a tweet template after publishing. Fill in the blanks using
 * the format guide in tweets/FORMAT.md.
 *
 * Quick format:
 *   🎉 xray v{VERSION} is LIVE - {THEME}!
 *   {EMOJI} {5 consumer-facing bullets}
 *   npm install xray@latest
 *   What xray is: {positioning}
 *   #xray #AIOps #DevTools #SelfHealing #NPM
 */

console.log(`
🐦 Tweet Reference
=================

Format guide: tweets/FORMAT.md
Output:       tweets/v{VERSION}.md

After release, the script creates a template. Fill in:
  1. {THEME} - 2-4 word summary of this release
  2. {EMOJI} {feature} - 5 bullets with role markers
  3. {positioning} - one sentence: what it does for the user

Emoji role markers:
  ✅ verified    🔧 fix         ✨ feature
  🛡️ guardrail   📦 package     🧪 testing
  📚 docs

Full examples in tweets/FORMAT.md
`);
