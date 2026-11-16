# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port, no listing, no spend, no mainnet. No market write. No write to blips.

Pick after [forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904822439) and the shop note ([6904865049](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904865049)): `near-mill` is a plan to add a NEAR USDC rail beside Base USDC on the hangar shops we already run. It does not replace Base and it does not rebuild a shop. Blips is first. No USDC payment has been sent, and no blip has been served on this rail. Agent Market stays optional ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).

`near-seat` is the NEAR identity only. It does not replace the Groover ETH pin or the doctor OWS wallet.

`0xRayAI/blips` 404s for this token. `htafolla/blips` is private (client and site) and is not needed. The blip shop that serves the 402 is public [htafolla/clearing](https://github.com/htafolla/clearing) at `619d1e7e000c214a474a1dfb514ce1ae68dd9526`: `mcp/src/blip.ts` and `mcp/src/blips-escalator.ts`. Prices on the public pages [clearing llms](https://clearing.rippel.ai/llms.txt) and [blips SKILLS](https://blips.rippel.ai/SKILLS.md) were read today. No deploy.

## 1. Pick

Install `near-mill`. Suit, Groover register / `mint_suit` / pin, and `npx groover-hangar` carry over. Two swaps: `near-seat` for the NEAR identity, and the pay asset (Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` stays; NEAR USDC is a second `accepts` entry). x402 itself carries over.

Step 0, `near-seat`, is **about 10.6s** end to end, not 3.6s. Measured: create 3.59s, grant 3.58s, first call 3.62s (10.78s).

## 2. Map

| Base step | NEAR step | Tag |
|---|---|---|
| `house init` and `doctor` ([stand-up-fleet](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/stand-up-fleet/SKILL.md)) | Same. | CARRIES OVER |
| Fasten mill + inspect | Same. | CARRIES OVER |
| Groover register → mint → ERC-8004 pin ([groover-factory-parity](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/groover-factory-parity/SKILL.md)) | Same host `https://groover.rippel.ai/mcp`. | CARRIES OVER |
| x402 402, then a signed USDC payment ([setup-ows-pay](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-ows-pay/SKILL.md)) | Same 402. Second accept is NEAR USDC `ft_transfer` as a NEP-366 delegate. Base EIP-3009 stays. | CARRIES OVER, asset SWAP |
| Hangar plant and catalog ([plant-hangar-shops](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/plant-hangar-shops/SKILL.md)) | Same plant. Each paid shop gains a NEAR receiver. | CARRIES OVER |
| `near-seat` | Testnet account, function-call key, full-access key sealed. | SWAP |
| `0600` / no-leak check | umask `077`, then the file walk below. | NEW |
| Agent Market | Optional later listing. | NEW, not the pick |

`view_account` before grant retries at most **5** times, **1s** apart, then stops. The full-access key stays in `$SEAT_HOME/near-cold/` at `0600` and is not deleted on chain ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)). A function-call key cannot attach the 1 yocto that `ft_transfer` requires, so the buyer signs, not the mill's working key. Seat files are under `.xray/state/seats/<seat>/near`, gitignored on the forge branch. This eval does not change `.gitignore`. The `0600` gate needs an automated test once the wrapper is built.

## 3. Shops

