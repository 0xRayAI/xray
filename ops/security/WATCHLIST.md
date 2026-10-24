# Security and updates watchlist

Snapshot of `0xRayAI/xray` at `af1c9bf487c227633b9b92b2a5e77e9a0b75ce95` on 2026-10-22.

Nibbler uses this for the daily security and updates fleet report. Arch1 uses it for tech-parity research: declared range against locked version, and the gap list for names this tree does not cite.

Names only. No secret values. Every hit has a `file:line` in this checkout. A gap means the name was asked for and this tree has no line for it.

The same object is in [`WATCHLIST.json`](WATCHLIST.json).

## 1. Products we ship

### npm packages

| Name | Version | Publish | What to watch | Source |
| --- | --- | --- | --- | --- |
| 0xray | 4.1.3 | public | GHSA and npm deprecation for 0xray; breaking minor or major; registry publish that does not match this git pin. Suit package. Repository 0xRayAI/xray. | `package.json:3`; also package.json:9 |
| @0xray/grok-bot | 0.1.11 | public | GHSA and npm deprecation for @0xray/grok-bot; breaking minor; engines floor drift against 0xray. House kit. No npm dependencies. Ships from the grok-bot directory of 0xRayAI/xray. | `grok-bot/package.json:3`; also grok-bot/package.json:52 |
| @0xray/foundry | 0.1.12 | public | GHSA and npm deprecation for @0xray/foundry; breaking mill CLI; blip range ^0.1.3 with no lockfile beside this package. Mill CLI (inspect, release, blip, sound). Directory scripts/foundry of 0xRayAI/xray. | `scripts/foundry/package.json:3`; also scripts/foundry/package.json:58 |
| @0xray/repertoire | 0.2.9 | public, vendored copy | GHSA for @0xray/repertoire and its unlocked ranges; breaking 0.x; vendor pin drifting from the upstream registry version. Memory organ. Upstream git is 0xRayAI/repertoire. This checkout vendors 0.2.9 and does not carry its lockfile. | `vendor/@0xray/repertoire/package.json:3`; also vendor/@0xray/repertoire/package.json:10 |
| @0xray/blip | 0.1.2 locked; foundry declares ^0.1.3 | public mill, consumed here | GHSA for @0xray/blip; 0.1.2 versus the foundry range ^0.1.3; breaking shortie or audio-bed changes. Blip product mill. Not a package.json we author in this repo. Root lock pins 0.1.2. Foundry declares ^0.1.3 with no lockfile. Upstream git is htafolla/blips. | `package.json:230`; also package-lock.json:41, house/HOUSE.md:22 |
| goggles | in the 0xray package, no separate npm name | not a package.json in this repo | Treat goggles CVEs as 0xray CVEs; do not open a separate npm advisory for a package that is not published from here. Lens organ inside 0xray (goggles-pipeline). No package named goggles or @0xray/goggles in any package.json or either lockfile. | `src/integrations/hooks/goggles-pipeline.mjs:2` |
| xray-docs | 1.0.0 | private | Docusaurus 3.7 security releases; lockfile name stringray-docs drifting from package name xray-docs; GitHub Pages outage. Docusaurus site published to GitHub Pages, not the npm registry. Lockfile still names stringray-docs. | `docs-site/package.json:3`; also docs-site/package-lock.json:2, docs-site/package.json:2 |
| live-board | 1.0.0 | private | Node image CVEs; Railway outages for burst-live; breaking healthcheck contract. Bifrost server image. No npm dependencies in its package.json. | `house/live/app/package.json:3`; also house/live/app/package.json:6 |
| xray-pre-tool | 4.1.3 | private | version skew against 0xray; OpenClaw host breaking changes. OpenClaw PreToolUse extension. Version tracks 0xray. | `src/integrations/openclaw/plugin/xray-pre-tool/package.json:3` |
| recall-bench-100k | 1.0.0 | example, private flag unset | accidental npm publish; file: links breaking when the vendor path moves. Bench app. file: dependencies on 0xray and the vendored repertoire. npm publish in this directory would be public. | `examples/ben-proof/suited/package.json:3`; also examples/ben-proof/suited/package.json:2 |
| recall-bench-dummy-app | 0.1.0 | private example | engines floor; accidental un-private change. Bench app with no dependencies. | `examples/ben-proof/dummy/package.json:3` |
| mcp-image-recognition | 3.1.0 | example, private flag unset | accidental npm publish; stale StringRay name on a public example. Example plugin. No dependencies. Keyword still says stringray-plugin. | `examples/plugins/mcp-image-recognition/package.json:3`; also examples/plugins/mcp-image-recognition/package.json:10 |

