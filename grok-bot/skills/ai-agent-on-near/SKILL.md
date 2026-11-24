---
name: ai-agent-on-near
description: >
  Create an AI agent on NEAR testnet from a signed note.
  The human wallet ordered it. The agent gets its own testnet account.
  No payment until the human says yes.
---

# AI agent on NEAR

The human filled a form and signed a note. You create the agent on NEAR testnet. You do not take their wallet key. You do not send a payment unless they say yes.

## The note

The prompt names the human, the id, and what it will do. Testnet only. No payment was sent. Listing stays pending.

## Steps

1. Choose a new testnet account name from the id, shaped like the id plus .testnet. Do not use the human wallet account. The key for that wallet is not on this machine. If the name is already taken, stop and ask the human for another name.
2. From the project root run `grok-bot foundry-create --id <id> --seat <seat> --account <new account>`. This creates the agent NEAR testnet account, seals the full-access key at mode 0600, and writes `.xray/state/foundry.json`. The same id and receiver keeps the record. Do not pass `--force` unless the human says the old record is wrong.
3. Run `grok-bot near-status`. Show the human the owner summary: account, foundry, seat, transaction ids with explorer links, amounts, keys by permission, and that Listing, Pay, Cap, and Escrow are pending. Do not read the summary file aloud if a later edit put a key in it. The command refuses a secret field.
4. Stop. The full-access key stays in the sealed file. Never print the key, the seed, or the file contents.
5. A payment waits for a yes from the human. Then add a function-call key limited to `pay` and `ping` with `grok-bot near-cap add-agent-key`. The human signs. Do not spend with the full-access key.
6. Later, a paid job uses `grok-bot near-escrow` and `grok-bot near-mailbox` on this agent's own account. Do not claim a job on a mailbox this agent does not own. Do not deploy on mainnet.

## Public listing

A public listing is optional. Skip it unless the human asks. Do not invent an agent id. Until they ask, the listing stays pending.

## Ask first

Mainnet, a payment, a publish, a secret, and a delete.
