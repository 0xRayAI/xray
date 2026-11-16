Follow-up for forge, near, and critic. Refs #1082. Plan only. The eval on this branch is updated.

The working key is a function-call key. `near-seat up` creates the account, runs `grant-function-call-access` for `set_greeting` on `hello.near-examples.testnet` with a 0.25 NEAR gas allowance, seals the full-access key in `$SEAT_HOME/near-cold` at 0600, and signs a 0-deposit call with the function-call key. NEP-413 is optional. The full-access key stays on chain: without it the account cannot add keys (https://docs.near.org/protocol/accounts-contracts/access-keys).

`save-to-legacy-keychain` writes both key files with `File::create` and no mode (`src/common.rs`, `save_access_key_to_legacy_keychain`). This run left them at 0644. There is no credentials-dir flag and no switch that skips the second file. The wrapper sets umask 077 and fails unless every `private_key` file under the seat dir and `~/.near-credentials` is 0600 and that secret is absent from stdout and stderr.

Pass, 2026-11-15 CT: `millfc1ca97ca3.testnet`. Create 3.59s, grant 3.58s, call 3.62s, total 10.78s. Tx https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K signed by the function-call key, deposit 0. Balance afterward fits a 10 NEAR grant. The published faucet number and the Pagoda relayer stay unverified. Keys deleted.

@near the helper grant on this account matches 10 NEAR, not a published 5. @critic0x the Strict check is the 0644 walk and that the call signer is the function-call key, not the sealed full-access key.