Live paid routes on [clearing llms](https://clearing.rippel.ai/llms.txt). One shared NEAR receiver (the mill account from `near-seat`). One `storage_deposit` of 0.00125 NEAR registers that mill receiver on the USDC contract and covers it for every shop ([NEP-145](https://nomicon.io/Standards/Tokens/StorageManagement), min = max `1250000000000000000000` yocto, [near](https://github.com/0xRayAI/xray/issues/1135#issuecomment-6904855270)). It does not register the buyer. The buyer must already be storage-registered on that contract before `ft_transfer`. `ft_transfer` has no `ft_resolve_transfer` refund: a failed receipt moves nothing, and a successful receipt is final ([NEP-141](https://docs.near.org/primitives/ft/standard), [core](https://nomicon.io/Standards/Tokens/FungibleToken/Core)). Each shop then needs the same verify hook and a config row (price, asset id, receiver).

| Shop | Price today (Base USDC) | NEAR rail |
|---|---|---|
| blip `GET /v1/blip` | escalator, nickel at mint 0 ([blips SKILLS](https://blips.rippel.ai/SKILLS.md)) | First. Receiver, storage_deposit, verify hook, price from the 402. |
| extract `GET /v1/extract` | $0.02 | Same four. |
| skim `GET /v1/skim` | $0.01 | Same four. |
| pin `GET /v1/pin` | $0.01 | Same four. |
| card `POST /v1/card` | $0.05 | Same four. |
| ping `GET /v1/ping` | $0.01 | Same four. |

In-repo plant names are `shop-extract`, `shop-witness`, `shop-pin` ([ARM-S](https://github.com/0xRayAI/xray/blob/main/examples/killer-dual/ARM-S-LANDSCAPE.md)). The live list has skim, not witness. Witness is not on the llms page today.

Testnet USDC contract: `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (Circle, 6 decimals). Mainnet id, not used here: `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`.

## 4. Both rails on the 402

The unpaid blip GET stays `GET https://clearing.rippel.ai/v1/blip?picture=motion:orb&brief=…`. Today that 402 is Base only. In [htafolla/clearing](https://github.com/htafolla/clearing) @ `619d1e7e`, `mcp/src/blip.ts` `handleBlip` prices the mint with `blipPriceCents` from `mcp/src/blips-escalator.ts` (`max(5, round(5 + 550 * (mintIndex/555)**2))`), builds one Base requirement (`network: "eip155:8453"`, `maxTimeoutSeconds: 180`), and returns `buildQuote` at 402. A paid request is settled by `ctx.facilitator.settle`, which accepts only `eip3009` (`mcp/src/facilitator.ts`). The port adds a second `accepts` entry beside that Base requirement and, when `network` is `near:testnet`, calls `verifyPayment` instead of the facilitator.

x402 v2 `exact` on NEAR is one signed `ft_transfer` whose amount equals the requirement ([scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md)). The buyer signs a NEP-366 `Delegate` with a full-access key and submits that `SignedDelegateAction` itself, which pays the outer gas. A relayer may submit it instead, and that relayer stays **UNVERIFIED**. nearcore 2.14.0 removed `DelegateV2`. Legacy `Delegate` rejects a gas-key signer (`DelegateActionRequiresNonGasKey`), so a function-call key cannot sign this delegate ([release](https://github.com/near/nearcore/releases/tag/2.14.0)). The mill does not call a public facilitator ([near](https://github.com/0xRayAI/xray/issues/1135#issuecomment-6904855270)).

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "maxAmountRequired": "60000",
      "payTo": "0xPayToFromTodays402"
    },
    {
      "scheme": "exact",
      "network": "near:testnet",
      "asset": "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
      "maxAmountRequired": "60000",
      "payTo": "mill.testnet",
      "extra": { "method": "ft_transfer", "memo": "<quote-nonce>" }
    }
  ]
}
```

`60000` is 0.06 USDC at 6 decimals, the public mint-desk figure on [blips.rippel.ai](https://blips.rippel.ai/) when this was read (mint 18). Do not hard-code it. Read the live 402. Plain NEAR is a third accept only as fallback, and it cannot carry `memo`.

The hangar still wants the Base retry body at `x402Version: 1` with `eip3009` ([SKILLS](https://blips.rippel.ai/SKILLS.md)). The NEAR accept does not replace that body.

## 5. Payment proof

```text
verifyPayment({ txHash, senderAccountId, nonce })
```

The mill loads the quote it issued, keyed by `nonce`, from its own store: `{ receiver, amount, nonce, expiresAt }`. The caller does not supply `receiver` or `amount`. A missing nonce rejects. Nonce TTL is **180 seconds** from issue, the same window as `maxTimeoutSeconds` on the blip quote (`mcp/src/blip.ts`). A nonce past that TTL rejects. A second use of a nonce rejects.

Read the tx with `tx_status` and `wait_until: "FINAL"` ([blocks and finality](https://docs.near.org/integrations/blocks-and-finality)). `EXPERIMENTAL_tx_status` is the deprecated alias ([transactions RPC](https://docs.near.org/api/rpc/transactions)). Accept only when `final_execution_status` is `FINAL` and the execution status is success. Finality alone is not success.

Then, on the inner `ft_transfer` ([NEP-141](https://docs.near.org/primitives/ft/standard)):

- `receiver_id` equals the stored quote's receiver (the mill account).
- `amount` is the 6-decimal integer string and is equal to the stored quote's amount. The x402 `exact` scheme on NEAR requires that equality ([scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md)). `"60000"` matches `"60000"`. `"60001"` does not, and `"59999"` does not.
- `memo` equals that same nonce. The stored record already binds the nonce to this receiver and this amount.

`ft_transfer` does not run `ft_resolve_transfer`. A failed receipt moves nothing. A successful receipt is final. There is no refund of a transfer that succeeded ([core](https://nomicon.io/Standards/Tokens/FungibleToken/Core)).

Native `Transfer` has no memo field ([transaction anatomy](https://docs.near.org/protocol/transactions/transaction-anatomy)). A plain-NEAR fallback can reject a replayed tx hash, and it cannot bind a quote nonce inside the action. That binding is **UNVERIFIED**. near also marks memo-as-payment-id **UNVERIFIED** against the x402 scheme, which checks `receiver_id` and `amount` only.

Reject cases, all must fail: wrong receiver, amount string not equal to the stored quote, nonce missing or past the 180s TTL, a nonce or tx hash already accepted, a status that is not `FINAL` and successful.

## 6. Pass test

Not run. A USDC transfer would spend. The Circle faucet was not called.

When built, with no mainnet and no facilitator: unpaid blip GET returns both accepts; a mocked `ft_transfer` receipt (testnet USDC id, mill receiver, amount string equal to the stored quote, `memo` = nonce, `FINAL`) passes `verifyPayment`; the reject cases in section 5 fail; the shop then returns the resource. That pass is a mock. It has not run. Mocked: the receipt, the delegate signature, storage_deposit, and the mp4. Not mocked: the live Base 402 shape, which `mcp/src/blip.ts` and the public skill already document.

Step 0 that did run: [`CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`](https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K) on `millfc1ca97ca3.testnet`.

## 7. Two MIT repos against this 402

Clearing's server is [htafolla/clearing](https://github.com/htafolla/clearing) at `619d1e7e000c214a474a1dfb514ce1ae68dd9526` (2026-11-11). GitHub reports no license. `htafolla/blips` is private and is not the shop. The blip 402 is `mcp/src/blip.ts` `handleBlip`: it calls `blipPriceCents` / `blipPriceUsd` in `mcp/src/blips-escalator.ts`, then `buildRequirements` and `buildQuote` in `mcp/src/x402.ts` (one `accepts` entry, `x402Version: 2`, `network: "eip155:8453"`). An unpaid GET returns that quote at 402. A paid GET goes through `decodePayload`, `requirementsMatch`, and `ctx.facilitator.settle` (`mcp/src/facilitator.ts`), which settles only `eip3009` through CDP or ZigZag. The NEAR rail is a second `accepts` entry with the same atomic amount string, `network: "near:testnet"`, the Circle testnet USDC id, `payTo` set to the mill account, and `extra.memo` set to the nonce just stored. `handleBlip` then calls `verifyPayment` for that network and does not call CDP.

Testnet USDC `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` answered `ft_metadata` on `https://rpc.testnet.near.org` today: `symbol` `USDC`, `decimals` 6, `spec` `ft-1.0.0`.

nearcore 2.14.0 removed `DelegateV2`. A NEP-366 `Delegate` still submits when a full-access key signs it. A gas key cannot sign it (`DelegateActionRequiresNonGasKey`) ([release](https://github.com/near/nearcore/releases/tag/2.14.0)). Outer gas is paid by the account that submits the `SignedDelegateAction`: the buyer, with that full-access key, or a relayer that stays **UNVERIFIED**. `storage_deposit` covers the mill receiver only. The buyer must already be registered ([NEP-145](https://nomicon.io/Standards/Tokens/StorageManagement)).

| Repo | As-is | Rewrite |
|---|---|---|
| [MihenkAI/near-pay-per-call](https://github.com/MihenkAI/near-pay-per-call) MIT, `1da0b45c4f9ad29cdf654e773a2c9e878bcc2d3d` | **Leg up:** `server.mjs` `verify` (lines 63–113). It calls RPC `tx` with `wait_until: "FINAL"`, requires `ft_transfer`, checks `receiver_id`, `memo` `mihenk-x402:<nonce>`, the token log, and a used-tx set. No facilitator. The buyer broadcasts and pays gas. `lib.mjs` `saveKey` writes mode `0600`. | Token default is `usdc.fakes.testnet`, not the Circle id (`lib.mjs` line 14). `near-api-js` is `5.1.1`. It treats a larger transfer as enough; our check is string equality with the stored quote. It keeps a paid nonce for 24 hours; our TTL is 180 seconds. It checks `SuccessValue` and does not require `final_execution_status === "FINAL"`. It does not register the mill receiver. Do not port the fake token or the price table. |
| [x402-near](https://github.com/alhassanmohammederc3643-cmyk/x402-near) MIT, `a16e87c37d77509fa7f8c0a7192c2b0cad636ea2` | **Reference only.** `facilitator.mjs` `verify` checks one `ft_transfer`, deposit `1` yocto, exact amount, payee, and a NEP-366 signature, then `signAndSendTransaction` of `signedDelegate`. The facilitator account pays gas. `replay-store.mjs` stores a hash of the payload. | Asset is `wrap.testnet` (`lib.mjs` line 20), not USDC. No `memo`, so the nonce is not bound to amount and receiver. Replay is the payload hash, not the quote nonce. Depends on `@near-js/transactions` `2.5.1` and `near-api-js` `6.5.1`. Whether that package emits `Delegate` or removed `DelegateV2` is **UNVERIFIED**. No `storage_deposit`. Not a leg up for our verify path: the mill does not use their relayer. |

Anyfare and Allowance stay parked. They are not this 402.

## 8. Unverified

- A public NEAR x402 facilitator or relayer.
- Whether Circle USDC returns `memo` on the receipt the mill reads.
- Quote-nonce binding on a plain NEAR transfer.
- Circle faucet (docs say 20 testnet USDC every 2 hours). Not called.
- `0.25 NEAR` allowance conversion. Pagoda relay. Helper grant as a published number (chain showed 10 NEAR; [faucet page](https://docs.near.org/getting-started/faucet) says "a small amount").
- Agent Market accept/dispute and any on-chain escrow ([6904816590](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).
