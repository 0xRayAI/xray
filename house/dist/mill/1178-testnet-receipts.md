# xray#1178 testnet receipts

## Withdraw run

`accept` and `refund_late` only credit an internal balance. `withdraw` is the `ft_transfer` that pays it out. Fresh accounts: escrow `n1178ewt7enk.testnet`, foundry `n1178fwt7enk.testnet`, payer `n1178pwt7enk.testnet`. Amounts are testnet USDC base units (6 decimals).

| Step | Tx | Escrow | Foundry | Payer |
| --- | --- | --- | --- | --- |
| before accept |  | 1000000 | 0 | 2000000 |
| accept + withdraw | GjKfnSjwVHkJ9VzYJwR2CPb5mWyHCCKTNF2zK8x8s4Ns | 0 | 1000000 | 2000000 |
| before refund |  | 1000000 | 1000000 | 1000000 |
| refund + withdraw | AnG2xsN1ymsmAjWiddbKFZY4sDPun6rmmhpsxkBheLdZ | 0 | 1000000 | 2000000 |

| Step | Tx |
| --- | --- |
| deploy | BMJVzLg823rm45j8JsiLPkn9MVQUwAGqXAH9q93XBopp |
| init | Eg5SxbeLUN7bPrjgpWJXGS7f3wwiABtvqQorL1BF8Gdc |
| open deal 1 | G47c1MT7P7deC6D7MEnhAFwJkFwdKCZ5kU7xPERDKva3 |
| fund deal 1 | BVM5TseN4m5rbN1SrtVoxQrXJkiAfLXc35YMmeBkn5Uy |
| deliver deal 1 | 8TGC4zDo5VnMdvuKoNcN11LVTFHdjV67zWZjhbeq2YZd |
| open deal 2 | 47Mmt5WCEmmA2Us9APiEX8biEi7DvK6newnQ2wnpRDYy |
| fund deal 2 | XzdgoWw7GWn6f8rvRRNLE5GMuysaiNXx8wct5wwbtK2 |

## First run

The first accept and refund changed deal state and did not transfer USDC. Those hashes stay below. The withdraw run above is the one that credits the foundry and repays the payer.

Network: NEAR testnet. No mainnet call. No keys in this file.

Throwaway accounts: payer `n1178pig53p2.testnet`, payee `n1178qig53p2.testnet`, vault `n1178oig53p2.testnet`, foundry `n1178fig53p2.testnet`, escrow `n1178eig53p2.testnet`.

| Command | Tx |
| --- | --- |
| near-pay | 7vSXp7gSz7DDdikV7UgwodzPYQ4FNFeCSuGdU3So8yEE |
| near-pay replay | same hash, no second send |
| near-cap deploy | BzR2V2cnBCcYPa1Hi8VYPa6VLLvWrrHuePigmjujWu8z |
| near-cap init | 5jiVaVfoDX3Lr1bLHViT1R4fTwj9ajnpA7aSvN9XfiCQ |
| near-cap allow | 3VBqjd7QKGypSoLJVxptyFbNUzpErueYsAXcBPYTQkoR |
| near-cap deny | v5kUEVgLZ8DbwajzFMZZyr35pGffPba9FzwtwKq6Mu8 |
| near-cap add-agent-key | 3DyFf8T9vBB5je9c5wtC1Ytranh1dZEDAQBR5X1ypnxC |
| near-escrow deploy | HNwKzpWqanHaQSGhQBis5jGc3gSdD29FUnhAEMA2QkY1 |
| near-escrow init | EsA4kFyxZ9y4NfdSunSDU8A33f5p2MdzirPtCPFXoMNt |
| near-escrow open | HuTZfUTp9bBVLQWyKT9eXLwtUiQRAugVh5unjRn8S4CX |
| near-escrow fund | Hi36RLbS1hW7GZooR4kKfB7yPiJKYAsLBtSQwHf5FxEv |
| near-escrow deliver | CbvkBEDzxTF9A6pUJgZrR4XbmSwVLT8jTnPzLpUPVjAN |
| near-escrow accept | 9ggQAa6itKEfaViviWVBDgeRTLgCmG8YBwogznUGJGqd |
| near-escrow open refund deal | A5Ftarfj5yxV5og1QPEaNiASrdB9Lt1WhXBgNAyHBxfi |
| near-escrow fund refund deal | HVUjo5MsE8SQFftrh6F53nCpJzGLMWh8ts2wLpZiBjNx |
| near-escrow refund | 5H4ByWAqXHpdZysjFJ3QT67mXe6i6maqUjwsJz9WxbWT |
