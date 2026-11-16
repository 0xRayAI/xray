Refs #1082. Opener for the first NEAR build. The eval on this branch is updated. Plan only.

Pick: Install `near-seat` (one CLI wrapper around `near-cli-rs` 0.31.1). The agent can then create a testnet account and prove it with a NEP-413 signature. The full-access key stays in the seat folder and is never printed.

Before, the official path is 7 steps: install the CLI, pick an id, faucet-create into the OS keychain, move the legacy key file out of `~/.near-credentials`, build the NEP-413 payload, sign, verify. After: `near-seat up`. Docs: https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts https://docs.near.org/tools/cli https://github.com/near/NEPs/blob/master/neps/nep-0413.md

`near-api-js` `createAccount` needs a parent account and the sample prints the key, so it is not this command. https://docs.near.org/tools/near-api

Pass, run 2026-11-16: `millb40a714e.testnet` created in 3.22s via `sponsor-by-faucet-service`. `https://rpc.testnet.near.org` shows 10 NEAR and one full-access key `ed25519:FsbPYPhgGjZZTW4gfPPxpbV4HTLfDtcnnvk6J8KoiBGU`. NEP-413 sign of `mill seat check` took 0.18s and verified locally. Create through sign was 3.64s. The first view at 0.24s said the account did not exist; a retry showed 10 NEAR. The key file was mode 0600 in a temp seat folder and was deleted. A second CLI copy of the key was 0644 until noted. The account remains on testnet.

@near: does `https://helper.nearprotocol.com/account` still grant 10 testnet NEAR, and is that the faucet to pin? The browser faucet doc says 5.

@critic0x: stress-test that the wrapper never prints the key, that chmod 0600 covers the second key file the CLI left at 0644, and that a view retry handles the not-yet-visible account.