### GitHub repositories

| Repo | What to watch | Source |
| --- | --- | --- |
| 0xRayAI/xray | GHSA; Actions compromise; default-branch protection. this checkout | `package.json:9` |
| 0xRayAI/repertoire | GHSA; breaking 0.x; vendor pin lag. upstream of the vendored organ | `vendor/@0xray/repertoire/package.json:10` |
| 0xRayAI/muse-house | GHSA; archive or transfer; Pages or Railway outage. named in the live-events feed | `docs-site/static/live/live-events.json:13` |
| 0xRayAI/0xray-moltbook | GHSA; Railway auto-deploy on merge; branch protection. push-allowed; merge to main is the Railway deploy | `house/HOUSE.md:25` |
| htafolla/blips | GHSA; private-repo cloud 404; blip semver. upstream of @0xray/blip | `house/HOUSE.md:22` |
| htafolla/clearing | GHSA; Railway hostname change; Base or USDC contract change. push-allowed; x402 USDC on Base | `house/HOUSE.md:23` |
| htafolla/groover | GHSA; registry hostname change. push-allowed; DID registry and hangar | `house/HOUSE.md:24` |
| htafolla/chrono-warp-drive | GHSA; solar API break; blurrn-mcp version. Dynamo / Chrono. Read-only watcher. | `house/WATCHERS.md:18` |
| htafolla/trinitarium | GHSA; archive or transfer. read-only watcher | `house/WATCHERS.md:17` |
| htafolla/rippel-synapse-flow | access loss for cloud agents; GHSA. private sound SSOT | `house/CLOUD-REPO-ACCESS.md:9` |
| htafolla/piddy2 | access loss; GHSA. private Ditty Drop lineage | `house/CLOUD-REPO-ACCESS.md:10` |
| htafolla/rippel | archive; accidental pushes. public brand repo, called empty | `house/CLOUD-REPO-ACCESS.md:11` |
| htafolla/stringray | dangling discussions URL; rename leftovers. historical predecessor name | `docs-site/docs/archive/architecture/ORCHESTRATOR_INTEGRATION_ARCHITECTURE.md:434` |
| htafolla/groofer | confusion with groover. called empty or stale | `examples/killer-dual/ARM-B-LANDSCAPE.md:40` |
| htafolla/jelly-roast-bot | stale one-commit repo mistaken for confer history. only public jelly name match | `grok-bot/ops/cards/SYNTHESIS-CONFER-WRITEUP.md:32` |
| htafolla/dynamo-news | X API changes; repo archive. X briefing consumer of govern_with_solar | `examples/killer-dual/ARM-S-LANDSCAPE.md:62` |

Cited as absent or historical misses:

| Name | What to watch | Source |
| --- | --- | --- |
| htafolla/chrono | confirm before treating it as a live repo. cited as a miss; Chrono is the package inside groover plus chrono-warp-drive | `examples/killer-dual/ARM-S-LANDSCAPE.md:63` |
| htafolla/jelly | confirm before treating it as a live repo. GET repo returned 404 in that writeup | `grok-bot/ops/cards/SYNTHESIS-CONFER-WRITEUP.md:32` |
| htafolla/zigzag | confirm before treating it as a live repo. no public repo; signer is a live label | `examples/killer-dual/ARM-B-LANDSCAPE.md:39` |
| htafolla/dynamo | confirm before treating it as a live repo. no repo; Dynamo v5 text lives in chrono-warp-drive | `examples/killer-dual/ARM-S-LANDSCAPE.md:62` |
| 0xRayAI/0xray.dev | confirm before treating it as a live repo. this repo publishes docs.0xray.dev, not an apex 0xray.dev Pages repo | `docs-site/static/CNAME:1` |

### Live services

