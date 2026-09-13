#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const llms = path.join(root, 'llms.txt');
const agents = path.join(root, 'AGENTS.md');
const skills = path.join(root, 'SKILLS.md');
process.stdout.write(`@0xray/grok-bot — complete setup path for Grok Bot agents

1) Read: ${agents}
2) Index: ${skills}
3) Entry: ${llms}

Per key agent: fasten suit → (optional) Groover identity → OWS pay → hangar shops.
Ops reference: ${path.join(root, 'ops')}

`);
if (process.argv.includes('--print-llms') && fs.existsSync(llms)) {
  process.stdout.write(fs.readFileSync(llms, 'utf8'));
}
