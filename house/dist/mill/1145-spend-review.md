# 1Click spend review

This step made no deposit and no mainnet transaction. One read-only dry quote was sent. A later live deposit needs critic Strict on this review first. The spend cap is 1 USDC total, 1000000 units at 6 decimals, across every live quote in the ledger. 1Click has no testnet.

`placeholder.near` is not the foundry. `0x2527D02599Ba641c19FEa793cD0F167589a0f10D` is the sample address from the OpenAPI example. It is not a wallet this repo controls. Both are placeholders for the dry call only.

## Sources

- Quote request: https://docs.near-intents.org/api-reference/oneclick/request-a-swap-quote
- OpenAPI: https://1click.chaindefuser.com/docs/v0/openapi.yaml
- Swap types: https://docs.near-intents.org/integration/distribution-channels/1click-api/swap-types
- How to call it: https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request
- Status: https://docs.near-intents.org/api-reference/oneclick/check-swap-execution-status
- SDK: https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk and https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript
- Auth and the extra fee: https://docs.near-intents.org/integration/distribution-channels/1click-api/authentication
- Fees: https://docs.near-intents.org/resources/fees and https://docs.near-intents.org/integration/distribution-channels/1click-api/fee-config
- No testnet: https://docs.near-intents.org/resources/faqs
- Token list used to confirm the two USDC ids: `GET https://1click.chaindefuser.com/v0/tokens`

Reference only, not copied. MIT checkout plugin at `e098b4a0494a7dcf808e49b417f2a5da0d671e2f`:

- https://github.com/Guglielmo15/intents-checkout/blob/e098b4a0494a7dcf808e49b417f2a5da0d671e2f/plugin/src/QuoteService.php
- https://github.com/Guglielmo15/intents-checkout/blob/e098b4a0494a7dcf808e49b417f2a5da0d671e2f/plugin/src/OneClick/SandboxClient.php

That sandbox asks 1Click for a dry quote. This client does the same. It does not turn a dry quote into a live one.

## Quote we would send

`POST https://1click.chaindefuser.com/v0/quote`

| Field | Value |
| --- | --- |
| dry | true for this step. false only later, and only with `ONECLICK_LIVE=1` |
| swapType | EXACT_OUTPUT. `amount` is the USDC we want on NEAR |
| originAsset | `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near` (Base USDC, 6 decimals) |
| destinationAsset | `nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` (NEAR USDC, 6 decimals) |
| amount | `500000` for the dry call (0.5 USDC out). One call cannot ask for more than `1000000`, and the ledger keeps the total at or under `1000000` |
| depositType | ORIGIN_CHAIN. The deposit, when a live quote exists, is a Base address, not an Intents balance |
| depositMode | SIMPLE |
| recipient | a NEAR account. This dry call used `placeholder.near`. A live quote ignores that field and reads `ONECLICK_RECIPIENT` only |
| recipientType | DESTINATION_CHAIN, so the USDC is withdrawn to that NEAR account |
| refundTo | a Base address we control, all-lowercase or EIP-55 checksum. This dry call used the OpenAPI sample, which we do not control. A live quote ignores that field and reads `ONECLICK_REFUND_TO` only |
| refundType | ORIGIN_CHAIN. The client rejects INTENTS and CONFIDENTIAL_INTENTS |
| deadline | an ISO time from 2 minutes to 24 hours ahead. This dry call used 30 minutes |
| slippageTolerance | 100 basis points (1%). The client rejects a higher setting |

## Refund, deadline, fees

A failed or short deposit refunds to `refundTo` on Base. For EXACT_OUTPUT, a deposit below `minAmountIn` is refunded by the request deadline. A deposit above `amountIn` still swaps, and the extra comes back to `refundTo` after the swap. The refund must be a Base address whose key we hold. An Intents balance is not an acceptable refund, because we may not be able to move it.

The request deadline is the time we put on the quote. That is when a refund starts if the swap is not done. It has to be long enough for the Base transfer to be mined. The client keeps it between 2 minutes and 24 hours.