| Service | Where | What to watch | Source |
| --- | --- | --- | --- |
| Bifrost / burst-live | https://bifrost.0xray.dev | Railway outage; pricing; hostname or LIVE_URL change; breaking /healthz or /cards. Live board. Railway project and service default to burst-live. The board is not a fleet node. | `docs-site/docs/plates/grokbot.md:41`; also house/live/app/deploy.sh:8 |
| docs.0xray.dev | GitHub Pages environment github-pages | Pages outage; certificate or CNAME change; actions/deploy-pages breaking tag. Docusaurus manual. CNAME is docs.0xray.dev. This checkout does not set an apex 0xray.dev CNAME. | `docs-site/static/CNAME:1`; also .github/workflows/deploy-docs.yml:42, docs-site/docusaurus.config.ts:9 |
| Clearing | https://clearing.rippel.ai and clearing-production-9968.up.railway.app | Railway hostname rotation; outage; USDC or x402 contract change on Base. x402 USDC shop on Base. | `grok-bot/lib/seat-doctor.cjs:8`; also grok-bot/lib/seat-doctor.cjs:9 |
| Groover registry MCP | https://registry-production-e2c4.up.railway.app/mcp | Railway hostname rotation; outage; MCP schema break. DID registry MCP. | `grok-bot/lib/seat-doctor.cjs:11` |
| Groover suit site | https://website-production-c0da.up.railway.app/suit | Railway hostname rotation; outage. Factory suit UI on Railway. | `grok-bot/lib/seat-doctor.cjs:10` |
| blurrn-mcp | https://mcp-production-80e2.up.railway.app | version 4.8.3 moving; Railway hostname rotation; solar tool rename or removal. Cited as blurrn-mcp 4.8.3 with govern_with_solar. Dynamo / Chrono live MCP. | `examples/killer-dual/ARM-B-LANDSCAPE.md:38` |
| 0xray-moltbook Railway | Railway auto-deploy on merge to main of 0xRayAI/0xray-moltbook | Railway auto-deploy failure; pricing; unexpected production deploy from a merge. The only repo in this house whose merge is the deploy. | `house/HOUSE.md:28` |
| xray MCP image | repo-root railway.json, Dockerfile, start node mcp-server.mjs | image CVE; start command change; deploying the board from this root by mistake. Root Railway config is the MCP server, not the live board. | `railway.json:8`; also house/burst/DEPLOY.md:150 |
| sweet-trust | env label on muse-house live events | environment rename; production deploy of muse-house. Feed notes say env sweet-trust / production. This checkout does not name a Railway project id for it. | `docs-site/static/live/live-events.json:73` |
| ZigZag signer | hosted sign is 410; wallet setup zigzag-two.vercel.app | Vercel app outage; sign endpoint returning; Base EIP-3009 changes. Marketplace signer label on Clearing health. No public git home in this tree. | `examples/killer-dual/ARM-B-LANDSCAPE.md:39` |

Fleet names with no line in this checkout:

- **Railway project bedrock.** the word bedrock in this tree is the repertoire dump to keep off the station card, not a Railway project. `docs-site/docs/guides/station-vs-repertoire.md:17`.
- **xray-mcp services blips-minter, governance, clearing, zigzag-mcp, blip-plant, blips, registry, moltbook-worker, optimistic-victory, website.** those service names are not in this checkout; clearing, registry, and website appear only as public Railway hostnames above. `railway.json:8`.
- **blurrn-mcp services Redis x2, stellar-mcp, neural-fusion-backend, mcp.** only the blurrn-mcp product name and one Railway hostname are cited; Redis x2, stellar-mcp, and neural-fusion-backend have no line. `examples/killer-dual/ARM-B-LANDSCAPE.md:38`.

## 2. Dependencies

Direct dependencies from every `package.json` that declares any. Locked versions are the `version` line in the nearest lockfile. `@0xray/grok-bot`, `live-board`, `xray-pre-tool`, and `recall-bench-dummy-app` declare none. `tests/config/package.json` is `{"type":"module"}` only.

