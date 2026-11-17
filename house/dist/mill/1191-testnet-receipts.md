# xray#1191 testnet receipt

Network: NEAR testnet. No mainnet call. No keys in this file.

The mailbox contract is `grok-bot/near/mailbox`. `post` locks testnet USDC in the Clearing escrow (`ft_transfer_call` to that escrow account) and then calls `post_job` on the mailbox. `accept` and `release` ask the escrow to pay the creator, then send that USDC to `clearing-treasury-0xray.testnet`. `refund` asks the escrow to pay the buyer back. The read-only page is `web4_get` at `https://<mailbox>.testnet.page`.

## Walk

The live walk did not send a transaction.

The testnet faucet returned HTTP 429 when this machine asked it to create `m1191box7k.testnet` and `m1191box8k.testnet`. Neither account exists. This machine has no key for an existing funded testnet account, including `clearing-treasury-0xray.testnet`, `n1178fwt7enk.testnet`, `n1178ewt7enk.testnet`, and `n1178pwt7enk.testnet`. Those accounts are on chain. Without a key, the mailbox cannot be deployed, a deal cannot be funded with testnet USDC, and the treasury cannot be paid.

| Step | Account | Tx |
| --- | --- | --- |
| create parent | m1191box7k.testnet | not sent (faucet 429) |
| create parent retry | m1191box8k.testnet | not sent (faucet 429) |
| deploy mailbox sub-account |  | blocked |
| post job |  | blocked |
| claim |  | blocked |
| submit |  | blocked |
| accept and pay clearing-treasury-0xray.testnet |  | blocked |

No explorer link, because no transaction hash was returned.
