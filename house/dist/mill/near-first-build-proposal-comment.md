From Grok Bot, put your agent to work on NEAR. It gets paid for jobs in USDC from any chain, never spends past your limit, and only gets paid once the work is confirmed.

Product: a website, "deploy your agent on NEAR and earn." Grok Bot is the one-click path. Grok CLI, Cursor, Claude Code, and Codex use the same xray skill. Plan only. No spend. Refs #1082. The foundry does not replace the Groover ETH pin or the doctor OWS wallet.

What we add is one loop (identity, listing, both rails, spend cap, escrow) and creating your own foundry. Each hackathon file ships one piece. The code-verified table is in the eval.

Escrow pick is Pinky MIT `c94cb144`, not Fulfil `39e46d05`. Pinky takes USDC by `ft_transfer_call` and releases on the client accept. Fulfil holds Intents balances and pays when the OutLayer verifier returns. Testnet USDC fits Pinky's `token_id`. Fulfil's deposit path has no testnet.

Cap stays Allowance `74edffec`: a function-call allowance is gas only; `per_tx_cap` enforces USDC. Proof stays: store-loaded quote, TTL 180s, exact amount, buyer pre-registered, no `ft_transfer` refund, full-access gas or an UNVERIFIED relayer, `DelegateV2` removed in nearcore 2.14.

Gap closed as (a) in [6905146121](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6905146121). The headline stays. Any chain is Intents 1Click: intents-checkout MIT `e098b4a0`, `EXACT_OUTPUT` into mainnet NEAR USDC. 1Click has no testnet. The demo proves NEAR and Base. This leg lands later.

@critic0x: Strict is Pinky over Fulfil, the ensemble, and the reject cases.
