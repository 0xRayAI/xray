# NEAR stack map (2026-11-15)

Owner: near (NEAR ecosystem scout). Accountable: forge. Target repo path: `house/dist/near/near-stack-map-2026-11.md`.

**Sources: official only.** docs.near.org (incl. `llms.txt` / `llms-full.txt`), docs.near.ai, near.ai/blog, near.org/blog, docs.near-intents.org (incl. its changelog and the 1Click OpenAPI spec), github.com/near, github.com/nearai, github.com/NearDeFi, npm / crates.io / PyPI registry data, and one read-only mainnet RPC view call (`v1.signer.state`). Versions and dates come from the registries, read 2026-11-15 (CT). Anything that isn't backed by an official source is marked **unverified**. Testnet first; nothing here was deployed or paid for.

Legend: **DEPRECATED** = an official source says don't use it, or the repo is archived. "Third-party, docs-listed" = the official docs link to it but don't own it.

---

## 1. Smart contracts

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| near-sdk (Rust) | The **only** official contract SDK, according to the docs ("NEAR's only official smart-contract SDK is near-sdk-rs") | Any on-chain logic: escrow, key gates, intents hooks | crate `near-sdk` 5.30.2 (2026-11-13), MIT/Apache-2.0 | No | https://docs.near.org/tools/sdk · https://github.com/near/near-sdk-rs |
| near-sdk-js (JS/TS contracts) | Old JS contract SDK | Don't use it | npm `near-sdk-js` 2.0.0 (2024-06-07); repo **archived**; README says "DEPRECATED / DO NOT USE" | **DEPRECATED** | https://github.com/near/near-sdk-js |
| Python contract SDK | none official | n/a | No official Python *contract* SDK (Python is for clients only, see §2) | n/a | https://docs.near.org/tools/sdk |
| cargo-near | Builds, ABIs and reproducible builds for Rust contracts; scaffolds new ones | Every Rust contract build/deploy | crate 0.23.0 (2026-11-06) | No | https://github.com/near/cargo-near · https://docs.near.org/smart-contracts/quickstart |
| near-cli-rs (`near`) | The official CLI: accounts, keys, deploy, calls | Deploys, scripting, agents that have a terminal | crate/npm `near-cli-rs` 0.31.1 (2026-11-05) | No | https://docs.near.org/tools/cli |
| near-cli (JS) | Old JS CLI | Don't use it | npm `near-cli` 4.0.13 (2024-03-20); repo **archived** | **DEPRECATED** (archived; docs only point to near-cli-rs) | https://github.com/near/near-cli |
| near-sandbox (Rust/JS wrappers) | Runs a local NEAR node for tests | Integration tests, CI | crate `near-sandbox` 0.4.1 (2026-11-12, MIT/Apache); npm `near-sandbox` 0.3.5 (2026-11-04). The node binary repo `near/near-sandbox` is **GPL-3.0** | No (the docs' recommended test path) | https://docs.near.org/smart-contracts/testing/integration-test · https://github.com/near/near-sandbox-rs |
| near-workspaces (rs / js) | Older test harness on top of the sandbox | Existing test suites | crate 0.24.0 (2026-10-26); npm 5.0.0 (2025-03-13, JS side stale) | Not marked deprecated; docs now lead with near-sandbox + near-api | https://github.com/near/near-workspaces-rs · https://github.com/near/near-workspaces-js |
| Global contracts | Deploy once, reuse the code across many accounts | Factories (one kit contract → many agent accounts) | Protocol feature, documented | No | https://docs.near.org/smart-contracts/global-contracts |
| Yield / resume | A contract pauses and waits for an off-chain response | TEE workers (OutLayer), oracles, MPC signing | Protocol feature, documented | No | https://docs.near.org/smart-contracts/anatomy/yield-resume |

## 2. Front ends and client libraries

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| near-api-js v7 | Official JS/TS client, now a single package | Agents/apps that read, sign and send txs from JS | npm 7.5.3 (2026-11-11) | No | https://docs.near.org/tools/near-api · https://github.com/near/near-api-js |
| `@near-js/*` split packages | The v6-era modular packages | Only for legacy code; the near-api-js README has a migration guide away from them | npm 2.5.1 (2025-11-06), no new release in a year | Not formally deprecated on npm, but superseded by near-api-js v7 | https://github.com/near/near-api-js (MIGRATION.md) |
| near-kit (TS / Rust / Python) | Lighter client by r-near; used by the docs' Python examples and the `near-kit` agent skill | Simple TS clients, Python clients, sandbox tests | npm `near-kit` 0.20.2 (2026-09-24) | No. Owned by github.com/r-near, but docs.near.org and near/agent-skills feature it | https://docs.near.org/tools/near-api · https://github.com/r-near/near-kit |
| near-api (Rust client) | Official Rust client | Rust agents, tests | crate 0.8.7 (2026-10-28) | No | https://github.com/near/near-api-rs |
| NEAR Connect (`@hot-labs/near-connect`) | The current wallet connector; runs wallet code in sandboxed iframes; HOT, Meteor, Nightly, WalletConnect and more | Any browser dApp login / signing | npm 0.12.0 (2026-10-26); repo `azbang/near-connect` (built by HOT, endorsed by the docs) | No. This is the docs' replacement for wallet selector | https://docs.near.org/tools/near-connect · https://docs.near.org/web3-apps/tutorials/wallet-login |
| Wallet Selector (`@near-wallet-selector/*`) | Old wallet modal | Don't use it | npm 10.1.4 (2025-12-04); repo `near/wallet-selector` **archived**; docs: "Do not use … deprecated and no longer maintained" | **DEPRECATED** | https://docs.near.org/tools/near-connect |
| create-near-app | Scaffolds a contract plus front end | A quick starter | npm 10.0.0 (2026-10-24) | No | https://github.com/near/create-near-app · https://docs.near.org/web3-apps/quickstart |
| BOS / Near Social components (VM, gateway, widgets) | Old on-chain component framework | Don't build on it | Docs: "the BOS framework (components/widgets) is deprecated". npm `near-social-vm` 2.3.1 (2023); near/near-discovery last push 2025-10 | **DEPRECATED** (framework) | https://docs.near.org/primitives/social |
| SocialDB (`social.near`) + near-social-js | The on-chain social graph (profiles, posts, follows) | Agent profiles / social features without BOS | Live and maintained per the docs; npm `near-social-js` 2.0.4 (repo NEARBuilders, docs-linked) | No | https://docs.near.org/primitives/social |
| web4 | Serves a website from a contract (`*.near.page`) | — | **Not in official docs**: zero mentions across docs.near.org `llms-full.txt`. Code lives at github.com/vgrichina/web4 (personal account, last release v0.5.0 in 2023, last push 2025-11); npm `web4-deploy` 0.8.0 (2025-02) | **Unverified / not an official NEAR product today**. Treat as legacy community tooling | none official |
| Privy / NEAR Auth logins | Social logins for dApps | See §3 | — | — | https://docs.near.org/web3-apps/tutorials/privy |

## 3. Accounts and keys

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| Named and implicit accounts | Human-readable `alice.near` accounts, or 64-hex implicit accounts created by a transfer | Every agent identity | Protocol | No | https://docs.near.org/protocol/accounts-contracts/account-id · https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts |
| **Universal accounts (`0u…`)** — new | Address = hash of the account's initial state; created with `UniversalStateInit` (relayer-assisted, self-signed, or from a contract) | Deterministic agent accounts, counterfactual addresses | Needs protocol v88 / nearcore 2.14.0. The docs say near-api-js/near-kit helpers are "expected to follow" (raw txs today) | No (new) | https://docs.near.org/protocol/tutorials/creating-universal-accounts |
| Deterministic accounts | Accounts derived from a published global contract | Factory-made per-agent accounts | Documented | No | https://docs.near.org/protocol/tutorials/creating-deterministic-accounts |
| Access keys: full-access / function-call | A FC key is limited to one contract, chosen methods, and a gas allowance | **Scoped agent trading keys** (nearswaps row): no seed phrase in the agent | Protocol | No | https://docs.near.org/protocol/accounts-contracts/access-keys |
| **Gas keys (NEP-611)** — new | An access key with its own prepaid gas balance and up to 1,024 parallel nonce lanes | A fleet of agents or a relayer sending many txs from one account | Since nearcore 2.13 (protocol 86). Deleting a key burns its balance, so withdraw first | No (new; near-api-js support since 7.4.0, 2026-10-23) | https://docs.near.org/protocol/accounts-contracts/gas-keys |
| Meta-transactions (NEP-366) | The user signs a `DelegateAction` and a relayer pays the gas | Gasless agents; also the basis of x402 `exact` on NEAR | Protocol | No | https://docs.near.org/protocol/transactions/meta-tx · https://docs.near.org/web3-apps/tutorials/meta-transactions |
| Relayer reference (`pagoda-relayer-rs`) | Reference NEP-366 relayer | Running your own relayer | Repo near/pagoda-relayer-rs, last push 2025-02 (stale, but still the docs' reference) | Not marked deprecated; stale | https://github.com/near/pagoda-relayer-rs |
| NEAR Auth (`@fast-auth-near/*`) | Web2 login (Google, Apple, email, **passkeys**) signing NEAR txs through MPC; Auth0-based | Onboarding humans with no seed phrase | npm `@fast-auth-near/react-sdk` 1.3.1 (2026-07-24), `@fast-auth-near/javascript-provider` 1.4.1 (2026-06-09). Mainnet needs approved Auth0 credentials (apply); testnet is open | No | https://docs.near.org/web3-apps/tutorials/near-auth · https://docs.auth.near.org |
| FastAuth signer (old) | The previous FastAuth iframe signer | Don't use it | Repo near/fast-auth-signer **archived**; the old docs page `tools/fastauth-sdk` returns 404 | **DEPRECATED** (replaced by NEAR Auth) | https://github.com/near/fast-auth-signer |
| Passkey key lib (`@near-js/biometric-ed25519`) | WebAuthn-derived ed25519 keys | Only if you're rolling your own passkey flow | npm 2.5.1 (2025-11-06) | Not marked; the docs now route passkeys through NEAR Auth | https://github.com/near/near-api-js |
| Backend auth (NEP-413 style signed messages) | Verify a NEAR user in your backend | Agent APIs that log in with a NEAR account | Documented | No | https://docs.near.org/web3-apps/backend/backend |

## 4. Chain Signatures

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| MPC signer contract | A NEAR account or contract calls `sign` and the threshold network returns an ECDSA/EdDSA signature for another chain | One NEAR agent acting on Base / ETH / BTC / SOL | Contract ids per the docs: mainnet **`v1.signer`**, testnet **`v1.signer-prod.testnet`**. Live mainnet state read 2026-11-15: **threshold 11, 16 participants**. The docs tell you to read the live set from the contract instead of trusting a fixed number | No | https://docs.near.org/chain-abstraction/chain-signatures · https://docs.near.org/chain-abstraction/chain-signatures/implementation |
| MPC node network (near/mpc) | Node software for the signer; now also runs in Intel TDX (blog 2026-10-23) | Background / trust model | Latest release 3.19.0 (2026-11-12: removes ECDSA presignatures, attestation expiry from collateral); 3.17.0 (2026-10-13) | No | https://github.com/near/mpc · https://www.near.org/blog/chain-signatures-tee · https://mpc.nearone.org/ |
| chainsig.js | JS library: derive addresses, build payloads, sign, broadcast; has an EVM adapter (Ethereum, Base and others via RPC URL) | Off-chain agent signing for EVM/BTC/SOL | npm `chainsig.js` 1.1.16 (2026-05-12), repo NearDeFi/chainsig.js (linked from the docs) | No | https://github.com/NearDeFi/chainsig.js |
| Official EVM / Base example | near-examples/near-multichain `EVM.jsx`; the docs list Base as supported via the EVM adapter | Template for a "sign on Base" demo | Repo active (push 2026-10-28) | No | https://github.com/near-examples/near-multichain · https://docs.near.org/chain-abstraction/chain-signatures/implementation |
| omni-transaction-rs | Builds foreign-chain txs inside Rust contracts | Contract-side multichain signing | crate `omni-transaction` 0.5.0 (2026-09-09) | No | https://github.com/near/omni-transaction-rs |
| Omni Bridge | Asset bridge built on Chain Signatures | Moving assets on and off NEAR | Documented; also routed via Intents | No | https://docs.near.org/chain-abstraction/omnibridge/overview |
| Multichain gas relayer | Older concept | — | **Not found** in current docs.near.org (no page in `llms.txt`) | Unverified; treat as gone | none |

## 5. NEAR Intents / 1Click / Confidential Intents

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| NEAR Intents protocol (Verifier `intents.near`) | The user or agent states an outcome, solvers compete, and the Verifier contract settles | Cross-chain pay / swap for agents | Contracts at near/intents (moved from defuse-protocol/defuse-contracts) | No | https://docs.near.org/chain-abstraction/intents/overview · https://docs.near-intents.org |
| **1Click Swap API** | REST API: `GET /v0/tokens`, `POST /v0/quote`, `GET /v0/status`, `POST /v0/deposit/submit`, plus `/v0/generate-intent`, `/v0/submit-intent`, `/v0/orders`, `/v0/account/*`, `/v0/auth/*`. Server **`https://1click.chaindefuser.com`** per the official OpenAPI. Auth: `X-API-Key` (recommended) or JWT | The simplest agent pay/swap path | Live. The OpenAPI spec is the source of truth | No | https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api · https://1click.chaindefuser.com/docs/v0/openapi.yaml |
| 1Click TS SDK | Typed client for 1Click | JS agents | npm `@defuse-protocol/one-click-sdk-typescript` 0.1.26 (2026-09-22) | No | https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk |
| Intents SDK | Full library (deposits, withdrawals, signing intents) | Deeper integrations than 1Click | npm `@defuse-protocol/intents-sdk` 0.98.0 (2026-11-12), pre-1.0 and moving fast | No | https://docs.near-intents.org/integration/devkit/intents-sdk |
| Confidential Intents | A private chain with shielded balances, connected to NEAR through a TEE bridge | Agent trading without exposing size or route | GA blog 2026-07-07; B2B launch 2026-07-13; **since 2026-10-27 every 1Click swap settles confidentially** (no API change; `nearTxHashes` returns shield/unshield hashes) | No | https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/confidential-swaps · https://www.near.org/blog/announcing-general-availability-of-confidential-intents |
| Limit orders (confidential) | A resting swap at the user's price | Agent limit trading | Launched 2026-08-28 | No | https://docs.near-intents.org/integration/distribution-channels/1click-api/orders |
| Bridge API | Old deposit-address / status API | Don't use it | **Closing from 2026-11-11**; replaced by 1Click (standing addresses = reusable deposit addresses) | **DEPRECATED / sunset** | https://docs.near-intents.org/changelog/overview |
| Legacy HOT `nep245` token IDs (BNB, Polygon, Avalanche) | Old asset ids | Hardcoded token maps | Replaced by Omni `nep141` ids (2026-11-09) | **Superseded** | https://docs.near-intents.org/changelog/overview |
| Intents agent skill | `near-intents` skill (1Click) | Coding agents | In near/agent-skills | No | https://docs.near-intents.org/integration/devkit/skills |

## 6. NEAR AI

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| NEAR AI Cloud (gateway) | OpenAI-compatible API at `https://cloud-api.near.ai/v1`; models run in Intel TDX + NVIDIA TEE | Private, attestable inference for agents | Live | No | https://docs.near.ai/cloud/quickstart · https://docs.near.ai/cloud/private-inference |
| Model catalog / privacy tiers | Confidential TEE vs 3P Confidential vs Incognito (Incognito = only the gateway is in a TEE) | Choosing a model that really is private | Live | No | https://docs.near.ai/cloud/models |
| Attestation endpoint | `GET https://cloud-api.near.ai/v1/attestation/report` (gateway + model attestation), plus TLS binding, response signatures, image provenance and a verification policy | Proving which model and code ran | Documented as current | No | https://docs.near.ai/cloud/verification/cloud-api/model-attestations · https://docs.near.ai/cloud/verification/cloud-api/gateway-attestation |
| Inference SDK | Verified completions: checks the gateway signature before the call and `verifyResponse(id)` after; also E2EE chat | The easy way to do the above | npm `@nearai/inference-sdk` 0.3.0, PyPI `nearai-inference-sdk` 0.3.0, crate `nearai-inference-sdk` 0.3.0 (all 2026-11-08); Go `github.com/nearai/inference-sdk/go` | No (pre-1.0) | https://docs.near.ai/cloud/inference-sdk/index |
| Verification Center (+ embeddable widget) | Check attestations and reply signatures in the browser, no code | Human-facing proof | Documented | No | https://docs.near.ai/cloud/verification/verification-center |
| Direct completions | Calls one model's TEE endpoint directly, skipping the gateway | — | Docs: **Experimental, not recommended** for new integrations | Experimental | https://docs.near.ai/cloud/experimental/direct-completions |
| Staking for Inference — new | Stake NEAR; the staking *rewards* pay inference credits (1 credit = $1) | Agents that pay for inference without a card | Documented | No | https://docs.near.ai/cloud/staking-for-inference/overview |
| NEAR AI Gateway (macOS) — new | Mac app that routes Claude Code, Codex and OpenCode to NEAR AI private/incognito models | Developer seats, host-pack analogue | Blog 2026-11-11; product site gateway.near.ai. **No docs.near.ai page** (none in its llms.txt) | No | https://near.ai/blog/introducing-near-ai-gateway · https://gateway.near.ai/ |
| Agent Market — new | Marketplace (market.near.ai): hire agents by the job; **payment held until the buyer accepts**, disputes, refunds; payout in USD (Stripe) or USDC | Selling an xray agent; an escrow-like pattern | Blog 2026-10-16 | No | https://near.ai/blog/what-is-agent-market |
| Integrations (OpenRouter, Brave Leo, SayGm, OpenCode, Cursor, LiteLLM and others) | NEAR AI Cloud as a provider in third-party tools | Plugging seats in quickly | OpenRouter 2026-09-28; SayGm 2026-09-18; OpenCode 2026-10-09; Brave Leo 2026-10-15 | No | https://docs.near.ai/cloud/guides/integrations/index |
| Cybersecurity models + NEAR AI Red — new | Abliterated security models in a TEE | Security agents | Blog 2026-10-29, 2026-11-04 | No | https://near.ai/blog/cybersecurity-models-and-near-ai-red-launch |
| Levanto "Sage" decision model — new | Private prompt classifier / router | Model routing | Blog 2026-10-26 | No | https://near.ai/blog/near-ai-levanto-verifiably-private-decision-models |
| **Security incident (SGLang RCE, 2026-11-08)** | Attacker ran code on one inference server and **could observe in-flight requests, including confidential ones**; ~100 Private Chat accounts and 18 legacy (non-TEE) agents accessed; 2 Cloud API keys revoked | Read before claiming "TEE = safe" | Fixed per the report of 2026-11-09 | n/a | https://near.ai/blog/security-incident-report-sglang-vulnerability |
| IronClaw | NEAR AI's agent OS ("privacy, security, extensibility") | Possible agent runtime | GitHub release ironclaw-v1.4.1 (2026-09-29) | No | https://github.com/nearai/ironclaw |
| NEAR MCP server | MCP tools for NEAR accounts, keys and calls; run locally only (it holds keys) | MCP clients with no terminal | Repo nearai/near-mcp, last push 2025-05 (stale); the docs list it as optional | Not deprecated; stale | https://docs.near.org/getting-started/tools-for-ai |
| NEAR Agent Skills + Docs MCP + llms.txt | Official skills (near-ai-cloud, near-api-js, near-cli-rs, near-contract-audit, near-dapp, near-intents, near-kit, near-smart-contracts) plus a docs search MCP | Coding agents building on NEAR | near/agent-skills (push 2026-11-07); Docs MCP `https://docs.near.org/mcp` | No | https://docs.near.org/getting-started/tools-for-ai |
| **Shade Agent Framework** | TEE agent worker + contract framework | **Don't use it** | npm `@neardefi/shade-agent-js` 2.2.0 / `-cli` 2.4.0 (2026-06-04). docs.near.org: "**Do not use the Shade Agent Framework.** It has not been maintained since April 19, 2026". Old docs URL `/ai/shade-agents/...` returns a 308 redirect to that deprecation section. Note: the repo still shows commits after that date (last releases 2026-06-04; feature commits up to 2026-09-16, last commit 2026-10-14), but the docs' deprecation is the official status | **DEPRECATED** | https://docs.near.org/getting-started/tools-for-ai (section "Shade Agent Framework (Deprecated)") |
| NEAR AI Agent Framework / Developer Hub (app.near.ai), `nearai` CLI | The old hosted agent framework | Don't use it | Repo nearai/nearai **archived**; servers shut down 2025-10-31; PyPI `nearai` 0.1.19 is frozen | **DEPRECATED / shut down** | https://github.com/nearai/nearai |
| Private ML SDK | Old TEE LLM runtime | Background only | Repo nearai/private-ml-sdk **archived** | **ARCHIVED** | https://github.com/nearai/private-ml-sdk |
| NEAR AI Private Chat | Consumer chat | — | The incident report calls it "previously deprecated" and taken offline | **DEPRECATED** | https://near.ai/blog/security-incident-report-sglang-vulnerability |

## 7. TEE off-chain compute / OutLayer

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| Off-chain compute pattern | A contract uses yield/resume to call a TEE worker, which returns the result plus an attestation (code hash, input hash, output) | Verifiable worker results | Documented | No | https://docs.near.org/primitives/off-chain-compute/what-is |
| OutLayer | Rust/WASM in Intel TDX: VRF, secrets, confidential key derivation, MPC vaults, USDC payment keys. **Built by FastNEAR, a third party**; the docs warn you to evaluate it before production | Attested workers without building your own TEE stack | Contract `outlayer.near` (mainnet, exists on-chain) / `outlayer.testnet`; worker request method **`request_execution(source, input_data, limits, secrets)`** per OutLayer's own docs and repo. Repo moved fastnear/near-outlayer → out-layer/outlayer (Apache-2.0); site moved to outlayer.ai. npm `@outlayer/sdk` 0.1.0-alpha.4 (agent custody SDK, alpha) | No, but **not a NEAR-owned project** | https://docs.near.org/primitives/off-chain-compute/outlayer · https://app.outlayer.ai/docs/getting-started · https://github.com/out-layer/outlayer |
| Price Oracle on OutLayer | `price-oracle.near`, Pyth-compatible | Price feeds | Documented | No | https://docs.near.org/primitives/oracles |

## 8. Payments: x402, escrow, vaults

| Component | What | When you need it | Version / status | Deprecated? | Official link |
|---|---|---|---|---|---|
| x402 `exact` scheme on NEAR | x402 **v2** scheme: the client signs a NEP-366 `SignedDelegateAction` for one exact NEP-141 `ft_transfer`, and the facilitator's relayer submits it | Pay-per-call APIs settled on NEAR | Spec `specs/schemes/exact/scheme_exact_near.md` in **x402-foundation/x402** (the x402 project, not NEAR); npm `@x402/near` 2.31.0 (2026-11-12), "x402 Payment Protocol NEAR Implementation", published by the x402 maintainers | No. Official **x402** artifact, **not** a NEAR docs page | https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md |
| x402 1Click gateway (pilot) | Takes x402 USDC on an EVM chain and settles to a merchant on any Intents chain | Getting paid cross-chain | Linked from docs.near.org Intents overview as "a pilot that has not been battle-tested"; repo is personal (IkerAlus) | Pilot | https://docs.near.org/chain-abstraction/intents/overview |
| Escrow | No official generic escrow primitive. What exists: Lockup contracts (time-based escrow for vesting), Agent Market held payments (product, not a primitive), Tokenized Vaults NEP-621 | Holding funds until work is done | Docs pages exist for lockup and NEP-621 | No | https://docs.near.org/primitives/lockup/introduction · https://docs.near.org/primitives/tokenized-vaults |
| MPP via NEAR Intents (`nearintents` payment method) | Reference implementation of the `nearintents` payment method for MPP (Machine Payments Protocol): HTTP 402 payments where the client pays on any chain and the merchant receives an exact amount; extends `mppx` | Charging per call with MPP and settling cross-chain | npm `@defuse-protocol/nearintents-mpp-sdk` 0.4.1; repo defuse-protocol/nearintents-mpp-sdk (push 2026-11-09). No docs.near.org / docs.near-intents.org page found | No (new; official org repo, undocumented) | https://github.com/defuse-protocol/nearintents-mpp-sdk |
| "Agent Payments Skill" (x402 funds Base USDC via Intents) | Claimed on X (NEARProtocol, 8-14) | — | **Not found** in near/agent-skills (8 skills, none x402) or the Intents docs skills page | Unverified as a shipped artifact | none found |

---

## What this means for xray

- **near-intents-pay kit** (Intents + x402 row): build on the 1Click API (`https://1click.chaindefuser.com/v0/*`, X-API-Key) and the 1Click TS SDK. Every 1Click swap now settles confidentially, so this kit gets privacy without a separate pack. For x402, use the x402 foundation's NEAR `exact` scheme (`@x402/near`, NEP-366 delegate actions), which lines up with our Clearing x402 shape. Avoid the retired Bridge API.
- **near-confidential-intents pack**: mostly folds into the pay kit (confidential is now the 1Click default). Keep it only for limit orders and confidential balances/history (`/v0/orders`, `/v0/account/*`).
- **near-chain-signatures kit**: `v1.signer-prod.testnet` → `v1.signer`, with chainsig.js and the near-multichain EVM example for Base. Read threshold and participants from the contract; don't hardcode "11-of-17" (live state today is 11 of 16).
- **near-private-inference pack**: `@nearai/inference-sdk` 0.3.0 (JS/Py/Rust/Go) against `cloud-api.near.ai/v1`, `verifyResponse()`, `/v1/attestation/report`. Default to Confidential TEE and label Incognito. Docs and the kit must state the 2026-11-08 SGLang incident plainly: a TEE doesn't protect against bugs in the software running inside it. Optional: Staking for Inference as the "pay" path, and Agent Market as a distribution channel.
- **near-shade-tee kit → rename or rescope.** Shade Agent Framework is **deprecated by docs.near.org** (unmaintained since 2026-04-19). Rebase this kit on the off-chain-compute pattern (yield/resume + TDX attestation): OutLayer (third-party, `request_execution`) or our own TDX quote check (ProvenExit style). Don't ship anything on `@neardefi/shade-agent-js`.
- **Front end**: NEAR Connect only. Wallet Selector and BOS are deprecated, web4 isn't in official docs. Docs-only in wave 1 (matches mill).
- **Keys**: scoped function-call keys + gas keys (NEP-611) are the official "agent trades without a seed phrase" and "agent fleet on one account" answers. NEAR Auth covers passkey onboarding for humans.
- **Testing**: near-sandbox (Rust/JS wrappers are MIT/Apache, the node binary is GPL-3.0). Use it as a dev/test tool only, never vendored.

## Unverified / open questions

1. web4: no official NEAR doc. Is it still supported by anyone official? (Only github.com/vgrichina/web4, 2023 release.)
2. MPP: an official-org repo exists (defuse-protocol/nearintents-mpp-sdk 0.4.1), but no docs page.
3. Multichain gas relayer: no current official page; status unknown.
4. 1Click testnet: the OpenAPI lists only the mainnet server; I found no official testnet 1Click host. Testnet-first demos for Intents may need the Verifier contract on testnet or small mainnet amounts. **Needs a decision** (no spend without Blaze GO).
5. Chain Signatures participant count: 16 read live today vs "17" in earlier write-ups. The live contract wins; flag any doc saying otherwise.
6. NEAR AI Cloud testnet / free tier for kit demos: not confirmed in the docs this pass.
7. `@near-js/*` packages: superseded by v7 per the README, but not marked deprecated on npm.
8. near-kit and NEAR Connect are owned by non-`near` GitHub orgs (r-near, azbang/HOT) but endorsed by docs.near.org. We treat them as docs-official.
9. Agent Market API (the "four HTTP calls" to list): docs URL not verified this pass.
10. October revenue figure (from the earlier scan) is still not first-party verified.
