# NEAR reuse report (light read, 20 shortlisted repos)

Seat: mill. Date: 2026-11-15 (CT). Refs [#1082](https://github.com/0xRayAI/xray/issues/1082). PR [#1100](https://github.com/0xRayAI/xray/pull/1100).

Scope: light read only. Each shortlisted repo from `house/dist/nibbler/near-hackathon-catalog-2026-11.md` section "MIT/Apache shortlist" was shallow-cloned (`git clone --depth 1`) into `/tmp/near-reuse/` (outside this repo, deleted after the write-up). For each clone I read the README, the LICENSE file (and NOTICE if present), and one core contract or agent file. No full codebase reads. No code from these repos is copied into xray.

Row 20 lists two repos, so this report covers 21 repositories. All 21 clones succeeded (no 404s).

## Summary

| # | Repo | License ok | Primitives in the core file | Kit | Fit |
|---|---|---|---|---|---|
| 1 | [mitchuski/caesura](https://github.com/mitchuski/caesura) | Apache-2.0 yes; [NOTICE](https://github.com/mitchuski/caesura/blob/main/NOTICE) must be kept | two-party gate (`propose`, `assay`); NEAR AI Cloud is in `lib/nearai.mjs`, not the contract. *johnservil/sigil was the wrong repo.* | 2-party key gate | **strong** |
| 2 | [Bronxydrone/Veto](https://github.com/Bronxydrone/Veto) | MIT yes | none of the catalog keywords; this is a `spend()` policy contract | agent allowance guard | **strong** |
| 3 | [soldanoandrea/allowance](https://github.com/soldanoandrea/allowance) | MIT yes | none of the catalog keywords; this is a `pay()` policy vault | agent allowance guard | **strong** |
| 4 | [amiller/abalone](https://github.com/amiller/abalone) | MIT yes; [THIRD_PARTY_NOTICES.md](https://github.com/amiller/abalone/blob/main/THIRD_PARTY_NOTICES.md) must be kept | TEE attestation | private-inference provider | **strong** |
| 5 | [baking-bad/anyfare](https://github.com/baking-bad/anyfare) | MIT yes | x402 facilitator (gas relayer in the same package family) | Intents payments / x402 bridge | **strong** |
| 6 | [alhassanmohammederc3643-cmyk/x402-near](https://github.com/alhassanmohammederc3643-cmyk/x402-near) | MIT yes | x402, NEP-366 meta-tx | Intents payments / x402 bridge | **medium** |
| 7 | [MihenkAI/near-pay-per-call](https://github.com/MihenkAI/near-pay-per-call) | MIT yes | x402-style 402 + `ft_transfer` check | Intents payments / x402 bridge | **medium** |
| 8 | [Basssoman/pinky](https://github.com/Basssoman/pinky) | MIT yes | escrow, relayer / meta-tx | keyless / TEE-verified escrow (keyless part) | **strong** |
| 9 | [cuongdcdev/fullfil](https://github.com/cuongdcdev/fullfil) | MIT yes | Intents, OutLayer, escrow | keyless / TEE-verified escrow | **strong** |
| 10 | [bemlerlabs/foreman](https://github.com/bemlerlabs/foreman) | Apache-2.0 yes (no NOTICE file) | escrow (90/10 split) | keyless / TEE-verified escrow (job escrow) | **medium** |
| 11 | [raldblox/boreal-task-desk](https://github.com/raldblox/boreal-task-desk) | MIT yes | escrow as a TypeScript payment module, not a NEAR contract | keyless / TEE-verified escrow (human-in-the-loop) | **medium** |
| 12 | [nearswaps/nearswaps-agents](https://github.com/nearswaps/nearswaps-agents) | MIT yes | scoped trade key, policy checks, 1-click / Intents path | trading key | **strong** |
| 13 | [jcarbonnell/nova-copy-trading](https://github.com/jcarbonnell/nova-copy-trading) | MIT yes | Intents payment verification | trading key | **medium** |
| 14 | [thesithunyein/hasp](https://github.com/thesithunyein/hasp) | MIT yes | Intents 1Click checkout (not an on-chain one-shot grant) | Intents payments / x402 bridge | **medium** |
| 15 | [0xMaxyz/HyperNear](https://github.com/0xMaxyz/HyperNear) | MIT yes | Chain Signatures (MPC), TEE mode; "intents" here are EIP-712 owner intents, not NEAR Intents | Chain Signatures to Base signer | **strong** |
| 16 | [Guglielmo15/intents-checkout](https://github.com/Guglielmo15/intents-checkout) | MIT yes | Intents 1Click (WooCommerce pay page) | Intents payments / x402 bridge | **medium** |
| 17 | [0xward/Twinnear](https://github.com/0xward/Twinnear) | MIT yes | escrow, relayer / meta-tx; 1Click is a frontend confirmation | keyless / TEE-verified escrow (invoice escrow) | **medium** |
| 18 | [NaDasai/bitlens](https://github.com/NaDasai/bitlens) | MIT yes | `check_transaction` MCP tool (NEAR AI Cloud is only the optional LLM for text-to-test) | pre-sign safety MCP | **strong** |
| 19 | [GuTS805/keyturn](https://github.com/GuTS805/keyturn) | MIT yes | OutLayer; 2-of-N hash approval and `request_publish` | release gate | **strong** |
| 20a | [erhantrk/provenexit](https://github.com/erhantrk/provenexit) | MIT yes | TEE / Intel TDX quote verification on chain | private-inference provider (build registry) | **strong** |
| 20b | [IhorMuliar/nearbooks](https://github.com/IhorMuliar/nearbooks) | MIT yes | OutLayer TEE worker; Intents appear only as audit metrics; the contract does not verify the TDX quote on chain | private-inference provider (attested log) | **medium** |

"Primitives in the core file" means the claimed NEAR primitives (Intents, TEE / NEAR AI Cloud, Chain Signatures, OutLayer, x402, meta-tx, escrow) that actually show up in the single core file named below, not only in the README. A README claim is noted in the per-repo write-up when the core file does not contain it.

## Top picks

1. **Veto**, with **Allowance** as the other base to compare — agent allowance guard. Both are real policy vaults: Veto exposes `spend()`; Allowance exposes `pay()`, `simulate`, and `verify_receipt`. Intents and Chain Signatures are in Veto's host TypeScript, not in the contract.
2. **Abalone** — private-inference provider. The agent entry checks TEE / NEAR attestation before prompts. Keep `THIRD_PARTY_NOTICES.md` if anything is reused. Intents funding and x402 are described in the README, not in this core file.
3. **Anyfare** — Intents payments / x402 bridge. A real x402 facilitator module for USDC on NEAR, with Intents top-ups in a sibling package, claimed on mainnet.
4. **Fulfil** and **Pinky** — escrow kit. Fulfil's contract takes Intents deposits and releases only after an OutLayer TEE verifier returns; Pinky is a keyless mainnet escrow (0 access keys) with a relayer that cannot redirect funds. Use them together: Pinky for the keyless lock, Fulfil for TEE-verified release.
5. **HyperNear** — Chain Signatures kit. The contract holds Hyperliquid keys through NEAR MPC and caps the agent. Same pattern would apply to an EVM / Base signer. Testnet only; mainnet is not deployed.

Also strong, and worth a first look after those five: **Caesura** (two-party key gate: one seat proposes, a held-apart seat assays, the contract holds the only keys; Apache-2.0, keep NOTICE), **BitLens** (`check_transaction` pre-sign MCP), **Keyturn** (2-of-N hash approval, OutLayer TEE publishes to npm), and **ProvenExit** (on-chain Intel TDX build registry).

The catalog first pointed Caesura at **johnservil/sigil**. That was the wrong repo (a hash-to-word encoder, multi-licensed MIT / Apache-2.0 / TGPPL / BOSL). The real project is [mitchuski/caesura](https://github.com/mitchuski/caesura).

## Per-repo notes

### 1. Caesura — [mitchuski/caesura](https://github.com/mitchuski/caesura) (Apache-2.0)

Core file: [`contract/src/lib.rs`](https://github.com/mitchuski/caesura/blob/main/contract/src/lib.rs). Last commit: 2026-11-11 11:02 CT. Tests: yes (`test/hybrid.test.mjs`, `test/evidence.test.mjs`; README: `npm test` 12 tests). Network: NEAR testnet only (`pause.caesura.testnet`, `gap.caesura.testnet`, registry `gates.caesura.testnet`). README: no mainnet.

What it actually does: a two-party key gate. One seat calls `propose` with an action and a proposal hash; a held-apart assayer calls `assay`. The contract checks `paused`, `verdict`, `receiver`, `method`, `cap_action`, `cap_day`, and `cooldown`, then either executes or records a named refusal. `commit_root` stores an evidence-bundle root next to the proposal. Seat keys are function-call keys scoped to one method each (`set_seat_keys`). Live board: https://caesura.mages.city.

Primitives in the core file: the two-party gate itself (`propose` at line 200, `assay` at line 227). A test string "intent mismatch" is a verdict reason, not NEAR Intents. TEE / NEAR AI Cloud is not in the contract. The seats call the official cloud API from [`lib/nearai.mjs`](https://github.com/mitchuski/caesura/blob/main/lib/nearai.mjs) (default `https://cloud-api.near.ai`; `GET /v1/attestation/report` at lines 24–36, then `POST /v1/chat/completions`).

Reuse: as-is Rust gate contract, plus the local no-network demo (`seats/round.mjs` with `--chain off`) and `tools/verify.mjs`. Start from `contract/src/lib.rs`. Carry `NOTICE`.

License: `LICENSE` is Apache License 2.0. `NOTICE` is present (Copyright 2026 Soulbis / mages.city) and must be kept. It also lists `lib/dcbor.mjs` from mitchuski/agentprivacy-harness (Apache-2.0).

Fit: **strong** for the 2-party key gate.

Note: **johnservil/sigil** was the wrong repo. It is a hash-to-word encoding library (multi-licensed MIT, Apache-2.0, TGPPL, and BOSL), not this project.

### 2. Veto — [Bronxydrone/Veto](https://github.com/Bronxydrone/Veto) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/Bronxydrone/Veto/blob/main/contract/src/lib.rs). Last commit: 2026-11-14 05:35 CT. Tests: yes (unit, adversarial, and testnet docs). Network: NEAR testnet (README: live conformance against the deployed contract; `docs/TESTNET.md`).

What it actually does: a spending firewall. Funds sit in the contract. The agent key is supposed to call only `spend()`; the contract recomputes per-transaction, daily, and 30-day limits and can pause, rotate the agent, or require a human above a threshold (`set_policy`, `spend`, `check`, `withdraw`).

Primitives in the core file: none of Intents, Chain Signatures, or x402. (A regex hit on "intentionally" is not Intents.) The README describes a host TypeScript client for NEAR Intents / 1Click and Chain Signatures under `src/chain/`, which I did not treat as the core file.

Reuse: as-is Rust contract for the allowance guard, plus (if later reviewed) the host TS. The contract is the reusable piece; the demo host is glue.

License: `LICENSE` is MIT (Copyright 2026 Veto contributors). No NOTICE.

Fit: **strong** for the agent allowance guard.

### 3. Allowance — [soldanoandrea/allowance](https://github.com/soldanoandrea/allowance) (MIT)

Core file: [`src/lib.rs`](https://github.com/soldanoandrea/allowance/blob/main/src/lib.rs). Last commit: 2026-11-01 11:03 CT. Tests: yes (Rust sandbox tests, Vitest, `docs/TESTNET.md`). Network: local sandbox by default; testnet demo documented (`make demo-testnet`).

What it actually does: a vault contract. The owner funds it and attaches a function-call key that can only call `pay`, `confirm_delivery`, and `ping`. The contract enforces asset, cap, budget, allowlist, denylist, cooldown, and human approval. `simulate` is a free view; `verify_receipt` lets a payee check a payment.

Primitives in the core file: none of the catalog keywords. README mentions Intents, OutLayer, x402, and escrow only as comparisons or future work, not as this vault's implementation.

Reuse: as-is Rust contract, plus an MCP package and TypeScript SDK in the repo (not read in full). Compare with Veto and pick one base; this vault is more payment/receipt oriented, Veto is more of a deny-reason firewall.

License: `LICENSE` is MIT (Copyright 2026 Andrea Soldano). No NOTICE.

Fit: **strong** for the agent allowance guard.

### 4. Abalone — [amiller/abalone](https://github.com/amiller/abalone) (MIT)

Core file: [`agents/pi/abalone.ts`](https://github.com/amiller/abalone/blob/main/agents/pi/abalone.ts). Last commit: 2026-11-14 13:53 CT. Tests: yes (large test tree). Network: not stated as testnet or mainnet in the README head; this is a local / web agent shell.

What it actually does: a privacy shell around the Pi agent. The core file looks up `aci-attestation` / `near-attestation` evidence and warns when TEE firmware (`tcb:out-of-date`, `gw-tcb:out-of-date`) has known advisories before prompts go out.

Primitives in the core file: TEE attestation checks. The README says the web app is funded once with any token through NEAR Intents, and mentions x402 for cloud code runs; those are not in this core file. A port of `teep` is cited as related work in the README, not imported in this file.

Reuse: TypeScript agent / verifier module for the private-inference provider kit. Web funding and x402 paths would need a later, scoped read.

License: `LICENSE` is MIT (Copyright 2026 Andrew Miller). `THIRD_PARTY_NOTICES.md` is present and says the root MIT license does not replace component licenses (including the Pi fork). Keep that NOTICE if any code is reused.

Fit: **strong** for the private-inference provider kit.

### 5. Anyfare — [baking-bad/anyfare](https://github.com/baking-bad/anyfare) (MIT)

Core file: [`packages/payments/src/x402/facilitator.ts`](https://github.com/baking-bad/anyfare/blob/main/packages/payments/src/x402/facilitator.ts). Last commit: 2026-11-14 07:34 CT. Tests: yes (payments and facilitator tests). Network: NEAR mainnet (README badge and "real payments on mainnet"; demos spend real cents).

What it actually does: the core file is an x402 facilitator client (`createFacilitator`) that verifies and settles payment payloads. The README says an agent can pay x402 or MPP APIs from USDC on NEAR (or a prepaid balance), with Intents 1Click top-ups into `treasury.anyfare.near`, and a NEAR facilitator that settles on `near:mainnet`.

Primitives in the core file: x402, plus facilitator / relayer language (meta-tx). NEAR Intents live in `packages/topups` (not this file).

Reuse: TypeScript module (x402 facilitator / payments rail). Stronger and more complete than the smaller x402-near sample. Hangar-shop glue would still need writing.

License: `LICENSE` is MIT (Copyright 2026 Baking Bad). No NOTICE.

Fit: **strong** for the Intents payments / x402 bridge.

### 6. x402-near — [alhassanmohammederc3643-cmyk/x402-near](https://github.com/alhassanmohammederc3643-cmyk/x402-near) (MIT)

Core file: [`facilitator.mjs`](https://github.com/alhassanmohammederc3643-cmyk/x402-near/blob/main/facilitator.mjs) (57 lines). Last commit: 2026-11-02 11:45 CT. Tests: yes (`test.mjs`, policy and replay tests). Network: testnet only (`wrap.testnet`; README: no real value).

What it actually does: a small HTTP 402 facilitator. `verify` checks a buyer-signed NEP-366 delegate action for an exact `ft_transfer`, then the facilitator relays it and pays gas (`startFacilitator`).

Primitives in the core file: x402 and NEP-366 meta-tx. Matches the catalog.

Reuse: a short reference for a NEAR-side x402 facilitator, not a production module. Prefer Anyfare if we take one implementation; keep this as the smallest readable sample.

License: `LICENSE` is MIT (Copyright 2026 the x402-near authors). No NOTICE.

Fit: **medium**.

### 7. Mihenk pay-per-call — [MihenkAI/near-pay-per-call](https://github.com/MihenkAI/near-pay-per-call) (MIT)

Core file: [`server.mjs`](https://github.com/MihenkAI/near-pay-per-call/blob/main/server.mjs). Last commit: 2026-11-14 16:31 CT. Tests: yes (`test.mjs`). Network: testnet (`usdc.fakes.testnet`) and mainnet (Circle USDC to `mihenkai.near`; README links a hosted API).

What it actually does: the API answers 402 with a nonce; the agent pays with `ft_transfer` and memo `mihenk-x402:<nonce>`; `verify` checks the NEAR transaction and then serves the result. No facilitator.

Primitives in the core file: x402-style handshake. Intents appear in the README and a separate `trade.mjs` (1Click swap to fund the agent), not in `server.mjs`.

Reuse: small TypeScript/JS "paid API" sample, useful as a pack template. Hackathon-scale, but the flow is clear.

License: `LICENSE` is MIT (Copyright 2026 Mihenk AI). No NOTICE.

Fit: **medium**.

### 8. Pinky — [Basssoman/pinky](https://github.com/Basssoman/pinky) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/Basssoman/pinky/blob/main/contract/src/lib.rs). Last commit: 2026-11-14 11:01 CT. Tests: yes (including `contract/tests/verify.rs` and mainnet verify scripts). Network: NEAR mainnet (`escrow.pinkydeals.near`).

What it actually does: a freelance escrow. `create_deal` is funded; later `act` runs a signed action. The relayer pays gas but cannot change the destination because the signature covers `escrow-v1|{contract_id}|{deal_id}|{action}|{payload}`. Transfers to `intents.near` are denied (`DENIED_DESTINATIONS`). README: the contract account has 0 access keys (deploy key deleted 2026-11-14).

Primitives in the core file: escrow and relayer / meta-tx. Intents 1Click funding and a NEAR AI Cloud brief helper are in the README and server, not implemented as Intents calls in this contract (the contract only blocks `intents.near` as a withdraw destination).

Reuse: as-is keyless escrow contract. Mainnet and frozen keys make it a serious base for the escrow kit's keyless half.

License: `LICENSE` is MIT (Copyright 2026 the Pinky contributors). No NOTICE.

Fit: **strong**.

### 9. Fulfil — [cuongdcdev/fullfil](https://github.com/cuongdcdev/fullfil) (MIT; repo name is spelled `fullfil`)

Core file: [`contracts/escrow/src/lib.rs`](https://github.com/cuongdcdev/fullfil/blob/main/contracts/escrow/src/lib.rs). Last commit: 2026-11-14 08:37 CT. Tests: yes (security docs include attack tests). Network: NEAR mainnet (`nearfullfil.near`, live app, real USDC).

What it actually does: escrow for real-life orders. Funds are NEP-245 balances inside an `intents_contract`. Money in is `mt_on_transfer`; actions come through `on_auth`; payout calls `intents_contract.mt_transfer`. Release is gated by an OutLayer `request_execution` of a TEE verifier; the result returns to `on_verify_result` / `submit_proof`.

Primitives in the core file: Intents, OutLayer, escrow (relayer field present). This matches the catalog, including TEE-verified release.

Reuse: as-is Rust escrow contract for the TEE-verified escrow kit. App and verifier workers are more glue and would need their own later read before any copy.

License: `LICENSE` is MIT (Copyright 2026 Fulfil maintainers). No NOTICE.

Fit: **strong**.

### 10. Foreman — [bemlerlabs/foreman](https://github.com/bemlerlabs/foreman) (Apache-2.0)

Core file: [`contracts/foreman/src/lib.rs`](https://github.com/bemlerlabs/foreman/blob/main/contracts/foreman/src/lib.rs). Last commit: 2026-11-15 04:28 CT. Tests: yes (Python acceptance tests and a TypeScript Intents client typecheck). Network: NEAR testnet (`escrow.foreman-team.testnet`).

What it actually does: a job-market escrow. `post_job` locks a deposit; agents `place_bid`; `award`, `attach_receipt`, `submit_work`, and `accept` pay out 90% to the winner and 10% to a treasury (`FOREMAN_FEE_NUM = 10`). Receipts are stored as a hash; this core file does not itself verify an ES256 signature.

Primitives in the core file: escrow. Intents live in `core/intents/` (TypeScript), not in the contract.

Reuse: small as-is Rust contract for a seat-hires-seat job escrow. Medium because it is testnet-only and the receipt check is a hash hook, not a TEE or signature verify in this file.

License: `LICENSE` is Apache License 2.0. No NOTICE file.

Fit: **medium**.

### 11. boreal.work — [raldblox/boreal-task-desk](https://github.com/raldblox/boreal-task-desk) (MIT)

Core file: [`packages/near/src/payments.ts`](https://github.com/raldblox/boreal-task-desk/blob/main/packages/near/src/payments.ts). Last commit: 2026-11-13 22:49 CT. Tests: yes (`payments.test.ts` and others). Network: testnet (`testnet.boreal.work`) and a mainnet site (PayPal live; NEAR rail documented on testnet).

What it actually does: a TypeScript NEAR payment rail. Agents fund a task with an NEP-141 USDC transfer to boreal's escrow account and memo `boreal:<taskId>`; payouts and refunds go back out of that account. There is no Rust contract in this repo for that escrow.

Primitives in the core file: escrow (as account transfers). TEE / NEAR AI Cloud review is described in the README (`NEAR_AI_API_KEY`, Intel TDX models) but is not in this payments file. x402 is a Concordium / EVM add-on, not the NEAR rail.

Reuse: TypeScript module plus an HTTP MCP route in the web app. Useful pattern for human-in-the-loop task escrow; not a reusable on-chain contract.

License: `LICENSE` is MIT (Copyright 2026 raldblox). No NOTICE.

Fit: **medium**.

### 12. nearswaps agent kit — [nearswaps/nearswaps-agents](https://github.com/nearswaps/nearswaps-agents) (MIT)

Core file: [`packages/agent/src/agent.ts`](https://github.com/nearswaps/nearswaps-agents/blob/main/packages/agent/src/agent.ts). Last commit: 2026-11-11 05:45 CT. Tests: yes. Network: NEAR mainnet (README: real runs by `tome.near`).

What it actually does: an agent kit that will only load a function-call key scoped to `trade`, `withdraw`, and `recover_trade`. It runs a policy file (`previewTrade`, `runChecks`) and refuses off-policy trades before signing a 1-click path.

Primitives in the core file: the 1-click / Intents-style trade path and a scoped key. NEAR AI Cloud as the policy-reading model is in the README (default `https://cloud-api.near.ai/v1`), not in this core file.

Reuse: TypeScript module, plus a separate MCP package (`packages/mcp/src/server.ts`, not fully read). Good base for the trading key kit.

License: `LICENSE` is MIT (Copyright 2026 Tome Blazevski). No NOTICE.

Fit: **strong**.

### 13. NOVA Copy-Trading — [jcarbonnell/nova-copy-trading](https://github.com/jcarbonnell/nova-copy-trading) (MIT)

Core file: [`src/core/verify-payment.ts`](https://github.com/jcarbonnell/nova-copy-trading/blob/main/src/core/verify-payment.ts). Last commit: 2026-11-12 12:14 CT. Tests: yes (demo / proof tree). Network: NEAR mainnet only (README: Intents has no testnet; 0.10 USDC demo).

What it actually does: `verifyPayment` checks that a follower paid via a NEAR Intents `ft_withdraw` / `execute_intents` to the seller, with a bounded time window and replay protection.

Primitives in the core file: Intents. The README's confidential journal / Shade TEE lives in a different repo (`jcarbonnell/nova`), and the README states there is no on-chain escrow yet (pay first, then admit).

Reuse: TypeScript module for paid-access verification. The copy-trading product around it is glue. Useful as a paid-signal pattern, not as an escrow contract.

License: `LICENSE` is MIT (Copyright 2026 CivicTech OÜ). No NOTICE.

Fit: **medium**.

### 14. Hasp — [thesithunyein/hasp](https://github.com/thesithunyein/hasp) (MIT)

Core file: [`public/checkout.js`](https://github.com/thesithunyein/hasp/blob/main/public/checkout.js). Last commit: 2026-11-11 01:11 CT. Tests: yes (CI dry-run of the agent against a mainnet quote). Network: mainnet 1Click quotes and a recorded mainnet swap; the agent script can dry-run or send.

What it actually does: a browser checkout widget. The buyer picks a coin and chain; the script asks the NEAR Intents 1Click API (`https://1click.chaindefuser.com`) for an `EXACT_OUTPUT` quote to USDC on NEAR and shows a one-time deposit address. A companion `scripts/hasp-agent.mjs` does the same for an agent key.

Primitives in the core file: Intents / 1Click. This is not an on-chain "one-shot capped swap permission that closes after use." It is a one-time Intents quote and deposit address. The catalog oversells it as an allowance primitive.

Reuse: a small JS checkout snippet, overlapping Intents Checkout. Hackathon glue with a clear 1Click call pattern.

License: `LICENSE` is MIT (Copyright 2026 Sithu Nyein). No NOTICE.

Fit: **medium** as a 1Click checkout reference; **weak** as a single-use spend grant.

### 15. HyperNear — [0xMaxyz/HyperNear](https://github.com/0xMaxyz/HyperNear) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/0xMaxyz/HyperNear/blob/main/contract/src/lib.rs). Last commit: 2026-11-14 14:13 CT. Tests: yes (many claim scripts and tests). Network: NEAR testnet and Hyperliquid testnet (`leash-spike-1107.testnet`). README: mainnet is not deployed.

What it actually does: a public contract holds Hyperliquid account keys through NEAR Chain Signatures (MPC `sign`). The owner authorizes EIP-712 "owner intents"; an agent key may only do capped actions (`rebalance`, cancels, and so on). TEE mode can require an attested agent (`tee_approve_agent`).

Primitives in the core file: Chain Signatures / MPC, TEE config. The word "intent" here is EIP-712 owner intents, not NEAR Intents 1Click (README mentions 1Click funding as not yet run).

Reuse: as-is Rust contract as the pattern for a Chain Signatures to Base / EVM signer kit (swap Hyperliquid L1 actions for Base). Not a drop-in Base signer today.

License: `LICENSE` is MIT (Copyright 2026 Max). No NOTICE.

Fit: **strong**.

### 16. Intents Checkout — [Guglielmo15/intents-checkout](https://github.com/Guglielmo15/intents-checkout) (MIT)

Core file: [`plugin/assets/pay.js`](https://github.com/Guglielmo15/intents-checkout/blob/main/plugin/assets/pay.js). Last commit: 2026-11-11 16:59 CT. Tests: yes (README: 34 passed, including a real mainnet 1Click SUCCESS replay). Network: mainnet live mode, plus a sandbox that uses real quotes with a fake deposit address.

What it actually does: a WooCommerce payment page. The customer picks a token; the plugin requests an Intents `EXACT_OUTPUT` quote so the merchant receives exact USDC on NEAR.

Primitives in the core file: Intents / 1Click. Matches the catalog. No TEE, escrow contract, or x402 in this file.

Reuse: WooCommerce-specific glue, but a clean 1Click checkout reference for a "get paid" pack. Overlaps Hasp; this one is a full store plugin with tests against a real mainnet payment.

License: `LICENSE` is MIT (Copyright 2026 Guglielmo Ruffo). No NOTICE.

Fit: **medium**.

### 17. Twinnear — [0xward/Twinnear](https://github.com/0xward/Twinnear) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/0xward/Twinnear/blob/main/contract/src/lib.rs). Last commit: 2026-11-09 08:42 CT. Tests: yes. Network: NEAR testnet only (`twinnear.testnet`). README: "No AI." 1Click is mainnet-only, so testnet USDC uses a stand-in.

What it actually does: freelancer invoices with on-contract escrow (`create_invoice`, `pay_invoice`, release / refund, milestones). `create_invoice_meta` and a trusted relayer support gasless submission. `confirm_external_payment` records a 1Click reference; the contract header and README say that confirmation is an unverified attestation (funds already went to the seller, not into escrow).

Primitives in the core file: escrow and relayer / meta-tx. Intents / 1Click are documented and confirmed, not verified, in the contract. A "attestation" mention is about that payment confirmation, not a TEE.

Reuse: as-is invoice escrow contract plus a relayer sample. Useful invoice-plus-escrow example; the Intents path is weaker than Fulfil or the checkout widgets.

License: `LICENSE` is MIT (Copyright 2026 Aradea Wardana). No NOTICE.

Fit: **medium**.

### 18. BitLens — [NaDasai/bitlens](https://github.com/NaDasai/bitlens) (MIT)

Core file: [`mcp/server.ts`](https://github.com/NaDasai/bitlens/blob/main/mcp/server.ts). Last commit: 2026-11-13 09:05 CT. Tests: yes (`npm test`, simulator tests, optional live mainnet view scans). Network: reads mainnet (or testnet) WASM over view RPC only; attacks run in a local simulator and never sign or send.

What it actually does: an MCP server with six tools, including `check_transaction`. That tool is meant to be called before an agent signs a NEAR function-call. It returns allow / confirm / block after scanning the receiver's bytecode and running suggested attacks locally.

Primitives in the core file: the pre-sign tool itself. NEAR AI Cloud is only the optional LLM used to turn a plain-English attack idea into a test (`run_custom_attack`). x402 in the README is an OpenRouter billing aside, not a payment rail.

Reuse: as-is MCP tool for the pre-sign safety MCP kit. This is one of the cleanest kit matches in the shortlist.

License: `LICENSE` is MIT (Copyright 2026 NaDasai). No NOTICE.

Fit: **strong**.

### 19. Keyturn — [GuTS805/keyturn](https://github.com/GuTS805/keyturn) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/GuTS805/keyturn/blob/main/contract/src/lib.rs). Last commit: 2026-11-14 14:24 CT. Tests: yes (including retry / hand-off unit tests). Network: NEAR testnet only (`contract.hudich-keyturn.testnet`); publishes went to the real npm registry. Mainnet is a written plan only.

What it actually does: a release gate. Maintainers `propose_release` / `approve_release` on an exact artifact SHA-256 (2-of-N). `request_publish` calls OutLayer so a TEE worker that holds the npm token can publish that hash. `escrow` in this file is the fee reserved for OutLayer attempts, not a user-to-user payment escrow.

Primitives in the core file: OutLayer, plus the approval / publish flow. Matches the catalog.

Reuse: as-is Rust contract for xray's own npm release gate (critic + forge approve, TEE publishes). Testnet-only today.

License: `LICENSE` is MIT (Copyright 2026 Keyturn contributors). No NOTICE.

Fit: **strong**.

### 20a. ProvenExit — [erhantrk/provenexit](https://github.com/erhantrk/provenexit) (MIT)

Core file: [`contracts/near/src/lib.rs`](https://github.com/erhantrk/provenexit/blob/main/contracts/near/src/lib.rs). Last commit: 2026-11-14 14:11 CT. Tests: yes (CI tests and an exit-image verify workflow). Network: NEAR testnet only (`vpnreg.pe-owner-erhan.testnet`).

What it actually does: an on-chain build registry for a VPN exit running in Intel TDX (Phala). `register_instance_tdx` and `debug_verify_tdx` verify Intel TDX quotes on chain; `allow_compose` / `revoke_compose` and `is_allowed` decide whether a client may connect. The client is supposed to refuse traffic until the registry says the build is approved.

Primitives in the core file: TEE / TDX verification. Matches the catalog's "Intel TDX build registry checked before connecting."

Reuse: as-is Rust registry contract, plus an npm client and an MCP entry (README: `provenexit-mcp`). The product is a VPN, but the registry and quote checks are the reusable pattern for the inference kit's attestation gate.

License: `LICENSE` is MIT (Copyright 2026 Erhan Türker). No NOTICE.

Fit: **strong** as a TEE build-registry pattern (not as a VPN product).

### 20b. NEAR Books — [IhorMuliar/nearbooks](https://github.com/IhorMuliar/nearbooks) (MIT)

Core file: [`contract/src/lib.rs`](https://github.com/IhorMuliar/nearbooks/blob/main/contract/src/lib.rs). Last commit: 2026-11-02 08:04 CT. Tests: yes (contract tests and `make verify`). Network: NEAR mainnet (`nearbooks.near`); README says the only full-access key was deleted, freezing the code. Earlier testnet logs exist.

What it actually does: a token-economics audit with a daily attested snapshot. The contract asks OutLayer (`request_execution`) to run a pinned WASM worker in Intel TDX, then stores the result. The file header is explicit: the contract cannot verify a reported number and cannot verify the TDX quote on chain; quote checks happen off-chain (dashboard / MCP).

Primitives in the core file: OutLayer and a TEE worker hand-off. "Intents" in this contract are metrics (`intents_reserves_*`), not a payments integration.

Reuse: as-is contract plus `mcp/server.py` for browser-style re-checks of worker hash, pin, and attestation. Weaker on-chain verification than ProvenExit, but it is a live mainnet attested-log pattern.

License: `LICENSE` is MIT (Copyright 2026 NEAR Books contributors). No NOTICE.

Fit: **medium**.

## Method and limits

- Clones were `--depth 1` on 2026-11-15 CT, so "last commit" is the tip of the default branch at that moment, converted to America/Chicago (CT).
- One core file per repo, chosen as the main contract (`**/src/lib.rs` under `contract` / `contracts`) or, if there was no contract, the main agent, facilitator, payment, MCP, or checkout entry named above.
- Keyword hits were checked by hand. False positives (for example "intentionally", EIP-712 "owner intents", or Intents *metrics*) are not counted as NEAR Intents.
- I did not run their tests, deploy anything, or copy any source into xray.

## Next

Nothing from these repos is copied into xray until forge sets RACI and critic gates it. This report stops at the light read and the summary on #1082.
