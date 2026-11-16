# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port, no listing, no spend, no mainnet. No market write.

Pick after [forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904822439): one skill that ports today's mill so a user ends with a suited mill, a NEAR identity, a hangar listing, and pay that can settle on NEAR. Agent Market is an optional second listing, not this pick ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).

## 1. Pick

Install `near-mill`. It runs the Base flow with two swaps: `near-seat` for the identity, and a plain testnet NEAR transfer for the payment. Groover, the suit, and the hangar catalog stay as they are.

Step 0, `near-seat`, is **about 10.6s** end to end, not 3.6s. Measured: create 3.59s, grant 3.58s, first call 3.62s (10.78s). The 3.6s figure was an earlier create-through-sign only.

## 2. Base step to NEAR step

| Base step | NEAR step | Tag |
|---|---|---|
| `house init` and `doctor` ([stand-up-fleet](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/stand-up-fleet/SKILL.md)) | Same commands. | CARRIES OVER |
| Fasten mill + inspect | Same fasten. | CARRIES OVER |
| Groover `register` → Dynamo citation → `mint_suit` → ERC-8004 pin ([groover-factory-parity](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/groover-factory-parity/SKILL.md)) | Same MCP host `https://groover.rippel.ai/mcp`. Pin stays the existing USDC pin. Do not replace it with a NEAR account. | CARRIES OVER |
| OWS wallet, USDC on Base, EIP-3009 `X-PAYMENT` ([setup-ows-pay](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-ows-pay/SKILL.md)) | Buyer pays the mill's testnet account with a plain NEAR transfer. The mill's working key is not the signer. | SWAP |
| `npx groover-hangar`, `GET /v1/catalog`, unpaid GET returns 402 ([plant-hangar-shops](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/plant-hangar-shops/SKILL.md)) | Same plant and catalog. The paid retry uses the NEAR transfer instead of Base USDC. | CARRIES OVER, pay rail SWAP |
| `near-seat`: faucet account, function-call key, full-access key sealed | New identity beside Groover. Not a replacement. | SWAP |
| `0600` / no-leak check | umask `077`, then fail unless every `private_key` file under the seat dir and `~/.near-credentials` is `0600` and the secret is absent from stdout and stderr. | NEW |
| Agent Market list / job / payout | Optional later channel. Off-chain ledger, no sandbox ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)). | NEW, not the pick |

`view_account` before `grant-function-call-access` retries at most **5** times, **1s** apart, then stops. Do not grant if the account is still missing.

The full-access key stays sealed in `$SEAT_HOME/near-cold/` at `0600`. It is not deleted on chain: without it the account cannot add a key ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)). A function-call key cannot attach NEAR, so it cannot be the payer. Its `allowance` caps gas only. The buyer pays with their own key. Seat files sit under `.xray/state/seats/<seat>/near`, gitignored on the forge branch. This eval does not change `.gitignore`. The `0600` gate needs an automated test once the wrapper is built. This plan does not add that test.

`save-to-legacy-keychain` writes both key files with `File::create` and no mode, so umask `022` leaves them `0644` ([`src/common.rs`](https://github.com/near/near-cli-rs/blob/v0.31.1/src/common.rs)).

## 3. Settlement

Plain NEAR transfer is the minimal rail that the core docs specify and that testnet can do ([CLI `send-near`](https://docs.near.org/tools/cli), [access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)).

| Rail | Why not first |
|---|---|
| NEP-141 / USDC | `ft_transfer` needs 1 yocto attached. A function-call key cannot attach it. Testnet USDC via Circle was not used. **UNVERIFIED** as the hangar rail. |
| Intents / 1Click | No testnet ([FAQ](https://docs.near-intents.org/resources/faqs)). Host is `https://1click.chaindefuser.com` ([making a request](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request)). |
| Chain Signatures to Base | Five steps, and relaying can move real Base funds ([implementation](https://docs.near.org/chain-abstraction/chain-signatures/implementation)). |

near asked USDC versus Intents ([forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904822439)). Neither is proven here. The first payable proof is a plain transfer.

## 4. Pass test

What ran live is step 0 only, on 2026-11-16, `near-cli-rs` 0.31.1. Account `millfc1ca97ca3.testnet`. Transaction [`CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`](https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K): `set_greeting` on `hello.near-examples.testnet`, deposit 0, function-call key. Keys were deleted. No new transaction this pass.

Mocked, and not sent:

- Groover register, mint, and pin.
- `GET /v1/catalog` row and the 402.
- The buyer's NEAR transfer and the paid retry.
- Agent Market `POST /v1/agents/register`, assignments, start, and submit.

A listed, payable mill is those mocks plus the live near-seat account. Time from zero to a paid listing is **UNVERIFIED**.

## 5. Unverified

- USDC-on-NEAR and Intents as the hangar rail.
- Pagoda relay. CLI defaults leave `meta_transaction_relayer_url` unset ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904632647)).
- Helper grant as a published number. The chain showed 10 NEAR. The [faucet page](https://docs.near.org/getting-started/faucet) says "a small amount."
- How `0.25 NEAR` became allowance `249846713045166000000000`.
- `accounts.json` and `ft_contracts.json` (left `0644`, not opened).
- Agent Market accept/dispute (not in the OpenAPI near fetched) and any on-chain escrow. near found none ([6904816590](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).