| Package | Section | Name | Declared | Locked | What to watch | Source |
| --- | --- | --- | --- | --- | --- | --- |
| 0xray | dependencies | @0xray/blip | `^0.1.2` | `0.1.2` | GHSA/CVE; npm deprecation; range ^0.1.2 can move on a lock refresh; pin is 0.1.2 | `package.json:230`; `package-lock.json:41` |
| 0xray | dependencies | @modelcontextprotocol/sdk | `^1.0.4` | `1.28.0` | GHSA/CVE; npm deprecation; range ^1.0.4 can move on a lock refresh; pin is 1.28.0; breaking protocol or auth release | `package.json:231`; `package-lock.json:972` |
| 0xray | dependencies | commander | `^11.1.0` | `11.1.0` | GHSA/CVE; npm deprecation; range ^11.1.0 can move on a lock refresh; pin is 11.1.0 | `package.json:232`; `package-lock.json:2183` |
| 0xray | dependencies | express | `^5.2.1` | `5.2.1` | GHSA/CVE; npm deprecation; range ^5.2.1 can move on a lock refresh; pin is 5.2.1; breaking protocol or auth release | `package.json:233`; `package-lock.json:2770` |
| 0xray | dependencies | jsonwebtoken | `^9.0.3` | `9.0.3` | GHSA/CVE; npm deprecation; range ^9.0.3 can move on a lock refresh; pin is 9.0.3; breaking protocol or auth release | `package.json:234`; `package-lock.json:3360` |
| 0xray | dependencies | ws | `^8.16.0` | `8.21.0` | GHSA/CVE; npm deprecation; range ^8.16.0 can move on a lock refresh; pin is 8.21.0; breaking protocol or auth release | `package.json:235`; `package-lock.json:5003` |
| 0xray | devDependencies | @eslint/js | `^9.39.2` | `9.39.4` | GHSA/CVE; npm deprecation; range ^9.39.2 can move on a lock refresh; pin is 9.39.4 | `package.json:238`; `package-lock.json:829` |
| 0xray | devDependencies | @playwright/test | `^1.55.0` | `1.55.0` | GHSA/CVE; npm deprecation; range ^1.55.0 can move on a lock refresh; pin is 1.55.0 | `package.json:239`; `package-lock.json:1041` |
| 0xray | devDependencies | @types/express | `^5.0.0` | `5.0.6` | GHSA/CVE; npm deprecation; range ^5.0.0 can move on a lock refresh; pin is 5.0.6 | `package.json:240`; `package-lock.json:1412` |
| 0xray | devDependencies | @types/jsonwebtoken | `^9.0.7` | `9.0.10` | GHSA/CVE; npm deprecation; range ^9.0.7 can move on a lock refresh; pin is 9.0.10 | `package.json:241`; `package-lock.json:1451` |
| 0xray | devDependencies | @types/node | `^22.10.2` | `22.19.19` | GHSA/CVE; npm deprecation; range ^22.10.2 can move on a lock refresh; pin is 22.19.19 | `package.json:242`; `package-lock.json:1469` |
| 0xray | devDependencies | @types/ws | `^8.5.13` | `8.18.1` | GHSA/CVE; npm deprecation; range ^8.5.13 can move on a lock refresh; pin is 8.18.1 | `package.json:243`; `package-lock.json:1514` |
| 0xray | devDependencies | @typescript-eslint/eslint-plugin | `^8.18.0` | `8.60.1` | GHSA/CVE; npm deprecation; range ^8.18.0 can move on a lock refresh; pin is 8.60.1 | `package.json:244`; `package-lock.json:1524` |
| 0xray | devDependencies | @typescript-eslint/parser | `^8.18.0` | `8.60.1` | GHSA/CVE; npm deprecation; range ^8.18.0 can move on a lock refresh; pin is 8.60.1 | `package.json:245`; `package-lock.json:1553` |
| 0xray | devDependencies | @vitest/coverage-v8 | `^4.1.8` | `4.1.8` | GHSA/CVE; npm deprecation; range ^4.1.8 can move on a lock refresh; pin is 4.1.8 | `package.json:246`; `package-lock.json:1757` |
| 0xray | devDependencies | eslint | `^9.17.0` | `9.39.4` | GHSA/CVE; npm deprecation; range ^9.17.0 can move on a lock refresh; pin is 9.39.4 | `package.json:247`; `package-lock.json:2475` |
| 0xray | devDependencies | ts-node | `^10.9.2` | `10.9.2` | GHSA/CVE; npm deprecation; range ^10.9.2 can move on a lock refresh; pin is 10.9.2 | `package.json:248`; `package-lock.json:4631` |
| 0xray | devDependencies | typescript | `^5.7.2` | `5.9.3` | GHSA/CVE; npm deprecation; range ^5.7.2 can move on a lock refresh; pin is 5.9.3 | `package.json:249`; `package-lock.json:4731` |
| 0xray | devDependencies | vitest | `^4.1.8` | `4.1.8` | GHSA/CVE; npm deprecation; range ^4.1.8 can move on a lock refresh; pin is 4.1.8 | `package.json:250`; `package-lock.json:4865` |
| xray-docs | dependencies | @docusaurus/core | `3.7.0` | `3.7.0` | GHSA/CVE; npm deprecation; declared spec matches the lock | `docs-site/package.json:19`; `docs-site/package-lock.json:3432` |
| xray-docs | dependencies | @docusaurus/preset-classic | `3.7.0` | `3.7.0` | GHSA/CVE; npm deprecation; declared spec matches the lock | `docs-site/package.json:20`; `docs-site/package-lock.json:3794` |
| xray-docs | dependencies | @mdx-js/react | `^3.0.0` | `3.1.1` | GHSA/CVE; npm deprecation; range ^3.0.0 can move on a lock refresh; pin is 3.1.1 | `docs-site/package.json:21`; `docs-site/package-lock.json:4183` |
| xray-docs | dependencies | clsx | `^2.0.0` | `2.1.1` | GHSA/CVE; npm deprecation; range ^2.0.0 can move on a lock refresh; pin is 2.1.1 | `docs-site/package.json:22`; `docs-site/package-lock.json:6216` |
| xray-docs | dependencies | prism-react-renderer | `^2.4.0` | `2.4.1` | GHSA/CVE; npm deprecation; range ^2.4.0 can move on a lock refresh; pin is 2.4.1 | `docs-site/package.json:23`; `docs-site/package-lock.json:14817` |
| xray-docs | dependencies | react | `^18.3.1` | `18.3.1` | GHSA/CVE; npm deprecation; range ^18.3.1 can move on a lock refresh; pin is 18.3.1 | `docs-site/package.json:24`; `docs-site/package-lock.json:15053` |
| xray-docs | dependencies | react-dom | `^18.3.1` | `18.3.1` | GHSA/CVE; npm deprecation; range ^18.3.1 can move on a lock refresh; pin is 18.3.1 | `docs-site/package.json:25`; `docs-site/package-lock.json:15191` |
| xray-docs | devDependencies | @docusaurus/module-type-aliases | `3.7.0` | `3.7.0` | GHSA/CVE; npm deprecation; declared spec matches the lock | `docs-site/package.json:28`; `docs-site/package-lock.json:3560` |
| xray-docs | devDependencies | @docusaurus/tsconfig | `3.7.0` | `3.7.0` | GHSA/CVE; npm deprecation; declared spec matches the lock | `docs-site/package.json:29`; `docs-site/package-lock.json:3936` |
| xray-docs | devDependencies | @docusaurus/types | `3.7.0` | `3.7.0` | GHSA/CVE; npm deprecation; declared spec matches the lock | `docs-site/package.json:30`; `docs-site/package-lock.json:3943` |
| xray-docs | devDependencies | typescript | `~5.6.2` | `5.6.3` | GHSA/CVE; npm deprecation; range ~5.6.2 can move on a lock refresh; pin is 5.6.3 | `docs-site/package.json:31`; `docs-site/package-lock.json:17109` |
| @0xray/foundry | dependencies | @0xray/blip | `^0.1.3` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `scripts/foundry/package.json:58`; no lockfile |
| @0xray/repertoire | dependencies | @modelcontextprotocol/sdk | `^1.12.0` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range; breaking protocol or auth release | `vendor/@0xray/repertoire/package.json:109`; no lockfile |
| @0xray/repertoire | peerDependencies | 0xray | `>=3.5.5` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:112`; no lockfile |
| @0xray/repertoire | devDependencies | 0xray | `^4.0.28` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:120`; no lockfile |
| @0xray/repertoire | devDependencies | @types/node | `^22.15.0` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:121`; no lockfile |
| @0xray/repertoire | devDependencies | tsx | `^4.19.0` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:122`; no lockfile |
| @0xray/repertoire | devDependencies | typescript | `^5.6.0` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:123`; no lockfile |
| @0xray/repertoire | devDependencies | vitest | `^4.1.8` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `vendor/@0xray/repertoire/package.json:124`; no lockfile |
| recall-bench-100k | dependencies | @0xray/repertoire | `file:../../../vendor/@0xray/repertoire` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `examples/ben-proof/suited/package.json:11`; no lockfile |
| recall-bench-100k | dependencies | 0xray | `file:../../..` | — | GHSA/CVE; npm deprecation; no lockfile next to this package.json; install can move inside the range | `examples/ben-proof/suited/package.json:12`; no lockfile |

### Key transitives

These are in a lockfile and are not the direct row above. `viem`, `ethers`, and Redis clients are absent and listed after the table.

| Name | Version | Via | What to watch | Source |
| --- | --- | --- | --- | --- |
| zod | `4.3.6` | @modelcontextprotocol/sdk peer zod ^3.25 \|\| ^4.0 (sdk package-lock.json:992) | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:5047` |
| zod-to-json-schema | `3.25.1` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:5056` |
| hono | `4.12.23` | @modelcontextprotocol/sdk; also imported by api/mcp.ts:1 without its own package.json dependency | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:3108` |
| @hono/node-server | `1.19.14` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:866` |
| jose | `6.1.3` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:3295` |
| ajv | `8.18.0` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:1950` |
| ajv-formats | `3.0.1` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:1966` |
| cors | `2.8.6` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:2246` |
| express-rate-limit | `8.5.2` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:2813` |
| eventsource | `3.0.7` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:2739` |
| cross-spawn | `7.0.6` | @modelcontextprotocol/sdk | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:2270` |
| playwright | `1.55.0` | @playwright/test | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:4103` |
| playwright-core | `1.55.0` | @playwright/test | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `package-lock.json:4121` |
| express | `4.22.1` | docs-site tree, beside root express 5.2.1 | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `docs-site/package-lock.json:7902` |
| ws | `8.20.0` | docs-site nested under webpack-dev-server | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `docs-site/package-lock.json:17843` |
| ws | `7.5.10` | docs-site hoisted ws 7, beside root ws 8.21.0 | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `docs-site/package-lock.json:18113` |
| commander | `5.1.0` | docs-site tree, beside root commander 11.1.0 | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `docs-site/package-lock.json:6284` |
| @types/react | `19.2.14` | docs-site types, beside react 18.3.1 | GHSA/CVE; deprecation; breaking major on this line even when the parent range allows it | `docs-site/package-lock.json:4866` |

Not in either lockfile:

- **viem.** No node_modules/viem entry in package-lock.json or docs-site/package-lock.json. Watch: not installed; do not file a viem GHSA against this checkout until a package.json or lockfile gains it. `package-lock.json:4`.
- **ethers.** No node_modules/ethers entry in either lockfile. Base settlement in this tree is x402 and OWS, not an ethers import. Watch: not installed. `docs-site/package-lock.json:4`.
- **redis / ioredis / @redis/client.** Archive docker notes mention REDIS_URL and ioredis. They are not current dependencies. Watch: not installed; api/mcp.ts documents an in-memory bus and no Redis dependency. `api/mcp.ts:35`.

## 3. Platforms and vendors

| Platform | What to watch | Source |
| --- | --- | --- |
| Railway | outages; pricing; CLI and config-as-code break; railway.json read path ends 2026-12-01. Env names only: RAILWAY_TOKEN, LIVE_RAILWAY_PROJECT, LIVE_RAILWAY_SERVICE, LIVE_RAILWAY_ENVIRONMENT, LIVE_RAILWAY_TARGETS, RAILWAY_PROJECTS. | `house/burst/DEPLOY.md:158`; also railway.json:2, house/live/app/deploy.sh:13 |
| GitHub Actions | tag mutation on every uses: line below; action CVEs; ubuntu-latest image drift. No workflow pins an action to a 40-character SHA. Weekly npm audit is scheduled and masked with \|\| true. | `.github/workflows/mill-ci.yml:25`; also .github/workflows/security.yml:25, .github/workflows/security-audit.yml:29 |
| GitHub Apps | App permission changes; token-mint breakage; bot login rename. Seat Apps named in-tree: forge0x1, critic0x. Plain gh is not the seat. | `grok-bot/ops/AUTO-REVIEW-POLICY.md:59`; also docs-site/docs/guides/house.md:146 |
| GitHub Pages | Pages outage; deploy-pages or upload-pages-artifact breaking release; CNAME change. | `.github/workflows/deploy-docs.yml:47` |
| npm | registry outage; pricing or auth-flow change; token rotation. Secret name only: NPM_TOKEN, passed as NODE_AUTH_TOKEN. Weekly audit does not fail the job. | `.github/workflows/publish.yml:73`; also .github/workflows/publish.yml:75 |
| Cursor cloud agents | cloud-agent API break; webhook signature change; pricing. Env name only. Launch flag ARCH1_LAUNCH_ENABLED is named on the next rows of that file. | `house/burst/DEPLOY.md:185` |
| xAI / Grok | auth.x.ai outage or OAuth break; API pricing; CLI login changes. Names only: XAI_API_KEY, XAI_CLIENT_ID. The client id value is not copied here. | `scripts/node/setup-xai-oauth.mjs:22`; also scripts/node/setup-xai-oauth.mjs:23, house/live/tools/arch1-tui-harness.sh:511 |
| X API | API pricing; breaking v2 changes; credential-name rotation. Catalog MCP xmcp. Env names: X_BEARER_TOKEN, X_API_KEY. No X SDK in either lockfile. | `src/mcps/registry.json:7`; also src/mcps/registry.json:10 |
| Redis | do not track a Redis CVE for this checkout until a client is added; archive REDIS_URL examples are not the running bus. | `api/mcp.ts:35`; also docs-site/docs/archive/operations/deployment/DOCKER_DEPLOYMENT_GUIDE.md:525 |
| Coinbase CDP | no citation in this checkout; nothing to diff until a config or SDK line appears. Base row mentions Smart Wallet. It does not name Coinbase or CDP. | `docs-site/docs/architecture/ecosystem.md:29` |
| Stripe | catalog only; no stripe package in either lockfile; API version and pricing if a seat starts calling it. Env name only: STRIPE_SECRET_KEY. | `src/mcps/registry.json:101`; also src/mcps/registry.json:106 |
| Resend | no citation in this checkout. That line is the verb. Searched this tree for resend.com and api.resend. No email-vendor hit. | `grok-bot/OP-PROC.md:64` |
| Moltbook | Railway auto-deploy; repo GHSA; no moltbook.com host is named in this tree. | `house/HOUSE.md:28` |
| Vercel | project config drift; outages; @vercel/node runtime break. Catalog env name: VERCEL_TOKEN. | `vercel.json:3`; also api/mcp.ts:160, src/mcps/registry.json:37 |
| Base | chain 8453 incidents; USDC contract change; x402 or EIP-3009 break; OP Stack upgrades. No viem or ethers package. Pay path cited is ows sign. | `docs-site/docs/architecture/ecosystem.md:29`; also grok-bot/skills/setup-ows-pay/SKILL.md:15 |
| Dynamo | PUBLIC_DYNAMO_SSOT or GOVERNANCE_ENDPOINT move; blurrn-mcp outage; solar verdict schema break. | `.agents/skills/dynamo/SKILL.md:12` |
| Jira | optional collector pull; API break and token name rotation. Env names only: JIRA_SITE, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECTS. | `house/burst/DEPLOY.md:205` |
| Community MCP catalog | third-party MCP repo compromise; API pricing and breaking changes for each vendor below. Env names only, from src/mcps/registry.json: DISCORD_TOKEN, SENTRY_AUTH_TOKEN, VERCEL_TOKEN, NOTION_TOKEN, TELEGRAM_BOT_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SLACK_BOT_TOKEN, JIRA_TOKEN, JIRA_URL, CONFLUENT_API_KEY, CONFLUENT_API_SECRET, WAZUH_API_KEY, WAZUH_URL, GITHUB_TOKEN, STRIPE_SECRET_KEY, X_BEARER_TOKEN, X_API_KEY. | `src/mcps/registry.json:2` |
| Debian bookworm and ffmpeg | base image rebuilds; unpinned apt ffmpeg; python3 on bookworm staying 3.11 while CI uses 3.12. | `house/live/app/Dockerfile:4`; also .github/workflows/mill-ci.yml:49 |

## 4. Runtimes and tooling

### Node

No .nvmrc and no .node-version in this checkout. CI is a single pin, not a version matrix. `package.json:41`.

| Where | Pin | What to watch | Source |
| --- | --- | --- | --- |
| 0xray engines | `>=24.22.1` | Node 24 CVEs after 24.22.1; a later 24.x is allowed by engines and refused by CI until the pin moves | `package.json:41` |
| xray-docs engines | `>=24.22.1` | same floor | `docs-site/package.json:46` |
| @0xray/grok-bot engines | `>=24.22.1` | same floor | `grok-bot/package.json:56` |
| @0xray/foundry engines | `>=24.22.1` | same floor | `scripts/foundry/package.json:61` |
| @0xray/repertoire engines | `>=24.22.1` | same floor | `vendor/@0xray/repertoire/package.json:27` |
| live-board engines | `>=24.22.1` | same floor | `house/live/app/package.json:12` |
| recall-bench-dummy-app engines | `>=24.22.1` | same floor | `examples/ben-proof/dummy/package.json:14` |
| CI env NODE_VERSION | `24.22.1` | security release newer than 24.22.1; no .nvmrc and no node-version matrix | `.github/workflows/mill-ci.yml:20` |
| Docker root image | `node:24.22.1-bookworm-slim` | tag rebuild without a digest pin; bookworm CVEs; Node CVEs | `Dockerfile:2` |
| Docker live-board image | `node:24.22.1-bookworm-slim` | same tag, plus apt python3 tzdata ca-certificates | `house/live/app/Dockerfile:2` |

Other workflow files that set `node-version` to `24.22.1` (or `${{ env.NODE_VERSION }}` where that env is `24.22.1`): `.github/workflows/auto-report.yml:43`, `.github/workflows/deploy-docs.yml:30`, `.github/workflows/dev-lane.yml:29`, `.github/workflows/enforce-agents-md.yml:22`, `.github/workflows/enforce-version-compliance.yml:22`, `.github/workflows/hermes-plugin.yml:41`, `.github/workflows/hermes-plugin.yml:66`, `.github/workflows/hermes-plugin.yml:123`, `.github/workflows/mill-ci.yml:20`, `.github/workflows/mill-ci.yml:30`, `.github/workflows/mill-ci.yml:45`, `.github/workflows/mill-ci.yml:65`, `.github/workflows/mill-ci.yml:82`, `.github/workflows/mill-ci.yml:101`, `.github/workflows/mill-ci.yml:117`, `.github/workflows/mill-ci.yml:130`, `.github/workflows/mill-ci.yml:144`, `.github/workflows/mill-monitor.yml:33`, `.github/workflows/processor-tests.yml:25`, `.github/workflows/processor-tests.yml:44`, `.github/workflows/processor-tests.yml:71`, `.github/workflows/publish.yml:16`, `.github/workflows/publish.yml:57`, `.github/workflows/release.yml:33`, `.github/workflows/security-audit.yml:19`, `.github/workflows/security-audit.yml:55`, `.github/workflows/security-monitoring.yml:23`, `.github/workflows/security.yml:18`.

### Python

| Where | Pin | What to watch | Source |
| --- | --- | --- | --- |
| mill-ci house/live tests | `3.12` | 3.12 CVEs; skew versus bookworm python3 3.11 | `.github/workflows/mill-ci.yml:147` |
| dev-lane | `3.12` | 3.12 CVEs | `.github/workflows/dev-lane.yml:33` |
| hermes-plugin | `3.11` | 3.11 CVEs; pytest breakage | `.github/workflows/hermes-plugin.yml:33` |
| live image apt python3 | `bookworm python3, cited as 3.11` | Debian point releases | `house/burst/DEPLOY.md:147` |

### GitHub Actions

Every `uses:` line. None are SHA-pinned.

| Action | Ref | SHA pin | What to watch | Source |
| --- | --- | --- | --- | --- |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/auto-report.yml:38` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/auto-report.yml:41` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/auto-report.yml:81` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/deploy-docs.yml:27` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/deploy-docs.yml:28` |
| actions/upload-pages-artifact | `v3` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/deploy-docs.yml:35` |
| actions/deploy-pages | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/deploy-docs.yml:49` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/dev-lane.yml:26` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/dev-lane.yml:27` |
| actions/setup-python | `v5` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/dev-lane.yml:31` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-agents-md.yml:17` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-agents-md.yml:20` |
| actions/github-script | `v7` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-agents-md.yml:34` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-agents-md.yml:68` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-version-compliance.yml:17` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/enforce-version-compliance.yml:20` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:28` |
| actions/setup-python | `v5` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:31` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:39` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:61` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:64` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:118` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/hermes-plugin.yml:121` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:27` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:28` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:42` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:43` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:62` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:63` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:77` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:80` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:98` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:99` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:114` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:115` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:127` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:128` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:141` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:142` |
| actions/setup-python | `v5` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-ci.yml:145` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-monitor.yml:30` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-monitor.yml:31` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/mill-monitor.yml:44` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:20` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:23` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:39` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:42` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:57` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:66` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/processor-tests.yml:69` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/publish.yml:11` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/publish.yml:14` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/publish.yml:52` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/publish.yml:55` |
| actions/github-script | `v7` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/publish.yml:78` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/release.yml:26` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/release.yml:31` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-audit.yml:14` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-audit.yml:17` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-audit.yml:40` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-audit.yml:50` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-audit.yml:53` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-monitoring.yml:18` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-monitoring.yml:21` |
| actions/upload-artifact | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security-monitoring.yml:65` |
| actions/checkout | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security.yml:13` |
| actions/setup-node | `v4` | no | moving major tag; action CVE; supply-chain swap of the tag | `.github/workflows/security.yml:16` |

### CLIs

| CLI | Pin | What to watch | Source |
| --- | --- | --- | --- |
| gh | unpinned | breaking gh major; auth changes; using plain gh where the seat App is required. Seat work uses a GitHub App mint, not plain gh. Collector and backfill call gh api. | `house/live/tools/backfill-history.mjs:30`; also docs-site/docs/guides/house.md:146 |
| railway | unpinned | CLI breaking release; login flow change; config plan/apply around the 2026-12-01 cutoff. deploy.sh links and the deploy notes use railway up. The collector lists deployments read-only. | `house/live/app/deploy.sh:13`; also house/burst/DEPLOY.md:153, house/live/feed/host_poll.py:7 |
| @0xray/foundry | 0.1.12 in scripts/foundry/package.json | breaking inspect or release; npm tag that does not match 0.1.12. Mill CLI. Inspect is the suit receipt. This is not Ethereum Foundry (forge, cast, anvil), which this tree does not install. | `grok-bot/lib/seat-doctor.cjs:734`; also scripts/foundry/package.json:3 |

### Docker base images

| Image | What to watch | Source |
| --- | --- | --- |
| `node:24.22.1-bookworm-slim` | digest drift; Node CVE; bookworm CVE | `Dockerfile:2` |
| `node:24.22.1-bookworm-slim` | same, plus apt packages python3 tzdata ca-certificates | `house/live/app/Dockerfile:2` |

