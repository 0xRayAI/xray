---
name: near-seat
description: >-
  Create a NEAR testnet account, add a function-call key, and save the
  full-access key at mode 0600. Does not change the Base wallet.
---
# near-seat

Create one NEAR testnet account. Do not change the Base wallet or `~/.ows`.

## What it does

1. Create a testnet account with the faucet: `near account create-account sponsor-by-faucet-service … save-to-legacy-keychain`. The key file is `~/.near-credentials/testnet/<account>.json`. Do not use `save-to-keychain`. That stores the key in the OS keyring. Measured transaction: `CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`.
2. Call `view_account` on `https://rpc.testnet.near.org`, at most 5 times, 1 second apart, then stop.
3. Add a function-call key. Its allowance pays gas. It is not USDC. It cannot attach the 1 yoctoNEAR that `ft_transfer` requires.
4. Copy the full-access key to `.xray/state/seats/<operator>/near-cold/<account>.json` at mode `0600`. `<operator>` is the `--seat` value passed to `foundry-create`. Set the process umask to `077` while that file is created. near-cli-rs uses `File::create` (mode `0666` masked by umask). Umask `022` is why those files land at `0644`.
5. After the command, every file under `~/.near-credentials` is mode `0600` and every directory there is mode `0700`, including a sibling the CLI wrote beside the account JSON. The command does that. Do not leave a `0644` key as a follow-up. Do not delete those CLI copies unless the owner asks. Do not print a key.

## Do not

Print the private key or the seed phrase. Delete this account's full-access key on chain. Change the Base wallet. Edit `~/.ows`. Deploy on mainnet. This skill creates a testnet account. Official security pages: https://docs.0xray.dev/near/reference.