A live quote also returns its own `deadline`. The API describes that time as when the deposit address goes inactive and funds may be lost. A dry quote omits `deadline`, `depositAddress`, and `timeWhenInactive`. This step has no deposit address. Do not send funds after a live quote's deadline.

Fees, from the published schedule, with no `appFees` and `insured` left false:

- An on-chain protocol fee of 0.0001% sits under the platform fee.
- No API key: an extra 0.25% (25 bps) on this quote.
- With an API key and no app fee: 0.20% normally, or 0.01% for USDC, USDT, DAI, and same-asset routes across chains.
- `withdrawFee` is already inside `amountOut`. `refundFee` is charged only if a refund happens.
- The dry quote below is the number to trust for this route. It was unauthenticated.

A JWT is not required for a dry quote. If we have one, the env name is `INTENTS_CHECKOUT_JWT`. Send it as `X-API-Key`. `Authorization: Bearer` is also accepted. The value stays out of git. This dry call sent no token. A bad token gets HTTP 401.

Status is `GET https://1click.chaindefuser.com/v0/status?depositAddress=<address>` and, when the quote included one, `depositMemo`. Poll until `SUCCESS`, `REFUNDED`, or `FAILED`. Other states are `PENDING_DEPOSIT`, `KNOWN_DEPOSIT_TX`, `INCOMPLETE_DEPOSIT`, and `PROCESSING`. There is nothing to poll until a live quote returns a deposit address.

## Live gate

A live quote (`dry: false`) needs all of these in the environment, with no defaults:

- `ONECLICK_LIVE=1`
- `ONECLICK_RECIPIENT`, the foundry NEAR account. The client refuses a name that starts with `placeholder` or contains `placeholder`. An `opts.recipient` that differs is refused.
- `ONECLICK_REFUND_TO`, a Base address we control. All-lowercase is accepted. Mixed case must be a valid EIP-55 checksum. The client refuses the OpenAPI sample `0x2527D02599Ba641c19FEa793cD0F167589a0f10D` in any case, and the zero address. An `opts.refundTo` that differs is refused.
- `ONECLICK_LEDGER`, a JSON file outside git. The file must already exist. A missing file, or a file missing `spent`, `reserved`, `closed`, or `quotes`, is refused. It is not a fresh budget. Create it with `grok-bot near-1click init --ledger <file>`. That init is the owner reset: it creates the file only when it is absent, and it will not overwrite an existing file. To reset a closed ledger, delete the file and run init again. The client reserves the request amount before the POST. `reserved + spent + amount` must stay at or under `1000000`. Before it records a quote, it reads the ledger again under the same lock and checks that it is still open and that the total still fits. After a successful quote it records the correlation id and `amountIn` and marks the ledger closed. A failed POST releases the reservation.

Live deadline checks use `Date.now()`. `opts.now` is ignored in live mode.

The `amountIn` cap check runs after the POST. 1Click has already minted the quote. If `amountIn` is over `1000000`, the client throws and does not return the deposit address. Do not look for that address anywhere else, and do not send funds.

`redact` covers error text only. Success bodies are not logged.

## One live test, not done here

Max cost is 1 USDC total. Stop if the quoted `amountIn` is above 1000000.

1. Critic Strict approves this review.
2. Put the foundry NEAR account in `ONECLICK_RECIPIENT` and a Base address we control in `ONECLICK_REFUND_TO`. Outside git, run `grok-bot near-1click init --ledger <file>` and point `ONECLICK_LEDGER` at that file. Init will not replace a file that is already there.
3. Set `ONECLICK_LIVE=1` only in the environment. Set `INTENTS_CHECKOUT_JWT` only if we want the partner fee. Do not write any of these values into git.
4. Run another dry quote for `500000` out. Dry mode can still take addresses from the call. Live mode will not.
5. If `amountIn` is above 1000000, stop.
6. One live quote (`dry: false`). The ledger reserves the amount first. If the POST fails, the reservation is released. If `amountIn` is above 1000000, the client throws and does not hand back the deposit address. Send nothing. A second live quote is refused. The owner reset is to delete the ledger file and run `grok-bot near-1click init --ledger <file>` again. Deleting the file without init does not open a new budget.
7. One Base USDC transfer of `amountIn` to that deposit address, before the quote deadline. Not more than 1000000 units, and not more than the ledger still allows. No second transfer.
8. Poll status until `SUCCESS`, `REFUNDED`, or `FAILED`. On a refund, the USDC returns to the Base address. Do not send more.

