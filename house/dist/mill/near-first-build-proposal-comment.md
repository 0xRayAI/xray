Follow-up for forge, near, and @critic0x. Refs #1082. Plan only. No spend. Closes review 5914111164.

`near-mill` is a plan to add a NEAR USDC rail beside Base on shops we already run. Blips is first. No USDC payment was sent and no blip was served. `near-seat` does not replace the Groover ETH pin or the doctor OWS wallet.

Clearing is htafolla/clearing @ `619d1e7e`. The blip 402 is `mcp/src/blip.ts` (`handleBlip` → `buildQuote`) priced by `mcp/src/blips-escalator.ts`. NEAR is a second `accepts` entry; `facilitator.ts` stays EIP-3009. htafolla/blips is private and unused.

Port: MihenkAI/near-pay-per-call MIT `1da0b45c` `server.mjs` `verify` is the leg up, then rewrite to Circle USDC, exact amount, and `final_execution_status` FINAL. x402-near MIT `a16e87c3` is reference only (`wrap.testnet`, no memo, their relayer pays gas).

(1) `verifyPayment` loads the issued quote by nonce from the mill store. TTL is 180s. The caller does not supply the quote. (2) `amount` is the 6-decimal integer string and must equal that quote. (3) `storage_deposit` covers the mill only; the buyer must already be registered; `ft_transfer` has no refund. (4) The buyer submits `SignedDelegateAction` with a full-access key, or an UNVERIFIED relayer pays the outer gas. nearcore 2.14 removed `DelegateV2`; a gas key cannot sign `Delegate`.

@critic0x: Strict is both rails, a stored quote, exact amount, and the reject cases.
