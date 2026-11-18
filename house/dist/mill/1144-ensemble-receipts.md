# xray#1144 testnet ensemble receipts

Clearing sha: `9507b22b3631ef44c40c82ab8d160a198169cdd6`. Network: NEAR testnet. No mainnet call.

Base x402 shop pay: skipped. Clearing main has no Base Sepolia shop. Base mainnet was not used.

The NEAR shop pay is a USDC `ft_transfer` under 1 USDC. clearing `near/escrow` has no separate rail contract; amounts below `MIN_AMOUNT` are the direct rail.

| Step | Result | Tx | Explorer |
| --- | --- | --- | --- |
| account buyer | ok |  |  |
|  | e1144bmwjld5rl.testnet |  |  |
| account foundry | ok |  |  |
|  | e1144fmwjld5rl.testnet |  |  |
| account owner | ok |  |  |
|  | e1144cmwjld5rl.testnet |  |  |
| deploy escrow | ok | 6YynPLHACPTnHSaHpQFaPtJMChjJ9DWrD4BzoWrGkD6o | https://testnet.nearblocks.io/txns/6YynPLHACPTnHSaHpQFaPtJMChjJ9DWrD4BzoWrGkD6o |
| init escrow | ok | C98jSrWj6cQ67KG5XRnT7m8xgyBERSSwh5GDzaqxGPry | https://testnet.nearblocks.io/txns/C98jSrWj6cQ67KG5XRnT7m8xgyBERSSwh5GDzaqxGPry |
| deploy cap | ok | G9fZUQSedh4AKUjZzrx7E6vW125PzJz32TZayJ9DZ7nF | https://testnet.nearblocks.io/txns/G9fZUQSedh4AKUjZzrx7E6vW125PzJz32TZayJ9DZ7nF |
| init cap | ok | FB7KwMGYCDbiewx1x6ZDDRytvanGy7dkDguVzcnT3zqw | https://testnet.nearblocks.io/txns/FB7KwMGYCDbiewx1x6ZDDRytvanGy7dkDguVzcnT3zqw |
| storage e1144bmwjld5rl.testnet | ok | FjmjiW7grNWMkW3KMGWXDZfvhpNgUzKD7XAuvgt1xd5L | https://testnet.nearblocks.io/txns/FjmjiW7grNWMkW3KMGWXDZfvhpNgUzKD7XAuvgt1xd5L |
| storage e1144fmwjld5rl.testnet | ok | FPbP5ZLwL9yXbZbdKj3DeAzjKq3Azu3jKRKmVMw35JER | https://testnet.nearblocks.io/txns/FPbP5ZLwL9yXbZbdKj3DeAzjKq3Azu3jKRKmVMw35JER |
| storage e1144fmwjld5rl.testnet | ok | HYZtdoG5w8z26LPe7o1buU7FKj3boGDZXboorZ21rQNF | https://testnet.nearblocks.io/txns/HYZtdoG5w8z26LPe7o1buU7FKj3boGDZXboorZ21rQNF |
| storage e1144cmwjld5rl.testnet | ok | bopxmq6WGxhsQrfLEQde9hJtKn1JCGvUaBUwCq9cnyS | https://testnet.nearblocks.io/txns/bopxmq6WGxhsQrfLEQde9hJtKn1JCGvUaBUwCq9cnyS |
| buyer usdc | ok |  |  |
|  | 0 |  |  |
| escrow | fail |  |  |
|  | buyer has no testnet USDC. Circle faucet.circle.com is captcha-gated (#1148). No USDC was moved. |  |  |
| rail pay | fail |  |  |
|  | skipped. The buyer has no testnet USDC to send through the direct rail. |  |  |
| over-cap pay | ok | Nmg9whfDu15o5ZwDJpGKspRuq1CrrpyRAEYZh8MVPGR | https://testnet.nearblocks.io/txns/Nmg9whfDu15o5ZwDJpGKspRuq1CrrpyRAEYZh8MVPGR |
|  | balance before 0 after 0. Panic: Smart contract panicked: over per_tx_cap |  |  |

Escrow fund, deliver, accept, and withdraw were not sent. The buyer `ft_balance_of` is `0`.

The NEAR shop `ft_transfer` was not sent. The buyer has no testnet USDC.

Circle faucet: `GET https://faucet.circle.com/` in this run returned HTTP 200 and an HTML page, not a transfer. #1148 already found that page is captcha-gated. No funding transaction was produced here.

The second storage row for `e1144fmwjld5rl.testnet` is the same account as the escrow contract. The token refunded it: `The account is already registered`.


## Funded run

Superseded first attempt for deal 1. Escrow was deployed on the foundry account, so the withdraw token receipt failed: Smart contract panicked: Sender and receiver should be different. The shop pay and over-cap rows in this section stand.

Circle faucet funded the buyer with 20 testnet USDC. The faucet page showed no transaction hash.
Same buyer, foundry, and cap owner. Base x402 stays skipped.

| Step | Result | Tx | Explorer |
| --- | --- | --- | --- |
| account buyer | ok |  |  |
|  | e1144bmwjld5rl.testnet |  |  |
| account foundry | ok |  |  |
|  | e1144fmwjld5rl.testnet |  |  |
| account owner | ok |  |  |
|  | e1144cmwjld5rl.testnet |  |  |
| buyer usdc | ok |  |  |
|  | 20000000 |  |  |
| escrow open | ok | Ckwb2cUmuhNDc8mBvsE7CK2wsMpHw17md7T76SzioCR7 | https://testnet.nearblocks.io/txns/Ckwb2cUmuhNDc8mBvsE7CK2wsMpHw17md7T76SzioCR7 |
|  | deal 1 |  |  |
| escrow fund | ok | G6QzTSm7JL9FGqXUghzHPno1MFTZHte9Mqbu1vSh2r4a | https://testnet.nearblocks.io/txns/G6QzTSm7JL9FGqXUghzHPno1MFTZHte9Mqbu1vSh2r4a |
| escrow deliver | ok | F6S618mEqrcbx6RceanoCWpfFDgwZadP2LwvqYv7HNZf | https://testnet.nearblocks.io/txns/F6S618mEqrcbx6RceanoCWpfFDgwZadP2LwvqYv7HNZf |
| escrow accept | ok | GX5xeCCpX6H9Mj2eqBNfU6n9k2PdUAQZowFkbFLisySp | https://testnet.nearblocks.io/txns/GX5xeCCpX6H9Mj2eqBNfU6n9k2PdUAQZowFkbFLisySp |
| escrow withdraw | fail | 7nSCGJAcq8GQc1byZtQsfF3FWrwKVZohD8u2VGUd3QNT | https://testnet.nearblocks.io/txns/7nSCGJAcq8GQc1byZtQsfF3FWrwKVZohD8u2VGUd3QNT |
|  | The outer transaction succeeded and the callback restored the internal balance. An inner receipt failed: Smart contract panicked: Sender and receiver should be different. The escrow contract is the foundry account, so the payout transfer is to itself. Accept already set deal 1 to Released. |  |  |
| rail pay | ok | BBDHrZUnRAjzV7hX7n4aaiZeCDGKdKSRxBnWvrq2d4tB | https://testnet.nearblocks.io/txns/BBDHrZUnRAjzV7hX7n4aaiZeCDGKdKSRxBnWvrq2d4tB |
|  | 10000 to e1144fmwjld5rl.testnet |  |  |
| fund vault | ok | 6GXK9r6PSNmJRPPYLveSUjPgEbN5C8Vpw8rw1MdW5pTy | https://testnet.nearblocks.io/txns/6GXK9r6PSNmJRPPYLveSUjPgEbN5C8Vpw8rw1MdW5pTy |
|  | 2000000 to the cap vault |  |  |
| cap balance before | ok |  |  |
|  | 2000000 |  |  |
| over-cap pay funded | ok | 58jJT8dBPrYiACyfh3NeybrgQCKLYrdSRUxXhxjh9Pkk | https://testnet.nearblocks.io/txns/58jJT8dBPrYiACyfh3NeybrgQCKLYrdSRUxXhxjh9Pkk |
|  | balance before 2000000 after 2000000 |  |  |
|  | {"index":0,"kind":{"index":0,"kind":{"FunctionCallError":{"ExecutionError":"Smart contract panicked: over per_tx_cap"}}}} |  |  |


## Escrow on its own account

Escrow is its own account. Buyer, foundry, shop pay, and the funded over-cap rows above stay.

| Step | Result | Tx | Explorer |
| --- | --- | --- | --- |
| account buyer | ok |  |  |
|  | e1144bmwjld5rl.testnet |  |  |
| account foundry | ok |  |  |
|  | e1144fmwjld5rl.testnet |  |  |
| account owner | ok |  |  |
|  | e1144cmwjld5rl.testnet |  |  |
| account escrow | ok |  |  |
|  | e1144emwjm13df.testnet |  |  |
| deploy escrow | ok | 4qLVBRMWNDq5so6bckutDHS7DjnRAfAYr23jSaPARibq | https://testnet.nearblocks.io/txns/4qLVBRMWNDq5so6bckutDHS7DjnRAfAYr23jSaPARibq |
|  | e1144emwjm13df.testnet |  |  |
| init escrow | ok | AGhp8fDTx9spNGzHCLCkDwPUvfZgLKFH4i35PAXzcAAH | https://testnet.nearblocks.io/txns/AGhp8fDTx9spNGzHCLCkDwPUvfZgLKFH4i35PAXzcAAH |
| storage escrow | ok | BBRqD9H1v36HPCebAwLXruLqXcpwQmoAnTFMVhD8tzVW | https://testnet.nearblocks.io/txns/BBRqD9H1v36HPCebAwLXruLqXcpwQmoAnTFMVhD8tzVW |
| foundry usdc before | ok |  |  |
|  | 1010000 |  |  |
| escrow open | ok | E7u8yRfhU9KemnNfb7XbvNc8DUghR8AmLS2AbhnffN5y | https://testnet.nearblocks.io/txns/E7u8yRfhU9KemnNfb7XbvNc8DUghR8AmLS2AbhnffN5y |
|  | deal 1 |  |  |
| escrow fund | ok | 76i1MavarMGwFV4V52q2jZZgWUQ62Wwuv8VxMSjQ5Hun | https://testnet.nearblocks.io/txns/76i1MavarMGwFV4V52q2jZZgWUQ62Wwuv8VxMSjQ5Hun |
| escrow deliver | ok | 9TXJRj7TCepueBV81XEzKXbMRjHBHKkqhCJ6XCeycpsT | https://testnet.nearblocks.io/txns/9TXJRj7TCepueBV81XEzKXbMRjHBHKkqhCJ6XCeycpsT |
| escrow accept | ok | C1UCjFP2RavDtt2pPmoQTXCTr4L1pm8Kbh7E5Ks4EWg5 | https://testnet.nearblocks.io/txns/C1UCjFP2RavDtt2pPmoQTXCTr4L1pm8Kbh7E5Ks4EWg5 |
| escrow withdraw | ok | EZTDcMwtPHH69R7GYksDhKXHUhC4eACuLKBgGgVCRKdT | https://testnet.nearblocks.io/txns/EZTDcMwtPHH69R7GYksDhKXHUhC4eACuLKBgGgVCRKdT |
|  | token receipt SuccessValue |  |  |
| foundry usdc after | ok |  |  |
|  | 1010000 -> 2010000 delta 1000000 |  |  |

