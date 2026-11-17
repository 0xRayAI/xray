# xray#1191 testnet receipt

Network: NEAR testnet. No mainnet call. No keys in this file.

Parent `m1191k3n7.testnet` came from `https://helper.nearprotocol.com/account`. The escrow is `escn.m1191k3n7.testnet`. Its creator is `fnd.m1191k3n7.testnet`, so a funded deal is not the mailbox paying itself. Testnet USDC still comes from `e1144bmwjld5rl.testnet`, the same sender as the #1178 receipts.

`boxn.m1191k3n7.testnet` was created with payee `clearing-treasury-0xray.testnet`. `boxd.m1191k3n7.testnet` was created with no payee, so the claimer is paid. Each post is one `ft_transfer_call` of `1000000` USDC to the mailbox. The mailbox opens the escrow and locks that USDC. Accept calls the escrow, the creator withdraws, and the USDC is paid to the payee or the claimer. `retry_settle` records the withdraw step and then the transfer step.

Explorer links use `https://explorer.testnet.near.org/transactions/<hash>`.

## Balances read from chain

| Account | Before | After | Delta |
| --- | --- | --- | --- |
| clearing-treasury-0xray.testnet | 1020000 | 2020000 | +1000000 |
| fnd.m1191k3n7.testnet (claimer) | 0 | 1000000 | +1000000 |

## Named payee

