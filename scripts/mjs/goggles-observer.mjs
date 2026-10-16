#!/usr/bin/env node
/**
 * Every fact of the lens. Exit 1 when any fails.
 * node scripts/mjs/goggles-observer.mjs
 * GOGGLES_OBSERVER_PIPELINE=/path/to/goggles-pipeline.mjs node scripts/mjs/goggles-observer.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const pipelineUrl = process.env.GOGGLES_OBSERVER_PIPELINE
  ? pathToFileURL(process.env.GOGGLES_OBSERVER_PIPELINE).href
  : new URL('../../src/integrations/hooks/goggles-pipeline.mjs', import.meta.url).href;
const mcpUrl = process.env.GOGGLES_OBSERVER_MCP
  ? pathToFileURL(process.env.GOGGLES_OBSERVER_MCP).href
  : new URL('./goggles-mcp.mjs', pipelineUrl).href;
const utilsUrl = new URL('../grok/hooks/grok-hook-utils.js', pipelineUrl).href;

const fails = [];
const temps = [];

function check(name, ok, detail) {
  process.stdout.write(`${ok ? 'pass' : 'fail'}  ${name}${detail ? ` — ${detail}` : ''}\n`);
  if (!ok) fails.push(name);
}

function fresh() {
  const root = mkdtempSync(join(tmpdir(), 'goggles-observer-'));
  temps.push(root);
  return root;
}

function card(lines) {
  return lines.map(([key, value]) => `${key}: ${value}`.trimEnd()).join('\n');
}

const DEV = card([
  ['Plane', 'dev'],
  ['From', ''],
  ['Digest', 'This checkout.'],
  ['Plate', ''],
  ['Entry', 'package.json, src, and grok-bot/OP-PROC.md.'],
  ['Exit', 'A change that stays in this repo.'],
  ['Files', 'src, grok-bot, docs-site, AGENTS.md, package.json, README.md'],
  ['Skills', 'SKILLS.md'],
  ['Setup', 'You are in this repo.'],
  ['Teardown', 'Leave other repos alone.'],
  ['Worn', ''],
]);
const INTEGRATION = card([
  ['Plane', 'integration'],
  ['From', 'dev'],
  ['Digest', 'How one part calls the next.'],
  ['Plate', ''],
  ['Entry', 'The hook, the dispatch, or the bridge this file sits on.'],
  ['Exit', 'The next call. Stop there.'],
  ['Files', 'src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates'],
  ['Skills', 'SKILLS.md'],
  ['Setup', 'One connection at a time.'],
  ['Teardown', 'Do not sweep the rest of the repo.'],
  ['Worn', ''],
]);
const DOMAIN = card([
  ['Plane', 'domain'],
  ['From', 'dev'],
  ['Digest', 'The drawing of one area.'],
  ['Plate', 'docs-site/docs/plates'],
  ['Entry', 'The plate under docs-site/docs/plates, or the plate reader.'],
  ['Exit', 'The entry and exit written on that plate.'],
  ['Files', 'docs-site/docs/plates, src/integrations/hooks/plates.cjs, .agents/skills'],
  ['Skills', '.agents/skills'],
  ['Setup', 'One plate is in the frame.'],
  ['Teardown', 'The plate is the drawing. The code stays on dev or integration.'],
  ['Worn', ''],
]);
const ECOSYSTEM = card([
  ['Plane', 'ecosystem'],
  ['From', 'dev'],
  ['Digest', 'What this repo wears from outside.'],
  ['Plate', ''],
  ['Entry', 'scripts/foundry, and the @0xray packages this repo wears.'],
  ['Exit', 'Back to this checkout when the change is here.'],
  ['Files', 'scripts/foundry, node_modules/@0xray'],
  ['Skills', ''],
  ['Setup', 'The outside package is not this repo.'],
  ['Teardown', 'Do not edit a worn package from here.'],
  ['Worn', 'node_modules/@0xray'],
]);
const PLACES = { dev: DEV, integration: INTEGRATION, domain: DOMAIN, ecosystem: ECOSYSTEM };
const STAMP = 'Stamp: .agents/skills/stamp-plate/SKILL.md — one plate for this card.';

function filesOf(text) {
  return ((text.match(/^Files: (.*)$/m) || [])[1] || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function holdOf(root) {
  const path = join(root, '.xray', 'state', 'goggles-plane.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const api = await import(pipelineUrl);
const mcp = await import(mcpUrl);
const utils = await import(utilsUrl);
const {
  findPlatesDir,
  formatCardPane,
  growPlane,
  handCard,
  holdPlane,
  lensBeforeResearch,
  look,
  lookCards,
  maintainLens,
  planeCard,
  readLensCard,
  suitHint,
} = api;

process.stdout.write(`observer ${pipelineUrl.includes('/dist/') ? 'wear' : 'source'}\n`);

try {
  const places = fresh();
  for (const id of Object.keys(PLACES)) {
    const text = look([id], places).text;
    check(`${id} card is the place card`, text === PLACES[id]);
    check(`${id} has no Card line`, !/^Card:/m.test(text));
    check(`${id} has no stamp nag`, !text.includes('Stamp:'));
    const missing = filesOf(text).filter((rel) => !existsSync(join(repo, rel)));
    check(`${id} files exist`, missing.length === 0, missing.join(', '));
  }
  check('an empty look starts on dev', look([], fresh()).text === DEV);
  check('please dev is still the dev card', look(['please', 'dev'], fresh()).text === DEV);
  check('please integration is still the integration card', look(['please', 'integration'], fresh()).text === INTEGRATION);

  for (const name of ['dichotomy', 'syncopate', 'loop', 'kind', 'outer', 'eco', 'digest', 'outer-loop', 'TEGHAL', 'not-a-card']) {
    check(`${name} asks for one plane`, look([name], fresh()).text === 'Name one plane.');
  }
  for (const args of [['kind', '1'], ['kind', '0'], ['dev', 'integration'], ['routing', 'house'], ['outer', 'loop'], ['the', 'outer', 'loop'], ['name', 'dichotomy'], ['dichotomy', 'triage'], ['pull', '3'], ['2']]) {
    check(`${args.join(' ')} asks for one plane`, look(args, fresh()).text === 'Name one plane.');
  }

  const boot = look(['boot'], fresh()).text;
  check('boot is a thing card', boot.startsWith('Card: boot\n'));
  check('boot sits on integration', boot.includes('Plane: integration') && boot.includes('From: integration'));
  check('boot names its plate', boot.includes('Plate: docs-site/docs/plates/boot.md'));
  check('boot does not ask for a stamp', !boot.includes('Stamp:'));
  check('the boot plate file exists', existsSync(join(repo, 'docs-site/docs/plates/boot.md')));

  const routing = look(['routing'], fresh()).text;
  check('routing is a thing card', routing.includes('Card: routing') && routing.includes('Plane: integration'));
  check('routing names its plate', routing.includes('docs-site/docs/plates/routing.md'));
  check('routing names the other plates', routing.includes('Plates: orchestration, processor'));
  check('routing does not ask for a stamp', !routing.includes('Stamp:'));
  const routingView = lookCards(['routing'], fresh());
  check('routing view is one card', routingView?.length === 1 && routingView[0].card === 'routing' && routingView[0].plane === 'integration');
  check('routing view plates are orchestration and processor', JSON.stringify(routingView?.[0]?.plates) === JSON.stringify(['orchestration', 'processor']));

  const synthesis = look(['synthesis'], fresh()).text;
  check('synthesis is a thing card on integration', synthesis.includes('Card: synthesis') && synthesis.includes('Plane: integration'));
  check('a missing plate names the stamp skill', synthesis.includes(STAMP));
  check('the synthesis plate file is absent', !existsSync(join(repo, 'docs-site/docs/plates/synthesis.md')));
  const ground = look(['ground'], fresh()).text;
  check('ground is a card with no plate', ground.includes('Card: ground') && ground.includes(STAMP));
  check('the ground plate file is absent', !existsSync(join(repo, 'docs-site/docs/plates/ground.md')));

  const devView = lookCards(['dev'], fresh());
  check('dev view is one place', devView?.length === 1 && devView[0].plane === 'dev' && devView[0].digest === 'This checkout.');
  check('dev entry is the checkout', devView?.[0]?.entry === 'package.json, src, and grok-bot/OP-PROC.md.');
  check('dev exit stays in this repo', devView?.[0]?.exit === 'A change that stays in this repo.');
  check('dev files are the checkout', JSON.stringify(devView?.[0]?.files) === JSON.stringify(['src', 'grok-bot', 'docs-site', 'AGENTS.md', 'package.json', 'README.md']));
  const pane = formatCardPane(devView[0]);
  for (const label of ['Plane', 'From', 'Digest', 'Plate', 'Entry', 'Exit', 'Files', 'Skills', 'Setup', 'Teardown', 'Worn']) {
    check(`dev pane has ${label}`, pane.includes(label));
  }
  check('a pane has no empty mark', !pane.includes('n/a') && !pane.includes('The reading is'));
  check('a worn name has no card', lookCards(['dichotomy'], fresh()) == null);

  check('open the integration plane names its files', suitHint('open the integration plane') === 'integration: src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates');
  check('open the boot plane does not route', suitHint('open the boot plane') === '');
  check('a look with no plane asks for one', suitHint('look') === 'Name one plane.');
  check('a read of the readme does not route', suitHint('read the readme') === '');

  const gate = fresh();
  const search = lensBeforeResearch(gate, 'grep', 'open the boot plane');
  check('a search denies', search?.decision === 'deny' && search?.gate === 'lens');
  check('a search returns the dev card', String(search?.reason).includes('Plane: dev') && String(search?.reason).includes('Entry:') && String(search?.reason).includes('Exit:'));
  check('a search does not invent the boot plane', !String(search?.reason).includes('Plane: boot'));
  check('a search does not write a plate', !existsSync(join(gate, '.xray', 'state', 'plates', 'boot.md')));
  check('a search that names a file still returns the current card', String(lensBeforeResearch(gate, 'grep', 'src/nucleus/thin-dispatch.ts')?.reason).includes('Plane: dev'));
  check('README on dev stays quiet', lensBeforeResearch(gate, 'read_file', 'README.md') === null);
  check('config-paths on dev stays quiet', lensBeforeResearch(gate, 'read_file', 'src/core/config-paths.ts') === null);
  check('package.json on dev stays quiet', lensBeforeResearch(gate, 'Read', 'package.json') === null);
  const hop = lensBeforeResearch(gate, 'read_file', 'src/nucleus/thin-dispatch.ts');
  check('thin-dispatch opens the routing card', hop?.decision === 'allow' && String(hop.reason).includes('Card: routing') && String(hop.reason).includes('Plane: integration'));
  check('routing open names its plate', String(hop?.reason).includes('docs-site/docs/plates/routing.md') && !String(hop?.reason).includes('Stamp:'));
  check('the same file stays quiet', lensBeforeResearch(gate, 'read_file', 'src/nucleus/thin-dispatch.ts') === null);
  check('the next search uses the routing card', lensBeforeResearch(gate, 'grep', 'still searching')?.decision === 'deny' && String(lensBeforeResearch(gate, 'grep', 'still searching')?.reason).includes('Card: routing'));
  const missing = lensBeforeResearch(gate, 'read_file', 'src/nucleus/synthesis.ts');
  check('synthesis.ts opens the synthesis card', missing?.decision === 'allow' && String(missing.reason).includes('Card: synthesis'));
  check('the opened card names the stamp skill', String(missing?.reason).includes(STAMP));
  check('the open does not write the plate', !existsSync(join(repo, 'docs-site/docs/plates/synthesis.md')));
  const stored = readFileSync(join(gate, '.xray', 'state', 'LENS.md'), 'utf8');
  check('the stored card does not keep the stamp line', !stored.includes('Stamp:'));
  check('the lens grew the synthesis card', stored.includes('Card: synthesis'));
  check('a file on no card keeps synthesis', String(lensBeforeResearch(gate, 'read_file', 'CHANGELOG.md')?.reason).includes('Card: synthesis'));
  const back = lensBeforeResearch(gate, 'Read', 'README.md');
  check('README returns to the dev place', back?.decision === 'allow' && String(back.reason).startsWith('Plane: dev') && !/^Card:/m.test(String(back.reason)));
  const both = lensBeforeResearch(gate, 'read_file', 'README.md and src/nucleus/thin-dispatch.ts');
  check('two paths stay on the current card', both?.decision === 'allow' && String(both.reason).includes('Plane: dev'));
  check('the search after two paths stays on dev', String(lensBeforeResearch(gate, 'grep', 'after two files')?.reason).includes('Plane: dev'));
  const domainOpen = lensBeforeResearch(gate, 'read_file', 'src/integrations/hooks/plates.cjs');
  check('the plate reader is the domain place', domainOpen?.decision === 'allow' && String(domainOpen.reason).startsWith('Plane: domain') && !String(domainOpen.reason).includes('Card: memory-recall'));
  const outside = lensBeforeResearch(gate, 'read_file', 'scripts/foundry/package.json');
  check('foundry is the ecosystem place', outside?.decision === 'allow' && String(outside.reason).includes('Plane: ecosystem'));
  check('git stays open', lensBeforeResearch(gate, 'bash', 'git status') === null);
  check('npm stays open', lensBeforeResearch(gate, 'bash', 'npm test') === null);
  check('ls stays open', lensBeforeResearch(gate, 'bash', 'ls') === null);
  check('an edit is not a search', lensBeforeResearch(gate, 'search_replace', 'src/nucleus/thin-dispatch.ts') === null);
  check('a researcher search returns the ecosystem card', String(lensBeforeResearch(gate, 'xray-researcher', 'learn the code')?.reason).includes('Plane: ecosystem'));
  check('an explorer search returns the ecosystem card', String(lensBeforeResearch(gate, 'explorer', 'learn the code')?.reason).includes('Plane: ecosystem'));
  const home = lensBeforeResearch(gate, 'bash', 'python3 -c "print(1)" src/core/config-paths.ts');
  check('a shell read of a dev file returns the dev card', home?.decision === 'allow' && String(home.reason).includes('Plane: dev') && String(home.reason).includes('Entry:'));
  check('the search after that shell read is dev', String(lensBeforeResearch(gate, 'grep', 'back home')?.reason).includes('Plane: dev'));

  const face = fresh();
  lensBeforeResearch(face, 'read_file', 'README.md');
  const cli = lensBeforeResearch(face, 'read_file', 'src/cli/index.ts');
  check('the cli is the package-face card', cli?.decision === 'allow' && String(cli.reason).includes('Card: package-face') && String(cli.reason).includes('Plane: dev'));
  const gov = lensBeforeResearch(fresh(), 'read_file', 'src/governance/governance-service.ts');
  check('governance-service is the governance card', gov?.decision === 'allow' && String(gov.reason).includes('Card: governance') && String(gov.reason).includes('Plane: integration'));

  const recalled = fresh();
  holdPlane(recalled, 'memory recall');
  check('a name with a space does not hold', holdOf(recalled) == null);
  holdPlane(recalled, 'memory-recall');
  const memoryHold = holdOf(recalled);
  check('memory-recall holds the domain place', memoryHold?.plane === 'domain' && memoryHold?.card === 'memory-recall', JSON.stringify(memoryHold));

  const shown = planeCard(fresh());
  check('the boot card is the dev place', shown.plane === 'dev' && String(shown.card).includes('Entry:') && String(shown.card).startsWith('Plane: dev'));

  const notes = fresh();
  mkdirSync(join(notes, '.xray', 'state'), { recursive: true });
  writeFileSync(join(notes, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
  check('compact of an empty hold writes nothing', JSON.stringify(maintainLens(notes)) === JSON.stringify({ ok: true, text: '' }));
  check('an empty lens stays empty', readFileSync(join(notes, '.xray', 'state', 'LENS.md'), 'utf8') === '');
  const noteBody = readFileSync(join(notes, '.xray', 'state', 'NOTES.md'), 'utf8');
  check('compact leaves the notes body', noteBody.includes('# Stay') && noteBody.includes('The body stays.') && noteBody.includes('**Pickup line:** old job'));
  check('compact does not write a pop job', !noteBody.includes('## Pop job') && !noteBody.includes('stops the action'));

  const kept = fresh();
  holdPlane(kept, 'integration');
  const lens = readFileSync(join(kept, '.xray', 'state', 'LENS.md'), 'utf8');
  check('compact writes the integration card', lens.startsWith('Plane: integration\n') && lens.includes('Entry: The hook, the dispatch, or the bridge this file sits on.'));
  check('a second compact keeps that card', JSON.stringify(maintainLens(kept)) === JSON.stringify({ ok: true, text: '' }) && readFileSync(join(kept, '.xray', 'state', 'LENS.md'), 'utf8') === lens);
  const marked = lens.replace('Entry: The hook, the dispatch, or the bridge this file sits on.', 'Entry: kept');
  writeFileSync(join(kept, '.xray', 'state', 'LENS.md'), marked);
  holdPlane(kept, 'domain');
  const next = readFileSync(join(kept, '.xray', 'state', 'LENS.md'), 'utf8');
  check('a hand edit stays', readLensCard(kept, 'integration').includes('Entry: kept'));
  check('domain is added beside it', next.includes('Plane: domain') && next.split('Plane:').length - 1 === 2);
  holdPlane(kept, 'routing');
  const grownLens = readFileSync(join(kept, '.xray', 'state', 'LENS.md'), 'utf8');
  check('a thing card is added without replacing the place', grownLens.includes('Card: routing') && grownLens.includes('Entry: kept') && !/^Plane: routing/m.test(grownLens));
  check('the thing hold is the place plus the card', holdOf(kept)?.plane === 'integration' && holdOf(kept)?.card === 'routing');

  const station = fresh();
  const stationPath = join(station, '.xray', 'state', 'STATION.md');
  mkdirSync(join(station, '.xray', 'state'), { recursive: true });
  writeFileSync(stationPath, '# Station\n\nCard: routing. From: ground. Digest: old.\n\nContinue this card.\n');
  check('naming dichotomy does not clear the station', handCard(station, 'name dichotomy') == null && /^Card:/m.test(readFileSync(stationPath, 'utf8')));
  check('saying goggles clears the station card line', handCard(station, 'goggles') == null && !/^Card:/m.test(readFileSync(stationPath, 'utf8')));
  const bootRoot = fresh();
  mkdirSync(join(bootRoot, '.xray', 'state'), { recursive: true });
  utils.writeSessionBoot(bootRoot, { intent: 'short', cardText: 'look at synthesis then part', host: 'grok' });
  check('session boot does not write a file card', !/^Card:/m.test(readFileSync(join(bootRoot, '.xray', 'state', 'STATION.md'), 'utf8')));

  const edited = fresh();
  const first = look(['dev'], edited).text;
  const lensPath = join(edited, '.xray', 'state', 'LENS.md');
  writeFileSync(lensPath, readFileSync(lensPath, 'utf8').replace(/^Entry:.*$/m, 'Entry: kept'));
  writeFileSync(join(edited, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({ dev: { setup: 'bench is up' } }, null, 2)}\n`);
  const second = look(['dev'], edited).text;
  check('a stored entry wins', second.includes('Entry: kept') && !second.includes('bench is up') && !second.includes('Drift:'));
  check('the stored file is not rewritten', readFileSync(lensPath, 'utf8').includes('Entry: kept'));
  check('the first dev card had no drift', first.includes('Plane: dev') && !first.includes('Drift:'));

  mkdirSync(join(edited, '.xray', 'state'), { recursive: true });
  writeFileSync(join(edited, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({ boot: { files: ['src/missing.ts'] } })}\n`);
  const grown = growPlane('boot', findPlatesDir(repo), edited);
  const grownFiles = Array.isArray(grown.files) ? grown.files : [];
  check('a stale file is replaced', grownFiles.includes('src/core/boot-orchestrator.ts') && !grownFiles.includes('src/missing.ts'), grownFiles.join(', '));

  const bin = fileURLToPath(pipelineUrl);
  const lookRoot = fresh();
  const runLook = (args) => execFileSync(process.execPath, [bin, ...args], { cwd: lookRoot, encoding: 'utf8' });
  check('the command dichotomy asks for one plane', runLook(['dichotomy']) === 'Name one plane.\n');
  check('the command kind 0 asks for one plane', runLook(['kind', '0']) === 'Name one plane.\n');
  check('the command dev shows the place', runLook(['dev']).startsWith('Plane: dev\n') && !runLook(['dev']).includes('┌'));
  check('the command synthesis names the stamp skill', runLook(['synthesis']).includes(STAMP));
  const commandHold = holdOf(lookRoot);
  check('the command holds the card it shows', commandHold?.plane === 'integration' && commandHold?.card === 'synthesis', JSON.stringify(commandHold));
  check('a command with no name stays on that card', runLook([]).includes('Card: synthesis'));
  check('the command did not write the plate', !existsSync(join(repo, 'docs-site/docs/plates/synthesis.md')));

  const toolRoot = fresh();
  const opened = await mcp.dispatchTool('look', {}, toolRoot);
  check('a look with no name returns dev', opened.isError === false && opened.payload?.content?.card === 'dev' && opened.payload?.content?.entry?.includes('package.json'));
  const toolBoot = await mcp.dispatchTool('look', { plane: 'boot' }, toolRoot);
  check('the tool look boot holds the card', toolBoot.payload?.content?.card === 'boot' && holdOf(toolRoot)?.card === 'boot' && holdOf(toolRoot)?.plane === 'integration');
  const toolMissing = await mcp.dispatchTool('look', { plane: 'synthesis' }, fresh());
  check('the tool names the stamp skill', toolMissing.isError === false && String(toolMissing.payload?.content?.stamp).includes('.agents/skills/stamp-plate/SKILL.md') && String(toolMissing.payload?.content?.stamp).includes('one plate for this card'));
  const refused = fresh();
  const bad = await mcp.dispatchTool('look', { plane: 'not-a-card' }, refused);
  check('the tool refuses a name that is not a card', bad.isError === true && bad.payload?.error?.reason === 'Name one plane.' && holdOf(refused) == null, bad.payload?.error?.reason);
  const status = await mcp.dispatchTool('status_lens', {}, fresh());
  check('the organ reports worn', status.isError === false && status.payload?.organ === 'worn');
  const lookTool = (mcp.TOOLS || []).find((tool) => tool.name === 'look');
  check('the tool has no plane enum', lookTool && lookTool.inputSchema?.properties?.plane?.enum == null);
  check('the tool says a missing plate names the skill', String(lookTool?.description).includes('stamp-plate') && String(lookTool?.description).includes('Entry and Exit'));

  const stuck = fresh();
  look(['ecosystem'], stuck);
  check('the last look sticks', look([], stuck).text === ECOSYSTEM);
} finally {
  for (const root of temps) rmSync(root, { recursive: true, force: true });
}

if (fails.length) {
  process.stderr.write(`${fails.length} failed\n`);
  process.exit(1);
}
process.stdout.write('observer clear\n');