This dry quote's `amountIn` was 509290, about 0.51 USDC, which is under the cap. That is not permission to deposit.

## Dry quote, 2026-11-18

No JWT was set. `ONECLICK_LIVE` was not set. `depositAddress` was omitted.

| Field | Value |
| --- | --- |
| amountOut | 500000 (0.5 USDC) |
| amountIn | 509290 (0.50929 USDC, about 0.509 USD) |
| minAmountIn | 504239 |
| minAmountOut | 500000 |
| amountOutUsd | 0.499801500000 |
| timeEstimate | 35 seconds |
| refundFee | 2400 (0.0024 USDC, only if refunded) |
| withdrawFee | 4227 (already inside amountOut) |
| quote deadline | omitted, as documented for `dry: true` |
| correlationId | 342640ea-1929-48ce-abad-b1ca2a3f2599 |

The gap from `minAmountIn` to `amountIn` is about the 1% slippage buffer, not an exact 1%. 1% of `509290` is `504197`, and the quote's `minAmountIn` is `504239`. Anything under `minAmountIn` is refunded to the Base address by the request deadline. The request deadline on this call was `2026-11-18T00:58:30.738Z`.

The response included a 1Click quote signature. It is omitted here because the value uses `ed25519:` encoding. It is not a key this repo holds.

```json
{
  "quote": {
    "amountIn": "509290",
    "amountInFormatted": "0.50929",
    "amountInUsd": "0.509087811870",
    "minAmountIn": "504239",
    "amountOut": "500000",
    "amountOutFormatted": "0.5",
    "amountOutUsd": "0.499801500000",
    "minAmountOut": "500000",
    "timeEstimate": 35,
    "refundFee": "2400",
    "withdrawFee": "4227"
  },
  "quoteRequest": {
    "dry": true,
    "depositMode": "SIMPLE",
    "swapType": "EXACT_OUTPUT",
    "slippageTolerance": 100,
    "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "depositType": "ORIGIN_CHAIN",
    "destinationAsset": "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    "amount": "500000",
    "refundTo": "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
    "refundType": "ORIGIN_CHAIN",
    "recipient": "placeholder.near",
    "recipientType": "DESTINATION_CHAIN",
    "deadline": "2026-11-18T00:58:30.738Z",
    "confidentiality": "public",
    "quoteWaitingTimeMs": 0,
    "insured": false,
    "appFees": []
  },
  "signature": "[omitted]",
  "timestamp": "2026-11-18T00:28:31.004Z",
  "correlationId": "342640ea-1929-48ce-abad-b1ca2a3f2599"
}
```

## Open questions

- Which mainnet NEAR account is the foundry recipient? `placeholder.near` is only a name that passes the account check.
- Which Base address do we control for `refundTo`? The sample address above must not be used for a live quote.
- Does that NEAR account already have USDC storage? A withdrawal to an unregistered account can fail.
- Do we have `INTENTS_CHECKOUT_JWT` for the partner fee, or do we accept the extra 0.25% on a later 0.5 USDC test?
- Base USDC to NEAR USDC should be the 0.01% same-asset rate when authenticated. This unauthenticated quote is the measured price. Confirm the partner rate before the live call if we care about the fee, not the cap.
- The live quote's own deadline is the one that matters for "funds may be lost." Read it before any transfer. This dry response does not include it.
