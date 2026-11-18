---
title: NEAR reference
description: Current official NEAR sources for builders, plus the old links to skip. Checked 2026-11-18.
---

# NEAR reference

Official NEAR docs move, and a lot of older pages are archived. This page lists sources that were current on 18 Nov 2026. Each row is an official page, a NEAR GitHub repo, or a spec those docs point at.

Versions were read from the npm registry and crates.io on that date. GitHub links were opened the same day. The [research note](/near/research) is the longer write-up: gotchas, security sources that are not official NEAR docs, and a read of 21 hackathon repos. No code from those repos is copied here. The [testnet demo](/earn) is a separate page and does not spend money.

Start with the [docs index](https://docs.near.org/llms.txt) if you want every current page, not just this short list.

## Contracts, CLI, and clients

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [Rust SDK](https://docs.near.org/tools/sdk) | The only official smart-contract SDK. Crate `near-sdk` 5.30.2. | 2026-11-18 | Current. [Repo](https://github.com/near/near-sdk-rs). |
| [cargo-near](https://github.com/near/cargo-near) | Build, ABI, and scaffold for Rust contracts. Crate 0.23.0. | 2026-11-18 | Current |
| [Your first contract](https://docs.near.org/smart-contracts/quickstart) | Local sandbox test, then testnet deploy. | 2026-11-18 | Current |
| [Sandbox testing](https://docs.near.org/smart-contracts/testing/integration-test) | Local NEAR sandbox. Crate `near-sandbox` 0.4.1. The node binary is GPL-3.0. Use it for tests. Do not vendor it. | 2026-11-18 | Current |
| [Global contracts](https://docs.near.org/smart-contracts/global-contracts) | Deploy code once and reuse it on many accounts. | 2026-11-18 | Current |
| [NEAR CLI](https://docs.near.org/tools/cli) | Accounts, keys, deploy, and calls. npm and crate `near-cli-rs` 0.31.1. | 2026-11-18 | Current. [Repo](https://github.com/near/near-cli-rs). |
| [API libraries](https://docs.near.org/tools/near-api) | JavaScript, Rust, and Python clients. npm `near-api-js` 7.5.3. Crate `near-api` 0.8.7. | 2026-11-18 | Current. [JS repo](https://github.com/near/near-api-js). [Rust repo](https://github.com/near/near-api-rs). |
| [nearcore 2.14.1](https://github.com/near/nearcore/releases/tag/2.14.1) | Node and protocol. Published 2026-11-11. [Repo](https://github.com/near/nearcore). | 2026-11-18 | Current release |

## Accounts, tokens, and standards

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [Account ID](https://docs.near.org/protocol/accounts-contracts/account-id) | Named accounts and implicit accounts. | 2026-11-18 | Current |
| [Create an account](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts) | Implicit accounts and named accounts. The CLI can sponsor a testnet account. | 2026-11-18 | Current |
| [Access keys](https://docs.near.org/protocol/accounts-contracts/access-keys) | Full-access keys and function-call keys. A function-call allowance is gas, not USDC. | 2026-11-18 | Current |
| [One yoctoNEAR](https://docs.near.org/smart-contracts/security/one_yocto) | Sensitive calls, including `ft_transfer`, require a key that can attach a deposit. | 2026-11-18 | Current |
| [Gas keys](https://docs.near.org/protocol/accounts-contracts/gas-keys) | Prepaid gas and parallel nonce lanes. [NEP-611](https://github.com/near/NEPs/blob/master/neps/nep-0611.md) is still Draft. Follow this page. | 2026-11-18 | Current guide. Draft NEP. |
| [Meta transactions](https://docs.near.org/protocol/transactions/meta-tx) | [NEP-366](https://github.com/near/NEPs/blob/master/neps/nep-0366.md). A relayer pays the gas. | 2026-11-18 | Current. [nearcore 2.14.0](https://github.com/near/nearcore/releases/tag/2.14.0) removed `DelegateV2` and says gas keys can no longer sign meta transactions. |
| [NEP-141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md) | Fungible token standard. [Integration guide](https://docs.near.org/integrations/fungible-tokens). | 2026-11-18 | Current |
| [NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md) | Storage registration before the first token transfer. | 2026-11-18 | Current |
| [NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md) | Signed messages for backend login. [Guide](https://docs.near.org/web3-apps/backend/backend). | 2026-11-18 | Current |
| [NEP index](https://github.com/near/NEPs) | All NEPs. Read the status in the file. A Draft is not a shipped standard. | 2026-11-18 | Current |
| [Lockup](https://docs.near.org/primitives/lockup/introduction) | Time-based lock of NEAR. Not a general job escrow. | 2026-11-18 | Current |
| [Tokenized vaults](https://docs.near.org/primitives/tokenized-vaults) | [NEP-621](https://github.com/near/NEPs/blob/master/neps/nep-0621.md). | 2026-11-18 | Current |

## Chain, Intents, and NEAR AI

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [Chain signatures](https://docs.near.org/chain-abstraction/chain-signatures) | One NEAR account signs on other chains. [How to sign](https://docs.near.org/chain-abstraction/chain-signatures/implementation). | 2026-11-18 | Current |
| [Intents overview](https://docs.near.org/chain-abstraction/intents/overview) | Outcome-based swaps settled by the Intents verifier. | 2026-11-18 | Current |
| [Intents docs index](https://docs.near-intents.org/llms.txt) | Every current Intents page. | 2026-11-18 | Current |
| [1Click Swap API](https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api) | Quote, deposit, and status. [Make a request](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request). [OpenAPI](https://1click.chaindefuser.com/docs/v0/openapi.yaml). | 2026-11-18 | Current. No testnet ([FAQ](https://docs.near-intents.org/resources/faqs)). |
| [Confidential swaps](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/confidential-swaps) | Privacy on 1Click. Read this page before you assume a swap is public. | 2026-11-18 | Current |
| [1Click SDK](https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk) | Typed clients. npm `@defuse-protocol/one-click-sdk-typescript` 0.1.26 (ISC). | 2026-11-18 | Current |
| [Intents SDK](https://docs.near-intents.org/integration/devkit/intents-sdk) | Deposits, withdrawals, and signing. npm `@defuse-protocol/intents-sdk` 0.98.0. | 2026-11-18 | Current. Pre-1.0. |
| [Changelog](https://docs.near-intents.org/changelog/overview) | What changed, including APIs that closed. | 2026-11-18 | Current |
| [NEAR AI index](https://docs.near.ai/llms.txt) | Every current NEAR AI page. | 2026-11-18 | Current |
| [Cloud quickstart](https://docs.near.ai/cloud/quickstart) | OpenAI-compatible API at `cloud-api.near.ai`. | 2026-11-18 | Current |
| [Models](https://docs.near.ai/cloud/models) | Which models are confidential and which are not. | 2026-11-18 | Current |
| [Private inference](https://docs.near.ai/cloud/private-inference) | TEE inference and what it does not protect. | 2026-11-18 | Current |
| [Attestation report](https://docs.near.ai/api-reference/attestation/get-attestation-report) | `GET /v1/attestation/report`. [Verification center](https://docs.near.ai/cloud/verification/verification-center). | 2026-11-18 | Current |
| [Inference SDK](https://docs.near.ai/cloud/inference-sdk/index) | npm `@nearai/inference-sdk` 0.3.0. | 2026-11-18 | Current. Pre-1.0. |
| [Direct completions](https://docs.near.ai/cloud/experimental/direct-completions) | Call one model TEE and skip the gateway. | 2026-11-18 | Experimental. Not for new apps. |
| [OutLayer](https://docs.near.org/primitives/off-chain-compute/outlayer) | Third-party TEE workers. The docs tell you to judge it before production. [Pattern](https://docs.near.org/primitives/off-chain-compute/what-is). [Yield and resume](https://docs.near.org/smart-contracts/anatomy/yield-resume). | 2026-11-18 | Current docs. Not a NEAR-owned product. |
| [x402 NEAR exact scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md) | Pay with one exact NEP-141 transfer inside a NEP-366 delegate. npm `@x402/near` 2.31.0. | 2026-11-18 | Current x402 spec. Not a NEAR docs page. |

## Testnet RPC and faucets

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [RPC providers](https://docs.near.org/api/rpc/providers) | Public endpoints. The NEAR testnet row is `https://archival-rpc.testnet.near.org`. | 2026-11-18 | Current |
| [Transactions RPC](https://docs.near.org/api/rpc/transactions) | Submit a transaction and read it back. | 2026-11-18 | Current |
| [`tx`](https://docs.near.org/api-reference/post-tx) | Status of one transaction hash. | 2026-11-18 | Current |
| [`tx_status`](https://docs.near.org/api-reference/post-tx_status) | Final result plus every receipt. Use this to verify a token transfer. | 2026-11-18 | Current |
| [Token faucet](https://docs.near.org/getting-started/faucet) | Testnet NEAR from the page on that doc. Testnet USDC from Circle, linked there. | 2026-11-18 | Current |
| [Circle faucet](https://faucet.circle.com/) | 20 testnet USDC every 2 hours, in a browser, behind a captcha. Not an HTTP API. | 2026-11-18 | Current. See the gotcha below. |
| [near-faucet.io](https://near-faucet.io/) | The fungible-token faucet the NEAR faucet page links. | 2026-11-18 | Current, as linked from the docs |

`https://rpc.testnet.near.org` still answered a read-only `ft_metadata` call on 2026-11-18. It is not the NEAR row in the provider table. Prefer the URL on that table. A browser GET of either host returns 405. Send JSON-RPC with POST.

Circle USDC on NEAR testnet, confirmed with `ft_metadata` the same day: contract `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`, symbol USDC, 6 decimals, spec `ft-1.0.0`.

## Wallets and agents

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [NEAR Connect](https://docs.near.org/tools/near-connect) | Browser wallet login. npm `@hot-labs/near-connect` 0.12.0. [Tutorial](https://docs.near.org/web3-apps/tutorials/wallet-login). | 2026-11-18 | Current |
| [NEAR Auth](https://docs.near.org/web3-apps/tutorials/near-auth) | Google, Apple, email, and passkeys. No seed phrase. | 2026-11-18 | Current |
| [SocialDB](https://docs.near.org/primitives/social) | Profiles, posts, and follows. The BOS widget framework on this page is deprecated. | 2026-11-18 | Current for the graph. Not for BOS. |
| [Tools for AI agents](https://docs.near.org/getting-started/tools-for-ai) | CLI, docs index, and the docs search endpoint. [Agent skills repo](https://github.com/near/agent-skills) has no license. Read it. Do not copy it into your project. | 2026-11-18 | Current |
| [Web3 quickstart](https://docs.near.org/web3-apps/quickstart) | A normal frontend. npm `create-near-app` 10.0.0. | 2026-11-18 | Current |

## Security

Official pages. Checked 2026-11-18. A checklist does not replace an independent audit. Courses, scanners, and articles are on the [research note](/near/research).

| Source | What it covers | Checked | Status |
| --- | --- | --- | --- |
| [Security checklist](https://docs.near.org/smart-contracts/security/checklist) | Access control, storage, funds, cross-contract calls, economic design, testing, and operations. | 2026-11-18 | Current |
| [Best practices](https://docs.near.org/smart-contracts/anatomy/best-practices) | Release builds set `overflow-checks = true`. Validate with `require!` before taking action. | 2026-11-18 | Current |
| [One yoctoNEAR](https://docs.near.org/smart-contracts/security/one_yocto) | A sensitive method needs a deposit-capable access key. Also listed under accounts. | 2026-11-18 | Current |
| [Duplicate token IDs](https://docs.near.org/smart-contracts/security/duplicate-inputs) | Reject repeated IDs in a caller-controlled list before paying out. | 2026-11-18 | Current |
| [Storage cost attacks](https://docs.near.org/smart-contracts/security/storage) | Charge for state growth so a caller cannot lock the contract balance. | 2026-11-18 | Current |
| [Callbacks can fail](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures) | A failed callback must leave the contract in a safe state. | 2026-11-18 | Current |
| [Private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks) | Mark a callback `#[private]` so only the contract can call it. | 2026-11-18 | Current |
| [Balance deduction](https://docs.near.org/smart-contracts/security/cross-contract-calls/reentrancy) | Deduct a balance before a cross-contract transfer. Credit a deposit only after success. | 2026-11-18 | Current |
| [Front-running](https://docs.near.org/smart-contracts/security/frontrunning) | Observers can copy or reorder pending actions. The page covers commit-reveal. | 2026-11-18 | Current |
| [Sybil attacks](https://docs.near.org/smart-contracts/security/sybil) | One account is not one person. | 2026-11-18 | Current |

## Do not use

These are archived, deprecated, or replaced. The replacement is the current source.

| Do not use | Why | Use instead |
| --- | --- | --- |
| [near-sdk-js](https://github.com/near/near-sdk-js) | Archived. npm 2.0.0 (2024-06-07). The README says do not use it. | [Rust SDK](https://docs.near.org/tools/sdk) |
| [near-cli (JavaScript)](https://github.com/near/near-cli) | Archived. npm 4.0.13 (2024-03-20). | [near-cli-rs](https://docs.near.org/tools/cli) |
| [`@near-js/*` split packages](https://github.com/near/near-api-js/blob/master/MIGRATION.md) | Superseded by `near-api-js` v7. Not marked deprecated on npm, but the migration guide leaves them. | [near-api-js 7.5.3](https://github.com/near/near-api-js) |
| [Wallet Selector](https://github.com/near/wallet-selector) | Archived. The Connect page says do not use it. | [NEAR Connect](https://docs.near.org/tools/near-connect) |
| BOS components and widgets | The [social page](https://docs.near.org/primitives/social) says the BOS framework is deprecated. | SocialDB, on that same page. A frontend starts at the [web3 quickstart](https://docs.near.org/web3-apps/quickstart). |
| web4 | No page in the [official index](https://docs.near.org/llms.txt) on 2026-11-18. Not a current NEAR product. | [Web3 quickstart](https://docs.near.org/web3-apps/quickstart) |
| `docs.near.org/tools/fastauth-sdk` | Returns 404. The old signer repo is [archived](https://github.com/near/fast-auth-signer). | [NEAR Auth](https://docs.near.org/web3-apps/tutorials/near-auth) |
| [Shade Agent Framework](https://docs.near.org/ai/shade-agents/introduction) | The old URL redirects to the tools page, which says do not use it. Unmaintained since 19 Apr 2026. [Repo](https://github.com/NearDeFi/shade-agent-framework). | [OutLayer](https://docs.near.org/primitives/off-chain-compute/outlayer) or your own check. The warning is on [Tools for AI agents](https://docs.near.org/getting-started/tools-for-ai). |
| [nearai/nearai](https://github.com/nearai/nearai) | Archived. The old hosted agent framework. | [NEAR AI Cloud](https://docs.near.ai/cloud/quickstart) |
| [private-ml-sdk](https://github.com/nearai/private-ml-sdk) | Archived. | [Private inference](https://docs.near.ai/cloud/private-inference) and the [inference SDK](https://docs.near.ai/cloud/inference-sdk/index) |
| [Bridge API](https://docs.near-intents.org/changelog/entries/2026-11-11-bridge-api) | Closing from 11 Nov 2026. | [1Click](https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api) |
| [`EXPERIMENTAL_tx_status`](https://docs.near.org/api-reference/post-experimental_tx_status) | Deprecated alias. | [`tx_status`](https://docs.near.org/api-reference/post-tx_status) |
| [pagoda-relayer-rs](https://github.com/near/pagoda-relayer-rs) | Still the old sample. Last push 2025-02-20. Not a hosted relay you can call. | [Build a relayer](https://docs.near.org/web3-apps/tutorials/meta-transactions) |

## Gotchas

Short version. Commands and the JSON are on the [research note](/near/research).

- Put escrow on its own account. If the contract account pays itself, the token call fails with "Sender and receiver should be different."
- `near-cli-rs` creates key files with Rust `File::create`, which uses mode `0666` and then the process umask. Umask `022` leaves the file at `0644`, readable by other users on the machine. Set umask `077`, or `chmod 0600` the file. [Issue 713](https://github.com/near/near-cli-rs/issues/713) is open. Do not print the key.
- The docs faucet sends testnet NEAR. It does not send USDC. Testnet USDC is the [Circle faucet](https://faucet.circle.com/), opened in a browser. The page is a captcha. It is not a script you can POST.
- Read a payment with `tx_status` and `wait_until` `FINAL`. Do not use `EXPERIMENTAL_tx_status`. Final is not the same as success. Check the USDC receipt.

## Also

The testnet demo, with no payment from the page, is [/earn](/earn).