| Step | Tx |
| --- | --- |
| create escrow | [49Lw81XCSZ48b625RNDtfeQxgJe36tjVR5qbFaG4Pue8](https://explorer.testnet.near.org/transactions/49Lw81XCSZ48b625RNDtfeQxgJe36tjVR5qbFaG4Pue8) |
| create mailbox | [9ZN3S15Wqars2g8efzEHtBeiyN52qX9KhqvHeftwanaq](https://explorer.testnet.near.org/transactions/9ZN3S15Wqars2g8efzEHtBeiyN52qX9KhqvHeftwanaq) |
| deploy escrow | [5T3HqsSSHk3JRxnZ6hD4HXy3pb3MxsESTkUnwk97itmX](https://explorer.testnet.near.org/transactions/5T3HqsSSHk3JRxnZ6hD4HXy3pb3MxsESTkUnwk97itmX) |
| init escrow | [7DQ6YWVJ11obhppCiDQRzvCku5tCrVnJZFzGtKsJmQSW](https://explorer.testnet.near.org/transactions/7DQ6YWVJ11obhppCiDQRzvCku5tCrVnJZFzGtKsJmQSW) |
| deploy mailbox | [8hMEiygNb6MjWWUqMEfwb2MKWwh13Gpyaxv6z3jNRacy](https://explorer.testnet.near.org/transactions/8hMEiygNb6MjWWUqMEfwb2MKWwh13Gpyaxv6z3jNRacy) |
| init mailbox with treasury payee | [5kpc9gTb14v4y3TD2zH8mUayTeXPZ3X23D9Eo9krCB7y](https://explorer.testnet.near.org/transactions/5kpc9gTb14v4y3TD2zH8mUayTeXPZ3X23D9Eo9krCB7y) |
| post and fund deal 1 | [9aeXis2yscB7uTef1QZYCKft18GNH1CJHUMa3uy4E4bk](https://explorer.testnet.near.org/transactions/9aeXis2yscB7uTef1QZYCKft18GNH1CJHUMa3uy4E4bk) |
| claim | [5Dkx4QGnKvsPSm3ZNAn2D8y9yCBCgczhVRVEc1h6at44](https://explorer.testnet.near.org/transactions/5Dkx4QGnKvsPSm3ZNAn2D8y9yCBCgczhVRVEc1h6at44) |
| submit | [B9Vzm9PkEMnaLNnMDuXFgMN7h79eqUGgjMFZ31K6JEpU](https://explorer.testnet.near.org/transactions/B9Vzm9PkEMnaLNnMDuXFgMN7h79eqUGgjMFZ31K6JEpU) |
| deliver | [EAfaVRorhApCH74WtcyCjigxyALFKp4bsckNUN9xSrwu](https://explorer.testnet.near.org/transactions/EAfaVRorhApCH74WtcyCjigxyALFKp4bsckNUN9xSrwu) |
| accept | [HGJrdeAJNoXW1LG68rLuNkB7vJjgMk6uKRuGaWqYKmGZ](https://explorer.testnet.near.org/transactions/HGJrdeAJNoXW1LG68rLuNkB7vJjgMk6uKRuGaWqYKmGZ) |
| withdraw | [9zsN3JwYEuSak8ewAusS4BB6B9kJ3thR4ezrhzBoHpKF](https://explorer.testnet.near.org/transactions/9zsN3JwYEuSak8ewAusS4BB6B9kJ3thR4ezrhzBoHpKF) |
| pay treasury | [4vc3oWerRrsWTsaHY1cTN8RngY3VoYjRasHWAtYhegQZ](https://explorer.testnet.near.org/transactions/4vc3oWerRrsWTsaHY1cTN8RngY3VoYjRasHWAtYhegQZ) |
| retry settle, withdraw step | [DFq69fTHPtw9YnohGFZmPGLcaejPWxTtcooEqMTVqVH8](https://explorer.testnet.near.org/transactions/DFq69fTHPtw9YnohGFZmPGLcaejPWxTtcooEqMTVqVH8) |
| retry settle, transfer step | [31KeyqzZQX1GLokJT6fnKuWtLvKvhuwnNnrdb9j3uzDN](https://explorer.testnet.near.org/transactions/31KeyqzZQX1GLokJT6fnKuWtLvKvhuwnNnrdb9j3uzDN) |

## No payee, claimer is paid

| Step | Tx |
| --- | --- |
| create mailbox | [DANdfgozMhwmPPmdNFRMDpfUfFkR2oneuyfcPQCeFbyR](https://explorer.testnet.near.org/transactions/DANdfgozMhwmPPmdNFRMDpfUfFkR2oneuyfcPQCeFbyR) |
| deploy mailbox | [AjM6h7tRxLtSDBz13ExPzK3GAp7mZSmos5Q9UmN33akJ](https://explorer.testnet.near.org/transactions/AjM6h7tRxLtSDBz13ExPzK3GAp7mZSmos5Q9UmN33akJ) |
| init mailbox with no payee | [HdDq5TpQk675KHiznVwEcHiTtzYzSV6dQs8dehJqk7hT](https://explorer.testnet.near.org/transactions/HdDq5TpQk675KHiznVwEcHiTtzYzSV6dQs8dehJqk7hT) |
| post and fund deal 2 | [8CkMfLD8nRjeh7VbbtVWWvq82JT2v58nyWGRLvdjCQWe](https://explorer.testnet.near.org/transactions/8CkMfLD8nRjeh7VbbtVWWvq82JT2v58nyWGRLvdjCQWe) |
| claim | [CMLLcCDvS534TdZcgpCAPueCV4xmqkC27gaMkJQUuoyn](https://explorer.testnet.near.org/transactions/CMLLcCDvS534TdZcgpCAPueCV4xmqkC27gaMkJQUuoyn) |
| submit | [C22TDGxzg4WcCG4FfLrCeGc44hemFreT49DSeA7RARLn](https://explorer.testnet.near.org/transactions/C22TDGxzg4WcCG4FfLrCeGc44hemFreT49DSeA7RARLn) |
| deliver | [4AGT4cFJNL2rgtmrXeBu5QjXC3YsqP6kVrAxjyE9oxwN](https://explorer.testnet.near.org/transactions/4AGT4cFJNL2rgtmrXeBu5QjXC3YsqP6kVrAxjyE9oxwN) |
| accept | [9ZcHkexDbj4P3FxtSi5fZeE96uwdY1TbRTXCfpjc5VgT](https://explorer.testnet.near.org/transactions/9ZcHkexDbj4P3FxtSi5fZeE96uwdY1TbRTXCfpjc5VgT) |
| withdraw to the claimer | [5MZ8vE15nfvtkBhXnXMup6mJ1vBnzd6R43acCNFaoW79](https://explorer.testnet.near.org/transactions/5MZ8vE15nfvtkBhXnXMup6mJ1vBnzd6R43acCNFaoW79) |
| retry settle, withdraw step | [EDbXBF1xUagGRPjk4K827PcsCeGiTRPCrhXmYdMtzKDD](https://explorer.testnet.near.org/transactions/EDbXBF1xUagGRPjk4K827PcsCeGiTRPCrhXmYdMtzKDD) |
| retry settle, transfer step | [Ar46TTjrk2HnAM2GUdsZ7naEVS372PQhqq8i9zxa91tN](https://explorer.testnet.near.org/transactions/Ar46TTjrk2HnAM2GUdsZ7naEVS372PQhqq8i9zxa91tN) |
