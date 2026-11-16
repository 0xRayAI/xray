# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port, no listing, no spend, no mainnet. No market write was sent.

Reworked after Blaze via [forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904782530). Agent Market already hires by the job and holds the payment. This eval does not design an escrow. near's [fastest-path comment](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904632647) and [reply](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904676165) still set step 0. near has not posted a separate `/v1` confirmation since the pivot. The steps below are from the market docs fetched today.

## 1. Pick

Install one skill, `near-market`. It runs step 0, then lists the seat on Agent Market and carries a job through delivery. The metric is time to the first paid job.

Step 0 is `near-seat`: a testnet account, a function-call key, and the full-access key sealed at `0600`. End to end that step is **about 10.6s**, not 3.6s. The measured pieces were create 3.59s, grant 3.58s, and the first call 3.62s (10.78s). The 3.6s figure was only create-through-sign on an earlier account.

## 2. Step list

| Step | What | Source |
|---|---|---|
| 0a | Faucet-create a `.testnet` account with `save-to-legacy-keychain`. | [named accounts](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts), [CLI](https://docs.near.org/tools/cli) |
| 0b | Before `grant-function-call-access`, `view_account` at most **5** times, **1s** apart. If the account is still missing, stop. Do not grant. | This run's first view failed at 0.24s; a later view saw the account. Cap is 5. |
| 0c | Grant a function-call key. Seal the full-access key in `$SEAT_HOME/near-cold/` at `0600`. Do not delete it on chain: an account with only function-call keys cannot add a key. | [access keys](https://docs.near.org/protocol/accounts-contracts/access-keys) |
| 1 | Owner confirms email (Google sign-in counts). Create the listing: name, handle, tagline. It stays a `draft`. | [List your agent](https://docs.market.near.ai/list-your-agent) |
| 2 | Set price and delivery SLA. Live requires a price. | same page |
| 3 | Mint an `aat_` token. The docs say this is the only credential the agent needs for the job loop. | same page; [worker skill](https://market.near.ai/skill/SKILL.md) |
| 4 | `GET /v1/agents/me/assignments`. A row with `startedAt: null` is a fresh hire. | [list your agent](https://docs.market.near.ai/list-your-agent), [OpenAPI](https://market.near.ai/openapi.json) |
| 5 | `POST /v1/assignments/{id}/start` before work. Until then the buyer can cancel for a full refund. | same |
| 6 | `POST /v1/assignments/{id}/submit` with `deliverableMarkdown`. A thread message is not delivery. | [FAQ](https://docs.market.near.ai/faq), [how it works](https://docs.market.near.ai/concepts/how-it-works) |
| 7 | Buyer accepts, or silence accepts after 3 days (up to 7). Payout is price minus a 5% fee, in the currency the buyer paid. | [payments](https://docs.market.near.ai/concepts/payments-and-disputes) |

The same four calls exist as MCP tools on `https://market.near.ai/mcp` ([list your agent](https://docs.market.near.ai/list-your-agent)). Register is `POST /v1/agents/register` in the [OpenAPI](https://market.near.ai/openapi.json) (info title `agents-market API`, version `2.0.0`). That file lists no `servers` entry, and the words sandbox, testnet, and staging do not appear.

Seat files live under `.xray/state/seats/<seat>/near`. That directory is gitignored on the forge branch. This eval does not change `.gitignore`.

## 3. Keys, and what the market actually checks

A function-call key cannot attach NEAR. Its `allowance` caps gas only. Omit the allowance and the key can burn unlimited gas. It is not a budget on the job price ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)).

The market loop does not ask for that key. Auth on the worker skill is `Authorization: Bearer aat_…`. The token cannot accept work, move money, or read the owner's wallet ([worker skill](https://market.near.ai/skill/SKILL.md)). Held payment is the marketplace balance: USD by card, or USDC from a crypto deposit (BTC, ETH, USDC, USDT, NEAR, SOL, or DAI) via a one-time deposit address ([wallets](https://docs.market.near.ai/buyers/wallets-and-billing)). USDC withdrawal is "a wallet address that you enter" ([payments](https://docs.market.near.ai/concepts/payments-and-disputes)).

Whether an FC key is enough to list or to withdraw is **UNVERIFIED**. The pages above never name `ed25519` or a function-call key. The May 14, 2026 post says Agent Market USDC rides Confidential Intents ([blog](https://near.ai/blog/usdc-confidential-intents-private-agent-payments)). It does not say the worker must sign with an FC key.

`save-to-legacy-keychain` writes two key files with `File::create` and no mode, so umask `022` leaves them at `0644` ([`src/common.rs`](https://github.com/near/near-cli-rs/blob/v0.31.1/src/common.rs)). There is no credentials-dir flag. The wrapper sets umask `077`, then fails unless every `private_key` file under the seat dir and `~/.near-credentials` is `0600` and the secret is absent from stdout and stderr. **That gate needs an automated test once the wrapper is built.** This plan does not add the test.

## 4. Mock

No sandbox was found, so the pass test does not call production. The mock is a local HTTP stand-in of four routes and one ledger line:

- `POST /v1/agents/register` returns a fake agent id and a fake `aat_` token.
- `GET /v1/agents/me/assignments` returns one row, `startedAt: null`.
- `POST /v1/assignments/{id}/start` and `POST /v1/assignments/{id}/submit` return 200.
- A fixture `{ "kind": "payout" }` stands in for acceptance.

Not mocked as success, and not run: email confirmation, Discover going Live, a test run on market.near.ai, Stripe, a USDC withdrawal, an Intents deposit address, and any chain transaction. A draft "test run" on the real site is a production write and pays nothing ([list your agent](https://docs.market.near.ai/list-your-agent)). It is out.

## 5. Time to first paid job

**UNVERIFIED.** Nothing was listed and nothing was hired. The docs put payout within seconds of acceptance, or on the 3-to-7-day silence clock ([payments](https://docs.market.near.ai/concepts/payments-and-disputes)). A test run does not pay. Step 0, already measured, is about 10.6s and is not a paid job.

No new testnet transaction this pass. The step-0 proof remains [tx `CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`](https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K) on `millfc1ca97ca3.testnet`: `set_greeting`, deposit 0, function-call key. Account `millb40a714e.testnet` was the earlier faucet account.

## 6. Unverified

- Market sandbox or testnet. Absent from `openapi.json` and from the docs index.
- Whether listing or payout requires a NEAR key, and whether an FC key suffices.
- The helper's published grant. This chain showed 10 NEAR on `millb40a714e.testnet`. The [faucet page](https://docs.near.org/getting-started/faucet) says "a small amount." `near-seat` reads the balance back.
- Pagoda relay and any other relayer. Not called. CLI defaults leave `meta_transaction_relayer_url` unset ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904632647)).
- How `0.25 NEAR` became on-chain allowance `249846713045166000000000`.
- `accounts.json` and `ft_contracts.json`, left at `0644` and not opened.
