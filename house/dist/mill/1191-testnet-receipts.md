# xray#1191 testnet receipt

Network: NEAR testnet. No mainnet call. No keys in this file.

Parent `m1191k3n7.testnet` was created by the helper faucet `https://helper.nearprotocol.com/account` on the first try of this retry. The mailbox contract is the sub-account `box.m1191k3n7.testnet`. The Clearing escrow is `esc.m1191k3n7.testnet`. The buyer is `buy.m1191k3n7.testnet`. The foundry signer is `fnd.m1191k3n7.testnet`.

Testnet USDC came the same way as the #1178 receipts: `e1144bmwjld5rl.testnet` sent `2000000` base units (6 decimals) to the buyer. The job price is `1000000`. Posting locks that price in the escrow. Accept withdraws it to the foundry account, then `ft_transfer` pays `clearing-treasury-0xray.testnet`. That treasury balance moved from `20000` to `1020000`.

Explorer links use `https://explorer.testnet.near.org/transactions/<hash>`.

| Step | Account | Tx |
| --- | --- | --- |
| create parent | m1191k3n7.testnet | [BUShLbG6rEAwL1rLz39jvycWwjgMJcijJ5iYiyCnTgEz](https://explorer.testnet.near.org/transactions/BUShLbG6rEAwL1rLz39jvycWwjgMJcijJ5iYiyCnTgEz) |
| create mailbox sub-account | box.m1191k3n7.testnet | [9XnMJjyYtgXTEgKcwTVkT9Vr4LWLLuJC8mLRhryubfhF](https://explorer.testnet.near.org/transactions/9XnMJjyYtgXTEgKcwTVkT9Vr4LWLLuJC8mLRhryubfhF) |
| create escrow sub-account | esc.m1191k3n7.testnet | [F7cH9yAYLyiiZ13oirAXZXGN7cQVwjAWW8j4DJGN2Sca](https://explorer.testnet.near.org/transactions/F7cH9yAYLyiiZ13oirAXZXGN7cQVwjAWW8j4DJGN2Sca) |
| create buyer sub-account | buy.m1191k3n7.testnet | [8EDgf8AFeQ49mDepeG515dTiwY6Aupktk9ymm295Cqgr](https://explorer.testnet.near.org/transactions/8EDgf8AFeQ49mDepeG515dTiwY6Aupktk9ymm295Cqgr) |
| create foundry sub-account | fnd.m1191k3n7.testnet | [AGmzyWe1oPdzgJ8Aw3iFj38BmXKnpvsFWH4yYC6Ud7kq](https://explorer.testnet.near.org/transactions/AGmzyWe1oPdzgJ8Aw3iFj38BmXKnpvsFWH4yYC6Ud7kq) |
| deploy mailbox | box.m1191k3n7.testnet | [EdY4XCveXoWieUw4jfptQAZHV9xVTQ2GT7bmpuuDjWLq](https://explorer.testnet.near.org/transactions/EdY4XCveXoWieUw4jfptQAZHV9xVTQ2GT7bmpuuDjWLq) |
| deploy escrow | esc.m1191k3n7.testnet | [3cWth5MqVsLeS8QV5gB7LrHFfuZ1sUTHPNjWTKs4LLS9](https://explorer.testnet.near.org/transactions/3cWth5MqVsLeS8QV5gB7LrHFfuZ1sUTHPNjWTKs4LLS9) |
| init mailbox | box.m1191k3n7.testnet | [7zwxPi4ZirFWSMf9VGsZrcbm2E4mSwA7JkKDHrB46d2L](https://explorer.testnet.near.org/transactions/7zwxPi4ZirFWSMf9VGsZrcbm2E4mSwA7JkKDHrB46d2L) |
| init escrow | esc.m1191k3n7.testnet | [6Js7JoNk5RaxzxKf1oHq5j4FRvVhyVRXMD5AJi9k3dFA](https://explorer.testnet.near.org/transactions/6Js7JoNk5RaxzxKf1oHq5j4FRvVhyVRXMD5AJi9k3dFA) |
| register buyer on USDC | buy.m1191k3n7.testnet | [4zH7H22EnVoBhxgMw4xrcxnkUgtoCxA7adfZEz3PpYJm](https://explorer.testnet.near.org/transactions/4zH7H22EnVoBhxgMw4xrcxnkUgtoCxA7adfZEz3PpYJm) |
| register foundry on USDC | fnd.m1191k3n7.testnet | [E3ThFX5vyKGmKUkyt2dHFVHTkjkY26aB3imMTD6hiM4F](https://explorer.testnet.near.org/transactions/E3ThFX5vyKGmKUkyt2dHFVHTkjkY26aB3imMTD6hiM4F) |
| register escrow on USDC | esc.m1191k3n7.testnet | [AdYzH5jqc1L5LT1nKeRRHCgciktDxDZvw2zPvRXsztAP](https://explorer.testnet.near.org/transactions/AdYzH5jqc1L5LT1nKeRRHCgciktDxDZvw2zPvRXsztAP) |
| send testnet USDC to buyer | e1144bmwjld5rl.testnet | [96qRkybwY8NvSEHJJtTMHhw7jJn6pBv2cTZPEMuZCyrB](https://explorer.testnet.near.org/transactions/96qRkybwY8NvSEHJJtTMHhw7jJn6pBv2cTZPEMuZCyrB) |
| open escrow deal 1 | esc.m1191k3n7.testnet | [DLmujYZRiGdxP3gtwfyeFgxfJ9jFvViK2Cqj7zMvu1R3](https://explorer.testnet.near.org/transactions/DLmujYZRiGdxP3gtwfyeFgxfJ9jFvViK2Cqj7zMvu1R3) |
| post: lock 1000000 USDC in escrow | buy.m1191k3n7.testnet | [Gz3pKamTy3KEwWRgFRcoJrqEtis8LLswqgAjtbSogkQP](https://explorer.testnet.near.org/transactions/Gz3pKamTy3KEwWRgFRcoJrqEtis8LLswqgAjtbSogkQP) |
| post: write the job | box.m1191k3n7.testnet | [GAE44RTVR5CLWxjq4hhBxWrV7W5R42hcQnNMx4wJDpuZ](https://explorer.testnet.near.org/transactions/GAE44RTVR5CLWxjq4hhBxWrV7W5R42hcQnNMx4wJDpuZ) |
| claim | box.m1191k3n7.testnet | [BkgpieiBLTafgd58WiTHXEQSanHxJM2hUH2Fk34MPRQW](https://explorer.testnet.near.org/transactions/BkgpieiBLTafgd58WiTHXEQSanHxJM2hUH2Fk34MPRQW) |
| submit | box.m1191k3n7.testnet | [A9GcnGUuhezZ2GGrSNZDGXEVmfCVzeRXg2sEJRZTeq9M](https://explorer.testnet.near.org/transactions/A9GcnGUuhezZ2GGrSNZDGXEVmfCVzeRXg2sEJRZTeq9M) |
| deliver to escrow | esc.m1191k3n7.testnet | [BFwvQPa4exJEJSbYRKNhpSQz6EUhYiBB8XMdWrfVmjdE](https://explorer.testnet.near.org/transactions/BFwvQPa4exJEJSbYRKNhpSQz6EUhYiBB8XMdWrfVmjdE) |
| accept the job | box.m1191k3n7.testnet | [BG2Nbg1zMrXnMU9hFB8j88YobmVPqa7TVWgYPsyY3Mqq](https://explorer.testnet.near.org/transactions/BG2Nbg1zMrXnMU9hFB8j88YobmVPqa7TVWgYPsyY3Mqq) |
| accept the escrow deal | esc.m1191k3n7.testnet | [EpqkijFnsNiz6VRSLrCwLRXaQkvY5wTi1rqkYwNNhDXY](https://explorer.testnet.near.org/transactions/EpqkijFnsNiz6VRSLrCwLRXaQkvY5wTi1rqkYwNNhDXY) |
| withdraw USDC to the foundry | esc.m1191k3n7.testnet | [5rRAWCDRToizT9AcqySummqXWKyfgz2Ge8sWsr1snNFK](https://explorer.testnet.near.org/transactions/5rRAWCDRToizT9AcqySummqXWKyfgz2Ge8sWsr1snNFK) |
| pay clearing-treasury-0xray.testnet | fnd.m1191k3n7.testnet | [3fG3nE6b28NChPM6BjFTzjErPdDtNm635nXpHQoaEDMx](https://explorer.testnet.near.org/transactions/3fG3nE6b28NChPM6BjFTzjErPdDtNm635nXpHQoaEDMx) |

The read-only page is `https://box.m1191k3n7.testnet.page`.
