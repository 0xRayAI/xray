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
|  | balance before 0 after 0 |  |  |

