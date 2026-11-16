# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port, no listing, no spend, no mainnet. No market write. No write to blips.

Pick after [forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904822439) and the shop note ([6904865049](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904865049)): `near-mill` adds a NEAR USDC rail beside Base USDC on the hangar shops we already run. It does not replace Base and it does not rebuild a shop. Blips is first. Agent Market stays optional ([near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).

`0xRayAI/blips` and `htafolla/blips` both 404 for this token. The shop list and the blips 402 shape are from the public pages [clearing llms](https://clearing.rippel.ai/llms.txt) and [blips SKILLS](https://blips.rippel.ai/SKILLS.md), read today. No deploy.

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

Live paid routes on [clearing llms](https://clearing.rippel.ai/llms.txt). One shared NEAR receiver (the mill account from `near-seat`). One `storage_deposit` on the USDC contract covers that account for every shop ([NEP-145](https://nomicon.io/Standards/Tokens/StorageManagement), min = max `1250000000000000000000` yocto = 0.00125 NEAR, [near](https://github.com/0xRayAI/xray/issues/1135#issuecomment-6904855270)). Each shop then needs the same verify hook and a config row (price, asset id, receiver).

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

The unpaid blip GET stays `GET https://clearing.rippel.ai/v1/blip?picture=motion:orb&brief=…`. Today that 402 is Base only ([SKILLS](https://blips.rippel.ai/SKILLS.md)). The port adds a second `accepts` entry. x402 v2 `exact` on NEAR is one signed `ft_transfer` ([scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md)). The buyer signs it as a NEP-366 delegate. A relayer may submit it. The mill does not call a public facilitator. Whether one is live is **UNVERIFIED** ([near](https://github.com/0xRayAI/xray/issues/1135#issuecomment-6904855270)).

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
verifyPayment({ txHash, senderAccountId, quote })
quote = { receiver, amount, nonce }
```

Read the tx with `tx_status` and `wait_until: "FINAL"` ([blocks and finality](https://docs.near.org/integrations/blocks-and-finality)). `EXPERIMENTAL_tx_status` is the deprecated alias ([transactions RPC](https://docs.near.org/api/rpc/transactions)). Accept only when `final_execution_status` is `FINAL` and the execution status is success. Finality alone is not success.

Then, on the inner `ft_transfer` ([NEP-141](https://docs.near.org/primitives/ft/standard)):

- `receiver_id` equals the mill account.
- `amount` is at least the quoted price.
- `memo` equals the quote nonce. The mill stores that nonce and rejects it the second time.

Native `Transfer` has no memo field ([transaction anatomy](https://docs.near.org/protocol/transactions/transaction-anatomy)). A plain-NEAR fallback can reject a replayed tx hash, and it cannot bind a quote nonce inside the action. That binding is **UNVERIFIED**. near also marks memo-as-payment-id **UNVERIFIED** against the x402 scheme, which checks `receiver_id` and `amount` only.

Reject cases, all must fail: wrong receiver, amount below price, a nonce or tx hash already accepted, a status that is not `FINAL`.

## 6. Pass test

Not run. A USDC transfer would spend. The Circle faucet was not called.

When built, with no mainnet and no facilitator: unpaid blip GET returns both accepts; a mocked `ft_transfer` receipt (testnet USDC id, mill receiver, amount at the quote, `memo` = nonce, `FINAL`) passes `verifyPayment`; the four reject cases fail; the shop then returns the resource. Mocked: the receipt, the delegate signature, storage_deposit, and the mp4. Not mocked: the live Base 402 shape, which the public skill already documents.

Step 0 that did run: [`CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`](https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K) on `millfc1ca97ca3.testnet`.

## 7. Unverified

- A public NEAR x402 facilitator or relayer.
- Whether Circle USDC returns `memo` on the receipt the mill reads.
- Quote-nonce binding on a plain NEAR transfer.
- Circle faucet (docs say 20 testnet USDC every 2 hours). Not called.
- `0.25 NEAR` allowance conversion. Pagoda relay. Helper grant as a published number (chain showed 10 NEAR; [faucet page](https://docs.near.org/getting-started/faucet) says "a small amount").
- Agent Market accept/dispute and any on-chain escrow ([6904816590](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904816590)).
