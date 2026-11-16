# NEAR first-build eval

Refs xray#1082

Seat: mill. Date: 2026-11-16 (UTC). Plan only. No kit code, no port.

## 1. Pick

Install `near-seat` (one CLI wrapper around `near-cli-rs` 0.31.1); the agent can then create a testnet account and prove it with a NEP-413 signature, with the full-access key only in the seat folder.

The wrapper runs the official faucet create, forces the key file into the seat folder at mode `0600`, then signs and checks one off-chain message. It does not print the key, does not open mainnet, and does not send tokens. The binary is not built yet. The pass test below ran the official CLI the wrapper will call.

## 2. Steps it saves

Today, core docs, 7 steps:

1. Install `near-cli-rs` ([CLI](https://docs.near.org/tools/cli), [tools for AI](https://docs.near.org/getting-started/tools-for-ai)).
2. Choose an account id.
3. Create it with the faucet: `near account create-account sponsor-by-faucet-service $ACCOUNT_ID autogenerate-new-keypair save-to-keychain network-config testnet create` ([named accounts](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts)). That save target is the OS keychain ([CLI guide](https://github.com/near/near-cli-rs/blob/main/docs/GUIDE.en.md)).
4. To get a file instead, use `save-to-legacy-keychain`. The file lands under `credentials_home_dir`, default `~/.near-credentials`, not a seat folder ([config source, v0.31.1](https://github.com/near/near-cli-rs/blob/v0.31.1/src/config/mod.rs)).
5. Build the NEP-413 payload: tag `2^31+413`, Borsh message, 32-byte nonce, recipient, optional callback, then SHA-256 ([NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)).
6. Sign with the full-access key: `near message sign-nep413 utf8 … nonce … recipient … sign-as … sign-with-access-key-file <file>` (same CLI; NEP requires a full-access key and no transaction).
7. Verify the ed25519 signature over that hash.

`near-api-js` v7 `Account.createAccount` is not this path. It needs an already funded parent account, and the official sample prints the new private key ([API libraries](https://docs.near.org/tools/near-api)). The browser faucet needs a browser and is documented as 5 testnet NEAR ([tools for AI](https://docs.near.org/getting-started/tools-for-ai)). The CLI faucet URL in 0.31.1 is `https://helper.nearprotocol.com/account` ([config source](https://github.com/near/near-cli-rs/blob/v0.31.1/src/config/mod.rs)). Mainnet's `faucet_url` in that file is null.

After: 1 command, `near-seat up`. It does steps 3–7 with `network-config testnet`, `save-to-legacy-keychain`, `credentials_home_dir` set to the seat folder, and no `print-to-terminal`.

## 3. Why this one

An agent with no account cannot quote, sign on Base, or call a contract as itself. This command is the identity those need, and the proof does not spend. NEP-413 is off-chain ([NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md)). The key never enters the prompt.

| Other candidate | Why it waits |
|---|---|
| `near-cli-rs` as a skill that only reprints help | The CLI is the engine. A skill that teaches `ft_metadata` does not create an identity. |
| Intents pay kit, mock 1Click | No testnet ([FAQ](https://docs.near-intents.org/resources/faqs)). A live quote can spend. Anyfare on `master` matches `GET /v0/tokens`, `POST /v0/quote`, `GET /v0/status` ([oneClick.ts L3–5, L544](https://github.com/baking-bad/anyfare/blob/master/packages/topups/src/oneClick.ts), [making a request](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request)). **Leg up** later. The plan's `blob/main` URL 404s. |
| Chain Signatures to Base | Five official steps, and relaying can move funds ([implementation](https://docs.near.org/chain-abstraction/chain-signatures/implementation)). HyperNear `mpc_sign` L688–710 signs a Hyperliquid digest ([lib.rs](https://github.com/0xMaxyz/HyperNear/blob/main/contract/src/lib.rs)). **Reference only.** |
| Private inference / attestation | `GET /v1/attestation/report` is non-billable ([report API](https://docs.near.ai/api-reference/attestation/get-attestation-report)). Completions cost credits ([SDK](https://docs.near.ai/cloud/inference-sdk/index)). The SGLang report (2026-11-09) says in-flight confidential requests on one server were observable ([incident](https://near.ai/blog/security-incident-report-sglang-vulnerability)). Abalone `reportPath` L115 matches the path. **Leg up** later, not the first identity. |
| TEE worker | OutLayer is third-party ([near's pass](https://github.com/0xRayAI/xray/issues/1082#issuecomment-6899755628)). Fulfil `request_execution` L192–206 does not create an account. **Reference only.** |
| presign / `check_transaction` | Bitlens L233–241 never signs. No official pre-sign API. **Reference only.** |
| Docs MCPs | Lookup, not an account. Endpoints are on [tools for AI](https://docs.near.org/getting-started/tools-for-ai) plus the gap scan's two other hosts. |
| `near-api-js` createAccount | Needs a parent key and the sample prints the secret ([API libraries](https://docs.near.org/tools/near-api)). **Skip** for this command. |
| OS keychain (`save-to-keychain`) | Not a seat folder an agent can chmod and delete ([CLI guide](https://github.com/near/near-cli-rs/blob/main/docs/GUIDE.en.md)). |
| Shade | Dropped. "Do not use the Shade Agent Framework" ([tools for AI](https://docs.near.org/getting-started/tools-for-ai)). |

Hackathon start files that do not create a faucet account are **skip** for this command: HyperNear, Abalone's display file, Fulfil, ProvenExit, Caesura, Pinky, Bitlens, Hasp. nearswaps `checkPermission` L109–118 is **reference only**: it reads a key file for an existing account and refuses `FullAccess` ([keys.ts](https://github.com/nearswaps/nearswaps-agents/blob/main/packages/agent/src/keys.ts)). A new identity needs that full-access key; NEP-413 requires it.

## 4. Pass test

Run 2026-11-16 with `near-cli-rs` 0.31.1. `XDG_CONFIG_HOME` and `HOME` pointed at an empty temp dir. `credentials_home_dir` was set to `/tmp/near-seat-pass/seat` before create. The key file was not printed. It was deleted after the checks. The account remains on testnet.

Command that created it:

```text
near account create-account sponsor-by-faucet-service millb40a714e.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
```

| Step | Result |
|---|---|
| Create | exit 0 in **3.22s**. `--quiet` printed nothing. |
| View at once | exit 1 in **0.24s**: `account millb40a714e.testnet does not exist while viewing`. |
| Sign | exit 0 in **0.18s**. |
| Create through sign | **3.64s**. |

Retry of `near account view-account-summary millb40a714e.testnet network-config testnet now` (exit 0): balance **10 NEAR**, storage 182 B, no contract, **1 full access key** and 0 function-call keys, block `#277883502`. `view_account` on `https://rpc.testnet.near.org` returned amount `10000000000000000000000000` (10 NEAR). `view_access_key_list` returned one key, `ed25519:FsbPYPhgGjZZTW4gfPPxpbV4HTLfDtcnnvk6J8KoiBGU`, permission FullAccess. That matches the public key in the seat file.

NEP-413 sign of UTF-8 `mill seat check`, recipient `seat.local`, with `sign-with-access-key-file`:

```json
{
  "accountId": "millb40a714e.testnet",
  "publicKey": "ed25519:FsbPYPhgGjZZTW4gfPPxpbV4HTLfDtcnnvk6J8KoiBGU",
  "signature": "ed25519:2y28CArZnKu4CGFDkZUVpVZn6fFS3rBAcM5GQR45FeSNp5ntpNn1Pqp7cJgEg4VTvwscPMMgikYTnyh2GWk2AxAp"
}
```

Local check: SHA-256 of tag `2^31+413` plus Borsh `(message, nonce, recipient, callbackUrl = None)` verifies with that public key (`cryptography` Ed25519). Pass.

The wrapper's single command cannot be run until it is built. The CLI sequence above is the body of that command.

## 5. Safety

- Seat folder: `$SEAT_HOME/near/`, directory mode `0700`. Default `SEAT_HOME` is `.xray/state/seats/<seat>`. It is gitignored. `credentials_home_dir` points here, not at `~/.near-credentials`. The doctor wallet stays on its own path (`OWS_HOME` or the seat project, #1134). Do not put the NEAR key in `~/.ows`.
- Every key file mode `0600` after write. This run left `testnet/<account>.json` at `0600` and `testnet/<account>/ed25519_<public>.json` at `0644`. The wrapper chmods both.
- Never `print-to-terminal`. Never `sign-with-plaintext-private-key`. Logs must not contain `private_key`.
- Network is testnet only. Do not call `send-near` or attach a deposit. The faucet's 10 NEAR stays put. NEP-413 does not spend it.
- Delete the key file when the seat is done. The account on testnet is not deleted by deleting the file.

## 6. Parked

- A getting-started skill whose action is `ft_metadata` on `wrap.testnet`.
- A skill that only reprints `near-cli-rs` help.
- Intents mock 1Click, then a live quote.
- Chain Signatures that relay a Base transaction.
- Private inference completions, and attestation as the first action.
- OutLayer / TEE worker.
- Bitlens `check_transaction`.
- The three Docs MCPs as the thing we ship.
- `near-api-js` `createAccount` from a parent account.
- `save-to-keychain` (OS keychain).
- Shade, NEAR Connect, universal accounts, gas keys, NEAR Business, escrow, Caesura.

## 7. Unverified

- The helper's HTTP body. The chain shows 10 NEAR. The browser-faucet doc says 5. I did not read the helper response.
- The create transaction id. `--quiet` hid it.
- How long until every RPC sees a new account. One view failed; a later view and three RPCs succeeded.
- `save-to-keychain` on macOS. Not run.
- A CLI flag for `credentials_home_dir`. This run edited `config.toml` under a temp `XDG_CONFIG_HOME`.
- Faucet rate limits and which account ids the helper rejects.
- Whether `near-api-js` v7 has a file keystore this page does not show. The page I read takes a key string and prints it.
