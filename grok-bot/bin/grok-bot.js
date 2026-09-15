#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { inspectSeat, formatReport, parseArgs } = require('../lib/seat-ready.cjs');
const {
  collectCompactSnapshot,
  quizCompactSnapshots,
  parseSnapshotArgs,
  formatQuiz,
} = require('../lib/compact-snapshot.cjs');

const llms = path.join(root, 'llms.txt');
const agents = path.join(root, 'AGENTS.md');
const skills = path.join(root, 'SKILLS.md');

const HELP = `@0xray/grok-bot — setup path for Grok Bot seats

Commands:
  ready | doctor          Prove mill plant on disk; print hangar/Clearing next steps
  compact-snapshot        Disk metrics before/after compact (no FILL, no chars÷4)
  compact-quiz            Compare two snapshots; did Path C keys survive?
  --print-llms            Print llms.txt

Flags (ready/doctor): --json  --skip-live  --cwd DIR
Flags (compact-snapshot): --cwd DIR  --out FILE
Flags (compact-quiz): --before FILE  --after FILE  --json

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
  if (cmd === 'compact-snapshot') {
    const args = parseSnapshotArgs(argv.slice(1));
    const cwd = path.resolve(args.cwd || process.cwd());
    const snap = collectCompactSnapshot(cwd);
    const payload = `${JSON.stringify(snap, null, 2)}\n`;
    if (args.out) {
      const dest = path.isAbsolute(args.out) ? args.out : path.join(cwd, args.out);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, payload);
    }
    process.stdout.write(payload);
    process.exit(0);
  }
  if (cmd === 'compact-quiz') {
    const args = parseSnapshotArgs(argv.slice(1));
    if (!args.before || !args.after) {
      process.stderr.write('compact-quiz requires --before FILE and --after FILE\n');
      process.exit(2);
    }
    const before = JSON.parse(fs.readFileSync(args.before, 'utf8'));
    const after = JSON.parse(fs.readFileSync(args.after, 'utf8'));
    const quiz = quizCompactSnapshots(before, after);
    if (args.json) {
      process.stdout.write(`${JSON.stringify(quiz, null, 2)}\n`);
    } else {
      process.stdout.write(formatQuiz(quiz));
    }
    process.exit(quiz.survived ? 0 : 1);
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
