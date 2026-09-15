#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { inspectSeat, formatReport, parseArgs } = require('../lib/seat-ready.cjs');

const llms = path.join(root, 'llms.txt');
const agents = path.join(root, 'AGENTS.md');
const skills = path.join(root, 'SKILLS.md');

const HELP = `@0xray/grok-bot — setup path for Grok Bot seats

Commands:
  ready | doctor   Prove mill plant on disk; print hangar/Clearing next steps
  --print-llms     Print llms.txt

Flags (ready/doctor): --json  --skip-live  --cwd DIR

Per key agent: fasten suit → (optional) Groover identity → OWS pay → hangar shops.
A friend would hear: run npx grok-bot ready in a seat project to see what is planted and what to do next.

`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    process.stdout.write(HELP);
    process.exit(0);
  }
  if (cmd === 'ready' || cmd === 'doctor') {
    const args = parseArgs(argv.slice(1));
    const cwd = path.resolve(args.cwd || process.cwd());
    const report = await inspectSeat(cwd, { skipLive: args.skipLive });
    if (args.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(formatReport(report));
    }
    process.exit(report.ready ? 0 : 1);
  }
  process.stdout.write(`@0xray/grok-bot — complete setup path for Grok Bot agents

1) Read: ${agents}
2) Index: ${skills}
3) Entry: ${llms}
4) Prove a seat: npx grok-bot ready

Per key agent: fasten suit → (optional) Groover identity → OWS pay → hangar shops.
Ops reference: ${path.join(root, 'ops')}

`);
  if (argv.includes('--print-llms') && fs.existsSync(llms)) {
    process.stdout.write(fs.readFileSync(llms, 'utf8'));
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
