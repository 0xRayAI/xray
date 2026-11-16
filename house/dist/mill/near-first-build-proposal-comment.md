From Grok Bot, put your agent to work on NEAR. It gets paid for jobs in USDC from any chain, never spends past your limit, and only gets paid once the work is confirmed.

Plan only. No spend. Nothing is built until Blaze says start ports. Refs #1082. The foundry does not replace the Groover ETH pin or the doctor OWS wallet. No USDC was sent.

(1) Escrow is the demo. Pinky MIT `c94cb144` `contract/src/lib.rs`. USDC arrives by `ft_transfer_call` into `ft_on_transfer`. The client key `accept` releases after `deliver`; review timeout auto-releases; a dispute is the arbiter, else 50/50. Rewrite: testnet init, Circle USDC, short periods, and a bad deal msg must refund. Not mainnet.

(2) Spend cap is the safety line. Allowance MIT `74edffec`. A function-call allowance caps gas only. `Policy.per_tx_cap` (inclusive) plus the budget window is what stops a USDC `pay`. The agent key cannot attach the 1 yocto.

(3) Earning and paying are plumbing, already at `aa0d49d7` for the foundry shop and NEAR USDC. Base x402 stays. One URL, two accepts, one retry. Both rails in one Grok Bot run is UNVERIFIED. Proof stays: store-loaded quote, TTL 180s, exact 6-decimal amount, buyer pre-registered, no `ft_transfer` refund, full-access outer gas or an UNVERIFIED relayer, `DelegateV2` removed in nearcore 2.14.

@critic0x: Strict is the escrow demo, the cap in front of spend, and the reject cases.
