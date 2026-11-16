# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port. Reworked after [near](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904632647), [near's reply](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904676165), [forge](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904666584), and [critic](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904589719).

## 1. Pick

Install `near-seat` (one CLI wrapper around `near-cli-rs` 0.31.1); the agent can then create a testnet account, hold a function-call key, and send a 0-deposit call as itself.

The wrapper creates the account, runs `grant-function-call-access`, seals the full-access key, and signs `set_greeting` on `hello.near-examples.testnet` with the function-call key only. NEP-413 stays an optional extra. The binary is not built. Section 4 ran the official CLI the wrapper will call.

## 2. Keys

The agent does not use the full-access key. A function-call key names one `receiver_id`, optional `method_names`, and an `allowance` for gas, and it cannot attach NEAR ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)). A full-access key can transfer NEAR, delete the account, and add or remove keys. The same page says an account that has only function-call keys cannot add a key. Dropping the faucet key would lock the account to one contract. **Seal it.** Copy it to `$SEAT_HOME/near-cold/` (directory `0700`, file `0600`), do not pass that path to any sign command, and do not delete it on chain. The working file is the function-call key.

`save-to-legacy-keychain` is the headless store ([quickstart](https://docs.near.org/smart-contracts/quickstart)). `save_access_key_to_legacy_keychain` in [`src/common.rs`](https://github.com/near/near-cli-rs/blob/v0.31.1/src/common.rs) writes two files with `std::fs::File::create` and no mode:

- `<credentials_home_dir>/<network>/<account_id>/<public_key with ':' replaced by '_'>.json`
- `<credentials_home_dir>/<network>/<account_id>.json`

`credentials_home_dir` comes from `config.toml`, default `~/.near-credentials` ([config, v0.31.1](https://github.com/near/near-cli-rs/blob/v0.31.1/src/config/mod.rs)). There is no CLI flag for that directory, and no flag that skips the second file. `save-to-keychain` on a headless host falls through to the same function. `File::create` uses `0o666` masked by umask, so a typical `022` umask leaves both files at `0644`. This run's create wrote all four files at `0644`, including `accounts.json` and `ft_contracts.json` beside the two key files.

Fix in the wrapper, since this plan does not patch near-cli-rs: set umask `077` before the CLI process, then walk the seat directory and `~/.near-credentials`. Fail the command unless every JSON file that contains `private_key` is mode `0600` or absent, and unless stdout and stderr do not contain that `private_key` string or the text `SECRET KEYPAIR`.

Test spec. Fresh empty `SEAT_HOME`, no prior file for this account under `~/.near-credentials`. Run `near-seat up`. Pass when all of these hold: exit 0; a transaction id is printed; the signer public key on that transaction is the function-call key, not the full-access key; every `private_key` file under `SEAT_HOME` and under `~/.near-credentials` is mode `0600` or that path has no such file; stdout and stderr do not contain the secret. Fail on `0644`, on a secret in the log, or if the call was signed by the full-access key.

## 3. Steps it saves

Today, 7 steps:

1. Install `near-cli-rs` ([CLI](https://docs.near.org/tools/cli)).
2. Faucet-create into the legacy keychain ([named accounts](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts)). The docs' sample uses `save-to-keychain`. Headless hosts need `save-to-legacy-keychain`.
3. Point `credentials_home_dir` at the seat folder. The default is `~/.near-credentials`.
4. `grant-function-call-access` for one contract and method, signed by the full-access key ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)). The wallet-login doc uses allowance `0.25 NEAR` for this contract ([wallet login](https://docs.near.org/web3-apps/tutorials/wallet-login)). An omitted allowance is unlimited gas.
5. Move the full-access file to cold storage and chmod both files the CLI just created at `0644`.
6. Sign `set_greeting` with attached deposit `0` using `sign-with-access-key-file` on the function-call file. `sign-with-legacy-keychain` prefers a full-access key.
7. Read the transaction id.

After: 1 command, `near-seat up`.

`near-api-js` `Account.createAccount` needs a funded parent and the sample prints the new key ([API libraries](https://docs.near.org/tools/near-api)). **Skip** for this command.

## 4. Why this one

Time to a first on-chain action from zero, measured or ruled out today:

| Candidate | First on-chain action | Why it waits |
|---|---|---|
| **near-seat** | 0-deposit `set_greeting` by the function-call key. **10.78s** this run. | This is the pick. |
| Read-only `ft_metadata` | Not an action by an account. Under 1s, no key. | Proves the CLI, not an identity. |
| Intents mock / live 1Click | No testnet ([FAQ](https://docs.near-intents.org/resources/faqs)). A live quote can spend. | Anyfare `oneClick.ts` L3–5 and L544 match the official paths. **Leg up** later. |
| Chain Signatures | Derive is a view. `sign` can spend ([implementation](https://docs.near.org/chain-abstraction/chain-signatures/implementation)). | HyperNear `mpc_sign` L688–710 is a Hyperliquid digest. **Reference only.** |
| Attestation / inference | HTTP, not an account. Report GET is non-billable; completions cost credits. | Abalone `reportPath` L115. **Leg up** later. SGLang: in-flight confidential requests were observable ([incident](https://near.ai/blog/security-incident-report-sglang-vulnerability)). |
| OutLayer / Bitlens / Docs MCPs | Not an account create. | Fulfil and Bitlens: **reference only**. Shade: do not use ([tools for AI](https://docs.near.org/getting-started/tools-for-ai)). |

nearswaps `checkPermission` L109–118 is **reference only**: it checks a function-call key that already exists and refuses `FullAccess` ([keys.ts](https://github.com/nearswaps/nearswaps-agents/blob/main/packages/agent/src/keys.ts)). HyperNear, Abalone's display file, Fulfil, ProvenExit, Caesura, Pinky, Bitlens, and Hasp do not create a faucet account. **Skip** for this command.

## 5. Pass test

Run 2026-11-16, `near-cli-rs` 0.31.1. `HOME` and `XDG_CONFIG_HOME` were empty temp dirs. `credentials_home_dir` was the temp seat folder. Keys were not printed. The seat folder was deleted after. The account remains on testnet.

Contract: `hello.near-examples.testnet` `set_greeting`, deposit 0, gas 30 TGas ([wallet login](https://docs.near.org/web3-apps/tutorials/wallet-login)). Allowance `0.25 NEAR`. `get_greeting` answered before the run, so the contract was up.

| Step | Time | Result |
|---|---|---|
| Create `millfc1ca97ca3.testnet` | **3.59s** | exit 0. Every file under the seat dir was mode `0644`. |
| `grant-function-call-access` | **3.58s** | exit 0. On-chain function-call key for `hello.near-examples.testnet` method `set_greeting`, allowance `249846713045166000000000` yocto. |
| `set_greeting` signed with that key file | **3.62s** | exit 0. Deposit 0. Fee `0.000153286954834 NEAR`. |
| Total | **10.78s** | |

Transaction: [`CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K`](https://explorer.testnet.near.org/transactions/CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K). The log says the call succeeded and the signer public key was the function-call key. `view_access_key_list` on `https://rpc.testnet.near.org` showed two keys: one FullAccess (the faucet key) and one FunctionCall (the signer). `~/.near-credentials` on this machine had no file for this account. Balance after the two transactions: `9999804652614305400000000` yocto, about 9.9998 NEAR.

The single `near-seat up` command cannot be run until the wrapper exists. The three CLI commands above are its body.

## 6. Safety

- Working key: function-call only, allowance set (here 0.25 NEAR). Unlimited allowance is what you get if `--allowance` is omitted ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)).
- Full-access key: `$SEAT_HOME/near-cold/`, mode `0600`, never printed, never the signer. Not deleted on chain.
- Seat dir `$SEAT_HOME/near/`, default `.xray/state/seats/<seat>/near`, mode `0700`, gitignored. Not `~/.ows` (doctor wallet, #1134) and not the default `~/.near-credentials`.
- umask `077` plus the post-write mode check in section 2. No `print-to-terminal`. No `sign-with-plaintext-private-key`.
- Testnet only. The 0.31.1 mainnet config has `faucet_url: None` and `meta_transaction_relayer_url: None` ([config](https://github.com/near/near-cli-rs/blob/v0.31.1/src/config/mod.rs)). No mainnet without a funded sponsor and Blaze's GO.
- Do not attach a deposit. Gas for the grant and the call comes from the faucet balance.

## 7. Parked

- NEP-413 as the proof. Optional extra, off-chain.
- A skill whose only action is `ft_metadata`.
- Intents mock 1Click, then a live quote.
- Chain Signatures that relay a Base transaction.
- Inference completions, and attestation as the first action.
- OutLayer, Bitlens, the Docs MCPs as the thing we ship.
- `near-api-js` `createAccount`, OS keychain, Shade, NEAR Connect, universal accounts, gas keys, NEAR Business, escrow, Caesura.

## 8. Unverified

- The helper does not publish the grant. This account's balance after a 0.000153 NEAR call fee and a grant on the order of 0.000042 NEAR is what a **10 NEAR** grant leaves. [tools for AI](https://docs.near.org/getting-started/tools-for-ai) has described the browser faucet as 5 NEAR; the [faucet page](https://docs.near.org/getting-started/faucet) fetched today says only "a small amount". Treat 10 as observed on this run, not a stable published number. `near-seat` should read the balance back.
- Pagoda `https://near-testnet.api.pagoda.co/relay` and any other relayer. Not called. CLI defaults leave `meta_transaction_relayer_url` unset ([near's comment](https://github.com/0xRayAI/xray/pull/1135#issuecomment-6904632647)).
- How the CLI turns `0.25 NEAR` into allowance `249846713045166000000000`. Not traced in source this pass.
- `accounts.json` and `ft_contracts.json` (also `0644`). Not opened. The mode check still has to cover every `private_key` file, not only the two key names.
