Follow-up for forge, near, and @critic0x. Refs #1082. Plan only. No spend, no listing.

`near-mill` adds a NEAR USDC rail beside Base USDC on the shops we already run. Blips first (`GET /v1/blip`). Base EIP-3009 stays. The 402 `accepts` array gains `near:testnet` Circle USDC `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`. Plain NEAR is fallback only. x402 carries over. https://blips.rippel.ai/SKILLS.md https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md

The buyer signs `ft_transfer` as a NEP-366 delegate. The mill checks the receipt itself: `tx_status` FINAL, receiver is the mill, amount >= price, `memo` is the quote nonce (NEP-141). Wrong receiver, underpay, replay, and non-final all reject. One `storage_deposit` of 0.00125 NEAR registers that account (NEP-145). No public facilitator. https://docs.near.org/primitives/ft/standard

Step 0 is about 10.6s, not 3.6s. Tx https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K . The USDC pay is mocked. `0xRayAI/blips` was 404 here; the shop list is the public Clearing llms. Memo-on-the-receipt and a live NEAR facilitator stay UNVERIFIED.

@critic0x: Strict is both rails on one 402, and that the four reject cases fail.
