# NEAR stack: what's new, and what builders actually use (May to Nov 2026)

Seat: nibbler (feed scout). Date: 2026-11-15 (CT). Refs [#1082](https://github.com/0xRayAI/xray/issues/1082). Premise: [forge's comment](https://github.com/0xRayAI/xray/issues/1082#issuecomment-6899607470). Tables: [forge's working tables](https://github.com/0xRayAI/xray/issues/1082#issuecomment-6899635909).
Target path: `house/dist/nibbler/near-releases-2026-11.md`. Internal only. No public post from this file.

**Method.**
- X window: 2026-05-15 to 2026-11-15, as near asked. The window covers NEAR AI Cloud, Shade Agents, Intents/1Click/Confidential, Chain Signatures/MPC, OutLayer, TEE and x402 on NEAR. About 30 reads this leg, using the `x` search_posts_all tool.
- GitHub releases: read via the nibbler0x App, 2026-09-16 onward.
- npm downloads: `api.npmjs.org/downloads/point/last-month/<pkg>`, read 2026-11-15. These include CI and bot installs, so treat them as relative signal only.
- Hackathon text: the 2,437 submission descriptions in `/workspace/nearhack/all.jsonl` (see the #1100 catalog).
- Every row cites its source. Where only X says it, the X post is the source, and near should check it against the docs.

## 1. Release timeline

Newest first. "X" means the source is an X post, and near should check it against the docs. "GH" means a GitHub release or commit.

| Date (UTC) | Component | What changed | Source |
|---|---|---|---|
| 2026-11-14 | NEAR AI Cloud (gateway) | Production promotions continue almost daily (prod-20261112 to 20261114, including a rollback on 11-13), each with a Sigstore digest | GH https://github.com/nearai/cloud-api/releases/tag/prod-20261114-b26eb02 |
| 2026-11-13 | NEAR AI Gateway for macOS | "Private AI models in Claude Code, Codex and OpenCode, a couple of clicks away … earn inference credits for the traces you share" | X https://x.com/near_ai/status/2121033274890084753 (builder post: https://x.com/zmanian/status/2120921603060212110) |
| 2026-11-12 | Chain Signatures / MPC 3.19.0 | Removes presignatures from ECDSA threshold signing, whitelist and enforcement for Foreign Chain Transactions, attestation expiry taken from collateral (**breaking** contract change) | GH https://github.com/near/mpc/releases/tag/3.19.0 |
| 2026-11-12 | NEAR AI Cloud models | "Claude Fable 5.2 is live on NEAR AI Cloud … 1M-token context" | X https://x.com/near_ai/status/2120965599631405348 |
| 2026-11-12 | Intents SDK 0.97/0.98 | `@defuse-protocol/intents-sdk` 0.98.0: **breaking** Stellar error rename. Releases come about weekly (0.93 to 0.98 since Oct 23) | GH https://github.com/defuse-protocol/sdk-monorepo/releases/tag/%40defuse-protocol/intents-sdk%400.98.0 |
| 2026-11-11 | near-api-js 7.5.0 | NEP-616 deterministic accounts (`createDeterministicAccount`), global contract refs in `getState()`, `decodeSignedDelegate()` for meta-tx | GH https://github.com/near/near-api-js/releases/tag/near-api-js%407.5.0 |
| 2026-11-10 | NEAR AI Cloud incident | "On November 8, an attacker used a vulnerability in SGLang, the inference engine we run, to access part of our infrastructure. We've closed the access and fixed it." | X https://x.com/near_ai/status/2120043366444601458 · back online: https://x.com/near_ai/status/2119996627654197384 |
| 2026-11-10 | OutLayer v0.2.1 to v0.2.3 | Worker and keystore Docker images published with Sigstore attestation (`gh attestation verify …`). CLI v0.2.3 on 11-11 | GH https://github.com/out-layer/outlayer/releases/tag/v0.2.1 · https://github.com/out-layer/outlayer-cli/releases/tag/v0.2.3 |
| 2026-11-09 | Intents to MPP SDK 0.4.1 | `@defuse-protocol/nearintents-mpp-sdk`: reference nearintents payment method for MPP (0.2.0 on 9-21, 0.3.0 on 10-22, 0.4.0 on 11-02) | GH https://github.com/defuse-protocol/nearintents-mpp-sdk/releases/tag/%40defuse-protocol/nearintents-mpp-sdk%400.4.1 |
| 2026-11-09 | near-api-ts 0.13.0 | `PublicKeyId` for ed25519, secp256k1 and ml-dsa-65 (hash) keys | GH https://github.com/near/near-api-ts/releases/tag/near-api-ts%400.13.0 |
| 2026-11-08 | NEAR AI inference SDK v0.3.0 | JS/Python/Rust/Go at one version; releases response bodies after verification | GH https://github.com/nearai/inference-sdk/releases/tag/v0.3.0 |
| 2026-11-06 | cargo-near 0.23.0 | nearcore 2.14 support, `cargo near new` template image update | GH https://github.com/near/cargo-near/releases/tag/cargo-near-v0.23.0 |
| 2026-11-05 | near-cli-rs 0.31.0 | nearcore 2.14, `contract verify --offline-build`, ghcr cargo-near images, MT-FT balances, `sign_with_mpc` fix | GH https://github.com/near/near-cli-rs/releases/tag/v0.31.0 |
| 2026-11-05 | near-sdk-rs 5.30.1 / 5.30.2 | Universal accounts feature-gated, storage flush fix, bounded-type follow-ups | GH https://github.com/near/near-sdk-rs/releases/tag/near-sdk-v5.30.1 |
| 2026-11-03 | October recap (official) | Confidential Intents TVL $145M+, 1M+ NEAR staked for confidential inference, Brave Leo on NEAR AI Cloud, NEAR AI Red, NEAR AI Trust Center, new models | X https://x.com/NEARProtocol/status/2117447545328746816 |
| 2026-10-30 to 11-04 | NEAR AI Red sandbox (rts) v0.1.0 to v0.1.2 | microVM sandbox for agentic security research (macOS, brew) | GH https://github.com/nearai/nearai-red-sandbox/releases/tag/v0.1.0 |
| 2026-10-27 | NEAR AI inference SDK v0.2.0 | Verified Responses API, image-provenance verification, DCAP 0.7.0 | GH https://github.com/nearai/inference-sdk/releases/tag/v0.2.0 |
| 2026-10-26 | nearcore 2.14.0 (protocol upgrade) | Gas rewards removed (30% to 0%, HSP-027), `ml_dsa_verify` host function (post-quantum sigs). Notes say it can't be rolled back | GH https://github.com/near/nearcore/releases/tag/2.14.0 |
| 2026-10-24 | create-near-app v10.0.0 | Rust-only contract template with sandbox tests; front ends use `near-connector` directly | GH https://github.com/near/create-near-app/releases/tag/v10.0.0 |
| 2026-10-23 | near-api-js 7.4.0 | Gas keys (NEP-611): `TransferToGasKey` / `WithdrawFromGasKey`, nonce-lane rotation | GH https://github.com/near/near-api-js/releases/tag/near-api-js%407.4.0 · X https://x.com/guillewrotethis/status/2113960727325401361 |
| 2026-10-22 | Chain Signatures in TEEs | "Chain Signatures Now Run Entirely Inside TEEs, Making Every Operation Verifiable Onchain" | X https://x.com/NEARProtocol/status/2113254511527465454 · OutLayer take: https://x.com/out_layer/status/2113306906840236061 |
| 2026-10-16 | NEAR Agent Market | Marketplace: buyers hire agents by the job, builders set price, "get paid when the buyer accepts the work" | X https://x.com/NEARProtocol/status/2111240788071911763 |
| 2026-10-15 | MPC network | "NEAR's MPC network now runs with 17 live mainnet operators" | X https://x.com/NEARProtocol/status/2110825732146713061 |
| 2026-10-14 | NEAR AI Trust Center | Security controls with live status, subprocessor list, compliance docs | X https://x.com/near_ai/status/2110447260031217991 |
| 2026-10-13 | MPC 3.17.0 | Preset foreign-chain config, vote-then-submit upgrades, **SDK SVM (Solana) support**, TEE attestation robustness | GH https://github.com/near/mpc/releases/tag/3.17.0 |
| 2026-10-12 | OutLayer connectors | Hyperliquid and Polymarket connectors: the enclave derives venue keys and signs orders (Voulai in production) | X https://x.com/out_layer/status/2109731176135131430 |
| 2026-10-05 | OutLayer Agent Custody to Web2 | Agent custody model extended to bank, email, GitHub and trading logins. Agent "never sees the keys" | X https://x.com/out_layer/status/2107207684936045003 (approval envelopes: https://x.com/out_layer/status/2106423546524361130) |
| 2026-10-05 | Intents limit orders on LeoDEX | Builders add limit orders across 30+ chains, optionally confidential | X https://x.com/near_intents/status/2107162733519216919 |
| 2026-09-29 to 10-14 | NEAR AI inference SDK v0.1.0 | First verifiable-AI SDKs: JS (9-29), Python (9-30), Rust (10-12), Go (10-14) | GH https://github.com/nearai/inference-sdk/releases/tag/javascript-v0.1.0 |
| 2026-09-23 | 1Click to Ondo tokenized stocks | "Any app can now bring RWAs to users, with Confidential Execution as a parameter" | X https://x.com/NEARProtocol/status/2102781474223353996 |
| 2026-09-21 | Intents limit orders | "Limit Orders are now live on NEAR Intents, with the option to make them confidential too" | X https://x.com/near_intents/status/2102097843989479756 |
| 2026-09-18 | NEAR AI Cloud on SayGm | Confidential inference on SayGm's TDX-routed tier | X https://x.com/near_ai/status/2101053165730988390 |
| 2026-09-17 | NEAR Connect + EVM wallets | NEP-518 wallet manifest so MetaMask-style wallets work in near-connect again | X https://x.com/guillewrotethis/status/2100524586873794580 |
| 2026-09-17 | NEAR AI Cloud models | "Grok 4.6 is live on NEAR AI" | X https://x.com/near_ai/status/2100594172579184780 |
| 2026-09-16 | Shade Agent framework | shade-agent-js fetches quote collateral from PCCS instead of Phala's verify endpoint. **Last feature commit in the window** (one chore commit on 10-14) | GH https://github.com/NearDeFi/shade-agent-framework/commits/main |
| 2026-09-01 | August recap (official) | **NEAR AI Cloud integrated Intel Trust Authority**, Confidential Intents TVL $50M+, MPP adopted Intents, 500k+ NEAR staked for inference | X https://x.com/NEARProtocol/status/2094897820947890213 |
| 2026-08-14 | **x402 on NEAR**: Agent Payments Skill | "funds Base USDC payments from any of 30+ chains via NEAR Intents" | X https://x.com/NEARProtocol/status/2088324140163801440 · https://x.com/near_intents/status/2089079720298287562 · launch: https://x.com/proximityfi/status/2088317678511628559 |
| 2026-08-04 | MPP (Stripe + Tempo) to Intents | "any agent on MPP [can] settle across 30+ chains using NEAR infrastructure" | X https://x.com/NEARProtocol/status/2084712276045545520 |
| 2026-08-02 | July recap (official) | nearcore 2.13 (quantum-safe signing, dynamic resharding), staking for NEAR AI compute, IronClaw 1.0, Confidential Intents via 1Click | X https://x.com/NEARProtocol/status/2083718998345023656 |
| 2026-07-30 | Staking for NEAR AI | "Put Your NEAR to Work Powering Confidential AI" | X https://x.com/near_ai/status/2082872556411867568 |
| 2026-07-27 | IronClaw 1.0 | NEAR AI's agent OS, rebuilt (repo nearai/ironclaw, 12.7k★) | X https://x.com/near_ai/status/2081819363099750775 · GH https://github.com/nearai/ironclaw |
| 2026-07-24 | Confidential Intents in wallets | Live on Meteor (and Aurora 7-15, LeoDEX 7-16) | X https://x.com/near_intents/status/2080641515073024182 |
| 2026-07-21 | OutLayer post-quantum | "TEE workers now sign on-chain with ML-DSA-65 … key generated inside the Intel TDX enclave" | X https://x.com/out_layer/status/2079550294317293607 |
| 2026-06-12 | Chain Signatures explainer | "From Islands to Networks: The Breakthrough of Chain Signatures" | X https://x.com/NEARProtocol/status/2065466263972028440 |
| 2026-06-08 | 1Click in Unstoppable Wallet | 1Click Swap API across app, Telegram bot and web | X https://x.com/NEARProtocol/status/2064009013948248086 |

**Shade Agents gap.** I found no official X post on Shade Agents in six months (search: `shade` from NEARProtocol, near_ai, NearBuilders and others returned 0). The only Shade commits are the September PCCS change above, and the docs.near.org Shade URL now redirects to "Tools for AI Agents" (noted in #1100). Shade Agents looks quiet. OutLayer is the attested-worker path that is actively shipping.

## 2. What builders actually use (evidence)

| Signal | Evidence | Source |
|---|---|---|
| **near-api-js is the default JS client** | 978k npm downloads last month (`@near-js/accounts` 800k). near-kit is 43k; near-api-ts is under 1k | https://api.npmjs.org/downloads/point/last-month/near-api-js · …/near-kit · …/near-api-ts |
| **1Click is the Intents entry point** | `one-click-sdk-typescript` 124k/month vs `intents-sdk` 62k. Wallets and apps integrate "the 1Click Swap API" (Unstoppable, NOMO, xPortal via Aurora) | https://api.npmjs.org/downloads/point/last-month/@defuse-protocol/one-click-sdk-typescript · https://x.com/near_intents/status/2112574950389494082 |
| **NEAR AI inference SDK is getting used** | `@nearai/inference-sdk` 20.7k/month after launching on 9-29 | https://api.npmjs.org/downloads/point/last-month/@nearai/inference-sdk |
| **Shade Agents barely used** | `@neardefi/shade-agent-js` 7.3k/month. Only 2 of 2,437 hackathon descriptions mention Shade | https://api.npmjs.org/downloads/point/last-month/@neardefi/shade-agent-js · `/workspace/nearhack/all.jsonl` |
| **OutLayer is small but used in serious builds** | `@outlayer/sdk` 3k/month. 8 hackathon descriptions (Fulfil, Keyturn, NEAR Books) | https://api.npmjs.org/downloads/point/last-month/@outlayer/sdk |
| **Front end: wallet-selector still leads, NEAR Connect rising** | `@near-wallet-selector/core` 231k vs `@hot-labs/near-connect` 67k. create-near-app v10 moved to near-connector. A builder "2026 stack" post lists NEAR Connect + near-api-js v7 / near-kit + near-connect-hooks | npm links above · GH https://github.com/near/create-near-app/releases/tag/v10.0.0 · X https://x.com/Param_eth/status/2115836811901825241 |
| **Hackathon builders pick Intents + NEAR AI + TEE** | Out of 2,437 descriptions: "intents" 227, NEAR AI / private inference 130, TEE/TDX/attest 131, escrow 96, Chain Signatures 43, function-call/limited key 35, x402 24, 1Click 22, OutLayer 8, Shade 2 | `/workspace/nearhack/all.jsonl` (counts as of 2026-11-15) |
| **Testnet first** | 229 descriptions say testnet vs 63 mainnet | same |
| **Verified-inference receipts appear in real demos** | "every answer carries a signature … 'Response Verified' in the NEAR AI Verification Center" | X https://x.com/techmeat/status/2121736800716644576 · https://x.com/kuvos_AI/status/2121730658297131190 |
| **Agent OS gravity: IronClaw** | nearai/ironclaw has 12.7k GitHub stars, the biggest NEAR AI repo by far | GH https://github.com/nearai/ironclaw |

## 3. Top builder pain points (quoted, with sources)

| # | Pain | Quoted gist | Source |
|---|---|---|---|
| 1 | **Intents/1Click has no testnet** | "NEAR Intents has no testnet … you either test with real funds or you don't test at all." Two hackathon teams built 1Click sandboxes (Tidepool, Agent Airbag) | https://x.com/priva_cie/status/2116726168930168843 · https://x.com/0xmdrakib/status/2121753144321622019 |
| 2 | **TEE attestation is easy to "pass" but hard to judge** | "A valid Intel signature is not a verdict." / an ITA token from NEAR AI Cloud "verified, but graded the platform OutOfDate with ten open Intel advisories." / "Most [private AI] is a promise, not a proof." | https://x.com/ezhovinc/status/2102045895525089778 · https://x.com/ownyourmindai/status/2116022116491616531 · https://x.com/Southen13/status/2119345072755847605 |
| 3 | **Inference-provider security** | NEAR AI's Nov 8 SGLang breach, plus pushback: "NEAR AI doesn't build the models … their job is basically to keep other people's software" [patched] | https://x.com/near_ai/status/2120043366444601458 · https://x.com/ajki76/status/2120242615681462589 |
| 4 | **SDK churn and migrations** | "v7 replaces the old @near-js packages, so older snippets may need the migration guide." / near-sdk 5.0 to 5.17 migration hole "open to anyone". Intents SDK ships breaking renames (0.98.0) | https://x.com/scopebots/status/2119459993321615494 · https://x.com/maxwell_nikola/status/2120504115667378651 · GH intents-sdk 0.98.0 |
| 5 | **RPC and testnet reliability or cost** | "FastNEAR … from $69/mo, no free tier listed." / "Current RPC reads can be unavailable" | https://x.com/scopebots/status/2119459996333150590 · https://x.com/DriftTrader8/status/2120550549401841998 |
| 6 | **Docs and tooling drift** | "Docs move mid-hackathon too. The Graph's supported-networks list no longer includes NEAR." / cargo-near "reproducible builds run … from committed, pushed source only. Uncommitted changes are ignored." / Shade docs URL redirects (see §1) | https://x.com/scopebots/status/2120184765206651224 · https://x.com/scopebots/status/2119459991966945346 |
| 7 | **Agent Skills not reusable as code** | "NEAR Agent Skills … guidance only, and the repo states no license." | https://x.com/scopebots/status/2119459994911248390 |
| 8 | **Wallet migrations break onboarding** | NEP-518 EVM-wallet support "was lost when we transition[ed] to near-connect" until a community fix | https://x.com/guillewrotethis/status/2100524586873794580 |
| 9 | **Intents trust model confusion** | "This is a legit confusion around @near_intents … 'one day they will silently take your money' is wrong" | https://x.com/vinibarbosabr/status/2098789415199879205 |

## 4. What this means for xray kits (the dead-simple build path)

1. **Testnet first, including Intents.** Our kits must ship a 1Click-shaped mock or sandbox so the 5-minute demo needs no real funds (pain #1). Options: reuse Tidepool (MIT, [Watchmeecryt/tidepool](https://github.com/Watchmeecryt/tidepool) per #1100), or a local mock against the official 1Click OpenAPI. Mill decides.
2. **Pay-APIs kit = 1Click + x402 skill + MPP SDK.** NEAR's own x402 path funds **Base USDC** x402 payments via Intents (Aug 14). That plugs straight into our Base x402 work, so the kit wraps it rather than inventing a NEAR-side x402.
3. **Verify, don't just attest.** The NEAR AI TEE kit should call `@nearai/inference-sdk` (v0.3.0) verification and show a pass/fail **policy** result (TCB status, image provenance), not just "signature OK" (pain #2). It should show a Verification Center receipt link in the demo.
4. **Pin versions and bundle migrations.** near-api-js 7.5, near-sdk-rs 5.30.x, cargo-near 0.23, near-cli-rs 0.31, intents-sdk pinned (weekly breaking changes), nearcore 2.14 behaviour (no gas rebate). The factory recipe should pin these and run a cold-test on upgrade (pain #4).
5. **Chain Signatures kit can lean on the new trust story.** MPC is now fully TEE-run, verifiable on-chain, with 17 operators, and has an SVM SDK since 3.17. Base/EVM signing is the demo. Watch 3.19's breaking contract change.
6. **Prove-worker kit = OutLayer, not Shade.** OutLayer is shipping weekly (Sigstore-attested images, Agent Custody, connectors, post-quantum signing). Shade has been quiet since September. Treat Shade as "watch" until near confirms docs status.
7. **Front end = NEAR Connect via create-near-app v10**, with wallet-selector as fallback (still 3x the downloads). Include the NEP-518 EVM wallet manifest so Base users can log in.
8. **Pick your own RPC.** Kits default to a public RPC from the official list, with an env override, and say so in the README (pain #5).
9. **Do not copy agent-skills text** (no license). Link to it instead (pain #7).
10. **Distribution hook:** the NEAR Agent Market (Oct 16) is where finished xray agents can be listed and paid on acceptance. Worth a later pack.

## Gaps

- No official NEAR or NEAR AI blog or changelog feed was read directly. Monthly "What NEAR shipped" X recaps stand in for it, and near should check them against the docs. I found no September recap; Intents posted a September metrics thread instead (https://x.com/NEARProtocol/status/2107135249943789984).
- NEAR AI Gateway for macOS has no docs page found yet (X post only).
- `near/intents`, `near/near-sdk-js`, `near/wallet-selector`, `NearDeFi/shade-agent-framework`, `defuse-protocol/one-click-sdk-typescript` and `near/agent-skills` publish **no GitHub releases** in the window. Check tags and npm instead.
- npm counts include CI and bots. X results are claims, and near verifies them against the docs.
