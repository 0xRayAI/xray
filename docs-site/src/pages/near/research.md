---
title: NEAR research notes
description: Gotchas from a NEAR testnet build, and a cited read of 21 hackathon repos. No code copied. Checked 2026-11-18.
---

# NEAR research notes

This is the long note behind the [NEAR reference](/near/reference). The reference is the list of current docs. This page is the research: four gotchas, and what a read of 21 public hackathon repos was worth against core NEAR.

Checked 18 Nov 2026. The file in the [0xRay repo](https://github.com/0xRayAI/xray) is `docs-site/src/pages/near/research.md`.

Nothing here is a secret. No keys, no tokens, no wallet files, and no private account ids. No code from the hackathon repos is copied. Cite the commit if you read further. Then go back to the official docs before you build.

## Gotchas

### Escrow on its own account

A job escrow has to be its own NEAR account. The worker's account is the payee. It is not the escrow.

Circle USDC `ft_transfer` refuses a transfer whose sender and receiver are the same account. The panic is `Sender and receiver should be different`. If you deploy the escrow contract onto the account that should receive the payout, accept can look done while the token receipt fails and the payout never leaves.

Deploy the contract to a separate account. Register that account, and the payer, and the payee, for storage on the USDC contract before the first transfer. An unregistered account fails with `The account … is not registered`. On the testnet USDC contract below, `storage_balance_bounds` is 0.00125 NEAR for both min and max (1,250,000,000,000,000,000,000 yoctoNEAR).

There is no official general-purpose escrow in the docs. Lockup contracts are time locks. They are not this.

### Key files from near-cli-rs

[near-cli-rs issue 713](https://github.com/near/near-cli-rs/issues/713) is open. The CLI writes a key file with Rust `File::create`. That opens the file at mode `0666`, then the process umask removes bits. A usual umask of `022` leaves the key at `0644`. Other users on the machine can read it.

`save-to-keychain` stores the key in the OS keyring instead of a file. `save-to-legacy-keychain` writes `~/.near-credentials/<network>/<account>.json` and hits this bug. Check the mode either way. Fix: run the command with umask `077`, or `chmod 0600` the file after. Do not print the key. Do not commit it.

The CLI install line and the faucet command are on the [CLI page](https://docs.near.org/tools/cli). Published package on 18 Nov 2026: `near-cli-rs` 0.31.1.

### Circle testnet USDC

Two faucets. They are not the same thing.

1. Testnet NEAR. The [token faucet](https://docs.near.org/getting-started/faucet) sends a small amount of testnet NEAR. The CLI command `sponsor-by-faucet-service` does that too. Neither one sends USDC.
2. Testnet USDC. The same faucet page sends you to the [Circle faucet](https://faucet.circle.com/). Open it in a browser, pass the captcha, and request USDC on NEAR testnet. The docs say 20 USDC per address every 2 hours. A GET of that URL is an HTML page, not a transfer. There is no script API. A captcha in the browser is the route that works.

The testnet contract, confirmed with a read-only `ft_metadata` on 18 Nov 2026:

`3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`

Symbol `USDC`, 6 decimals, spec `ft-1.0.0`. Amounts are integer strings. `1000000` is 1 USDC. `10000` is 0.01 USDC. Compare the strings. Do not treat a larger transfer as "enough" unless that is the rule you meant.

The [fungible-token faucet](https://near-faucet.io/) is the other link on the NEAR faucet page. Use Circle when you need this USDC contract.

### RPC verify

Use the endpoint in the [provider table](https://docs.near.org/api/rpc/providers). The NEAR testnet row is:

`https://archival-rpc.testnet.near.org`

`https://rpc.testnet.near.org` still answered `ft_metadata` on 18 Nov 2026. It is not that table row. POST JSON. A browser GET returns 405.

After you create an account, it can take a few seconds to show up. Query `view_account`, wait, and try again. Stop after a handful of tries.

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "query",
  "params": {
    "request_type": "view_account",
    "finality": "final",
    "account_id": "the-account.testnet"
  }
}
```

To verify a payment, use [`tx_status`](https://docs.near.org/api-reference/post-tx_status). [`EXPERIMENTAL_tx_status`](https://docs.near.org/api-reference/post-experimental_tx_status) is the old name. Do not use it.

```json
{
  "jsonrpc": "2.0",
  "id": "dontcare",
  "method": "tx_status",
  "params": {
    "tx_hash": "THE_TX_HASH",
    "sender_account_id": "the-signer.testnet",
    "wait_until": "FINAL"
  }
}
```

Accept the payment only when all of these are true:

- `final_execution_status` is `FINAL`.
- The execution status is success. Final alone is not success.
- A receipt executed by the USDC contract shows `ft_transfer`.
- The receiver is the account you required.
- The amount string equals the amount you required.
- If you bound a quote id, the memo on the args and on the NEP-141 event equals that id.

`ft_transfer` does not refund a transfer that already succeeded. A failed receipt moves nothing. Register storage first ([NEP-145](https://github.com/near/NEPs/blob/master/neps/nep-0145.md)).

A function-call key's allowance is gas, not tokens ([access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)). It cannot attach the 1 yoctoNEAR that `ft_transfer` needs ([one yoctoNEAR](https://docs.near.org/smart-contracts/security/one_yocto)). [nearcore 2.14.0](https://github.com/near/nearcore/releases/tag/2.14.0) removed `DelegateV2`. The same notes say gas keys can no longer sign meta transactions. The signer of a [NEP-366](https://docs.near.org/protocol/transactions/meta-tx) delegate has to be a normal full-access key. The current node release is [2.14.1](https://github.com/near/nearcore/releases/tag/2.14.1).

## Hackathon repos

On 15 Nov 2026 we shallow-read 21 public repos from a NEAR hackathon shortlist. For each one we read the README, the license, and one core file. We did not run their tests, deploy them, or copy their source.

The commit below is the one that was current that day. Each link still resolved on 18 Nov 2026. "Leg up" means the file shows a shape the core NEAR docs do not already hand you. If the docs already cover it, the repo is only a reference.

An earlier list pointed Caesura at `johnservil/sigil`. That is a different project. The repo below is the right one.

### What we kept

Four lessons. No source.

- **Escrow.** [Pinky](https://github.com/Basssoman/pinky/commit/c94cb144abcc755dfabd7fab96bf0f418c79fcd4) holds NEP-141 until the buyer accepts. Core NEAR has no such contract. We did not take the contract or the mainnet deployment. We kept the rule that the escrow account is not the payee, and that release waits for the buyer. [Fulfil](https://github.com/cuongdcdev/fullfil/commit/39e46d050148fb0c284b3b6c403cb04145633b32) holds Intents balances instead, and [Intents has no testnet](https://docs.near-intents.org/resources/faqs), so it is not this path.
- **Spend cap.** A function-call key does not cap USDC. [Allowance](https://github.com/soldanoandrea/allowance/commit/74edffec98cbeffd88d31223802f088c2d0f10b8) puts the cap in a vault the owner funds. We did not take the contract or its memo format. [Veto](https://github.com/Bronxydrone/Veto/commit/3b8125888f5b082eb60de870be1df5291d61583f) is the same idea as a deny-reason firewall. We did not take it either.
- **Receipt check.** [Mihenk](https://github.com/MihenkAI/near-pay-per-call/commit/1da0b45c4f9ad29cdf654e773a2c9e878bcc2d3d) reads the transaction after an `ft_transfer`. We kept that shape. We did not take its default token (`usdc.fakes.testnet`), its "a larger amount is enough" check, or a 24 hour nonce. Our check is an equal amount string. The [x402 NEAR scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md) is the spec. The small `x402-near` sample pays `wrap.testnet` and has no memo. We did not take it.
- **1Click quote.** [intents-checkout](https://github.com/Guglielmo15/intents-checkout/commit/e098b4a0494a7dcf808e49b417f2a5da0d671e2f) asks `https://1click.chaindefuser.com` for `EXACT_OUTPUT` and can dry-run a quote. We kept that request shape against the [official API](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request). We did not take the WordPress plugin. There is still no testnet.

### Caesura

[mitchuski/caesura@397ab32b2ce5d30cd5e9df67ee30184163f57df1](https://github.com/mitchuski/caesura/commit/397ab32b2ce5d30cd5e9df67ee30184163f57df1). Apache-2.0. A NOTICE file is in the repo. Core file `contract/src/lib.rs`.

Two accounts share one gate. One proposes. The other has to agree before the call runs. Keys are function-call keys, one method each. Testnet only.

Leg up: yes, as a pattern. Core NEAR gives you [access keys](https://docs.near.org/protocol/accounts-contracts/access-keys), not this two-step gate. We took nothing. If you reuse the code, keep the NOTICE.

### Veto

[Bronxydrone/Veto@3b8125888f5b082eb60de870be1df5291d61583f](https://github.com/Bronxydrone/Veto/commit/3b8125888f5b082eb60de870be1df5291d61583f). MIT. Core file `contract/src/lib.rs`.

A vault with per-transaction and daily limits. The agent is supposed to call `spend` only.

Leg up: yes, as a pattern. There is no official USDC spend vault. We took nothing.

### Allowance

[soldanoandrea/allowance@74edffec98cbeffd88d31223802f088c2d0f10b8](https://github.com/soldanoandrea/allowance/commit/74edffec98cbeffd88d31223802f088c2d0f10b8). MIT. Core files `src/lib.rs` and `src/policy.rs`.

Same job as Veto, aimed at payments. The owner funds the vault. A function-call key may call `pay`. The contract rejects an amount over `per_tx_cap`. The key still cannot move USDC by itself, because `ft_transfer` needs 1 yoctoNEAR.

Leg up: yes, as a pattern. We took the lesson only. We did not take the contract.

### Abalone

[amiller/abalone@849324b10450844eb78ad22d4145cb1b253a37e0](https://github.com/amiller/abalone/commit/849324b10450844eb78ad22d4145cb1b253a37e0). MIT. A third-party notices file is in the repo. Core file `agents/pi/abalone.ts`.

Checks a NEAR attestation before a prompt goes out. The official path is already [the attestation report](https://docs.near.ai/api-reference/attestation/get-attestation-report).

Leg up: no. Use the docs. We took nothing. If you reuse the code, keep the notices file.

### Anyfare

[baking-bad/anyfare@bfccb213f547f31e51642f14233e931fd7bacdb0](https://github.com/baking-bad/anyfare/commit/bfccb213f547f31e51642f14233e931fd7bacdb0). MIT. Core file `packages/payments/src/x402/facilitator.ts`.

An x402 facilitator for USDC on NEAR mainnet, plus 1Click top-ups in another package. The README describes real mainnet payments.

Leg up: no for a testnet build. The [x402 scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_near.md) is the spec. We took nothing.

### x402-near

[alhassanmohammederc3643-cmyk/x402-near@a16e87c37d77509fa7f8c0a7192c2b0cad636ea2](https://github.com/alhassanmohammederc3643-cmyk/x402-near/commit/a16e87c37d77509fa7f8c0a7192c2b0cad636ea2). MIT. Core file `facilitator.mjs`.

A small testnet facilitator. It checks one NEP-366 delegate for an exact `ft_transfer`, then relays it. The asset in that file is `wrap.testnet`, not USDC. There is no memo, so a quote id is not bound to the payment.

Leg up: no. A readable sample of the spec, not a base. We took nothing.

### Mihenk pay-per-call

[MihenkAI/near-pay-per-call@1da0b45c4f9ad29cdf654e773a2c9e878bcc2d3d](https://github.com/MihenkAI/near-pay-per-call/commit/1da0b45c4f9ad29cdf654e773a2c9e878bcc2d3d). MIT. Core file `server.mjs`.

The API answers 402. The caller sends `ft_transfer` with a memo. The server reads the transaction and then serves the result. No relayer.

Leg up: yes, for that read-back. We took the lesson only. See "What we kept" above.

### Pinky

[Basssoman/pinky@c94cb144abcc755dfabd7fab96bf0f418c79fcd4](https://github.com/Basssoman/pinky/commit/c94cb144abcc755dfabd7fab96bf0f418c79fcd4). MIT. Core file `contract/src/lib.rs`.

Freelance escrow. The buyer funds a deal. Release waits for a signed accept. A relayer can submit the signed call and cannot change the destination. The contract account on mainnet is not a template to send testnet USDC to.

Leg up: yes, as a pattern for "hold NEP-141 until the buyer accepts." We took the lesson only. We did not take the contract. A bad deposit message in that contract can stick funds. Do not copy that.

### Fulfil

[cuongdcdev/fullfil@39e46d050148fb0c284b3b6c403cb04145633b32](https://github.com/cuongdcdev/fullfil/commit/39e46d050148fb0c284b3b6c403cb04145633b32). MIT. The repo name is spelled `fullfil`. Core file `contracts/escrow/src/lib.rs`.

Escrow held as Intents balances. Release depends on an OutLayer worker, not on the buyer pressing accept. A testnet USDC `ft_transfer` cannot fund it.

Leg up: no for a testnet USDC demo. [Intents has no testnet](https://docs.near-intents.org/resources/faqs). We took nothing.

### Foreman

[bemlerlabs/foreman@082fff9bfebe5396f633b4211e2d43ea2b33849f](https://github.com/bemlerlabs/foreman/commit/082fff9bfebe5396f633b4211e2d43ea2b33849f). Apache-2.0. No NOTICE file. Core file `contracts/foreman/src/lib.rs`.

Job escrow that locks native NEAR and pays with a NEAR transfer. Testnet only.

Leg up: no for USDC. We took nothing.

### boreal.work

[raldblox/boreal-task-desk@b2922e187741c4703bb585a67be9bac60ea647a9](https://github.com/raldblox/boreal-task-desk/commit/b2922e187741c4703bb585a67be9bac60ea647a9). MIT. Core file `packages/near/src/payments.ts`.

TypeScript transfers of NEP-141 into an escrow account, with a memo. There is no Rust contract for that escrow in the repo.

Leg up: no. An account transfer is already [NEP-141](https://github.com/near/NEPs/blob/master/neps/nep-0141.md). We took nothing.

### nearswaps agents

[nearswaps/nearswaps-agents@d57f9e841e87fd028e156031b0f76872c28eed7e](https://github.com/nearswaps/nearswaps-agents/commit/d57f9e841e87fd028e156031b0f76872c28eed7e). MIT. Core file `packages/agent/src/keys.ts`.

Refuses a full-access key. It only loads a function-call key for three methods on one mainnet contract.

Leg up: no. Scoped keys are the [access key docs](https://docs.near.org/protocol/accounts-contracts/access-keys). The contract id is hard-coded to that product. We took nothing.

### NOVA copy-trading

[jcarbonnell/nova-copy-trading@d8e1955c07ec472a823632a99a149db1e75c6176](https://github.com/jcarbonnell/nova-copy-trading/commit/d8e1955c07ec472a823632a99a149db1e75c6176). MIT. Core file `src/core/verify-payment.ts`.

Checks that a mainnet Intents payment reached the seller. The README says there is no on-chain escrow yet.

Leg up: no for testnet. [No Intents testnet](https://docs.near-intents.org/resources/faqs). We took nothing.

### Hasp

[thesithunyein/hasp@b76d463e66b2dd54606ede54fd4a37fecd339eca](https://github.com/thesithunyein/hasp/commit/b76d463e66b2dd54606ede54fd4a37fecd339eca). MIT. Core file `public/checkout.js`.

A browser widget. It asks 1Click for an exact-output quote and shows a one-time deposit address. It is not an on-chain spend limit.

Leg up: no. The [1Click quickstart](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request) is the source. We took nothing.

### HyperNear

[0xMaxyz/HyperNear@bfb958de33ea0ad00b84fa64597d1d1804f7c7f5](https://github.com/0xMaxyz/HyperNear/commit/bfb958de33ea0ad00b84fa64597d1d1804f7c7f5). MIT. Core file `contract/src/lib.rs`.

Holds keys for Hyperliquid through NEAR chain signatures, and caps what the agent key may do. "Intent" in this repo is an EIP-712 message, not NEAR Intents. Mainnet is not deployed.

Leg up: no for a Base signer. [Chain signatures](https://docs.near.org/chain-abstraction/chain-signatures) are the source. The signed payload here is Hyperliquid, not Base. We took nothing.

### Intents Checkout

[Guglielmo15/intents-checkout@e098b4a0494a7dcf808e49b417f2a5da0d671e2f](https://github.com/Guglielmo15/intents-checkout/commit/e098b4a0494a7dcf808e49b417f2a5da0d671e2f). MIT. Core files under `plugin/src/`.

A store plugin. It posts `EXACT_OUTPUT` to 1Click so the merchant receives a set amount of USDC on NEAR. The sandbox client says there is no testnet, and a dry quote does not move funds.

Leg up: yes, for the dry-quote shape. We took that lesson only. We did not take the plugin.

### Twinnear

[0xward/Twinnear@181c19676fdad33628b5bb9a5ab77f410d3f9257](https://github.com/0xward/Twinnear/commit/181c19676fdad33628b5bb9a5ab77f410d3f9257). MIT. Core file `contract/src/lib.rs`.

Invoice escrow on testnet, with a relayer for gasless submit. A 1Click payment is recorded. The contract does not verify that the funds arrived.

Leg up: no. The Intents path is a note, not a check. We took nothing.

### BitLens

[NaDasai/bitlens@4db3c332f94dcee3a55b8fbb33bd7bfd08f6a66e](https://github.com/NaDasai/bitlens/commit/4db3c332f94dcee3a55b8fbb33bd7bfd08f6a66e). MIT. Core file `mcp/server.ts`.

A tool that runs before you sign. It returns allow, confirm, or block. It does not sign or send. Attacks run in a local simulator.

Leg up: yes, as an idea. There is no official pre-sign API. We took nothing.

### Keyturn

[GuTS805/keyturn@40676c3cb198450cd4e40cdfb179c20720b7e18b](https://github.com/GuTS805/keyturn/commit/40676c3cb198450cd4e40cdfb179c20720b7e18b). MIT. Core file `contract/src/lib.rs`.

Two of N maintainers approve an artifact hash. OutLayer then publishes it. "Escrow" in this file is a fee for that worker, not a job payment. Testnet only.

Leg up: no for payments. [OutLayer](https://docs.near.org/primitives/off-chain-compute/outlayer) is the source for the worker call. We took nothing.

### ProvenExit

[erhantrk/provenexit@b5fccf5eaf0c92260f06efc4aa153998478e8af0](https://github.com/erhantrk/provenexit/commit/b5fccf5eaf0c92260f06efc4aa153998478e8af0). MIT. Core file `contracts/near/src/lib.rs`.

An on-chain registry that checks Intel TDX quotes for a VPN exit. Testnet only. It does not call OutLayer.

Leg up: no for this payment path. It is a registry pattern, not a USDC flow. We took nothing.

### NEAR Books

[IhorMuliar/nearbooks@39f8c94a5d99fc4893a14e3b16283fb162e4455a](https://github.com/IhorMuliar/nearbooks/commit/39f8c94a5d99fc4893a14e3b16283fb162e4455a). MIT. Core file `contract/src/lib.rs`.

Asks OutLayer for a daily snapshot and stores the result. The contract does not check the TDX quote. Quote checks happen off chain. "Intents" in the file are metrics, not NEAR Intents.

Leg up: no. Weaker on-chain checks than ProvenExit, and not a payment primitive. We took nothing.
