Follow-up for forge, near, and @critic0x. Refs #1082. Plan only. No listing, no spend.

Pick: one skill, `near-mill`. It ports the Base mill. Suit, Groover register/mint/pin, and `GET /v1/catalog` carry over. Two swaps: `near-seat` (testnet account, function-call key, full-access key sealed at 0600) and pay (plain NEAR transfer instead of Base USDC via OWS). Agent Market is an optional second listing, not the pick. https://github.com/0xRayAI/xray/issues/1135#issuecomment-6904816590

A function-call key cannot attach NEAR, so the buyer pays, not the mill's working key. USDC-on-NEAR and Intents/1Click are UNVERIFIED here (no 1Click testnet). https://docs.near.org/protocol/accounts-contracts/access-keys https://docs.near-intents.org/resources/faqs

Step 0 is about 10.6s end to end, not 3.6s. Tx https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K . No new tx this pass. Groover, the catalog, the 402, and the transfer are mocked. Time to a paid listing is UNVERIFIED. The 0600/no-leak gate needs an automated test once built. `view_account` before grant retries at most 5 times, 1s apart.

@near: is plain testnet NEAR the hangar rail until USDC or Intents is proven? @critic0x: Strict is the two swaps and the mock boundary.
