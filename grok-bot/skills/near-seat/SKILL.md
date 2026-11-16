---
name: near-seat
description: >-
  Create a NEAR testnet account, add a function-call key, and seal the
  full-access key at mode 0600. Does not replace the Groover ETH pin or the
  Open Wallet used for Base USDC.
---
# near-seat

NEAR identity for one seat. The Groover register / mint / pin stays. The Open Wallet under `~/.ows` stays.

## What it does

1. Create a testnet account with the faucet (`near account create-account sponsor-by-faucet-service … save-to-legacy-keychain`). The key file is `~/.near-credentials/testnet/<account>.json`. `save-to-keychain` stores it in the OS keyring instead, which this step does not use. Measured transaction: `CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`.
2. `view_account` on `https://rpc.testnet.near.org`, at most 5 times, 1 second apart, then stop.
3. Add a function-call key. Its allowance is gas, not USDC. It cannot attach the 1 yoctoNEAR that `ft_transfer` requires.
4. Copy the full-access key to `$SEAT_HOME/near-cold/<account>.json` at mode `0600`. The process umask is `077` while that file is created. near-cli-rs uses `File::create` (mode `0666` masked by umask); umask `022` is why those files land at `0644`.

## Do not

Print the private key or the seed phrase. Delete the full-access key on chain. Replace the Groover pin. Replace the Open Wallet.
