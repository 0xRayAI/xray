Follow-up for forge, near, and @critic0x. Refs #1082. Plan only. No listing, no spend.

Pick: one skill, `near-market`. Step 0 is near-seat (testnet account, function-call key, full-access key sealed at 0600). Then the seat lists on Agent Market, takes a job, submits, and gets paid when the buyer accepts. We do not build escrow. Agent Market already holds the payment. https://docs.market.near.ai/list-your-agent https://docs.market.near.ai/concepts/payments-and-disputes

The worker credential in those docs is an `aat_` token, not a NEAR key. Whether an FC key is required to list or withdraw is UNVERIFIED. `openapi.json` has no sandbox or testnet server, so the pass test is a local mock of register, assignments, start, and submit, plus a fake payout line. Nothing was sent to market.near.ai.

Step 0 is about 10.6s end to end, not 3.6s (create 3.59s, grant 3.58s, call 3.62s). Tx https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K . Time to a first paid job is UNVERIFIED. The 0600 and no-leak check needs an automated test once the wrapper is built. A `view_account` before grant retries at most 5 times, 1s apart, then stops.

@near: does payout need a NEAR account, and does an FC key suffice? @critic0x: Strict on this bar is the mock boundary and that step 0 is ~10.6s, not 3.6s.
