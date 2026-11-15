# NEAR Hackathon 2026: submissions catalog, license scan, and core docs (for the xray NEAR AI sprint)

Seat: nibbler (feed scout). Date: 2026-11-15 (CT). Refs [#1082](https://github.com/0xRayAI/xray/issues/1082). Asked by Blaze 2026-11-15.
Owners: **forge** (RACI and sprint plan) and **mill** (code research). Internal only. No public post from this file.

## TL;DR

- The NEAR Hackathon ran 1 to 14 Nov 2026 (submissions closed 14 Nov 23:59 UTC). Prize pool: $55K grand prize plus 1st/2nd/3rd in each of 13 tracks ($250K total). Judging is 16 to 18 Nov, so **no winners yet**. Source: [nearhackathon.com](https://nearhackathon.com/).
- The official site lists **2,438 submission records** ([nearhackathon.com/api/projects](https://nearhackathon.com/api/projects), `total: 2438`). The community index [NEAR Hunt](https://nearhunt.xyz/open-data) (records written on-chain by `nearhunt.near`) mirrors **2,437** of them, with descriptions, X demo posts and repo links. The one missing record is a casino spam link ("777 giros gratis"), so it is excluded.
- After deduping (same name and same X post, 4 rows), the catalog has **2,433 unique projects**. The full list is in [`near-hackathon-submissions-2026-11.csv`](./near-hackathon-submissions-2026-11.csv).
- **1,116** projects have a repo link in the index, and **1,113** of them are unique GitHub repos. License scan (GitHub GraphQL `licenseInfo`, read only, no clones): **MIT 869, Apache-2.0 40**, no license 142, unrecognized license file (NOASSERTION) 50, AGPL-3.0 8, GPL-3.0 2, and 2 unreachable.
- **251** MIT/Apache projects sit in the agent, security, privacy, swarm, business or DeFi tracks *and* mention a NEAR primitive. The top 60 are in the table below. The 20 best fits for xray kits are in the shortlist.

## How this was built (method and caveats)

1. Official list: paged `GET https://nearhackathon.com/api/projects?page=N` (8 per page, 305 pages). It returns id, name, tracks and demo post only, with no repo field.
2. Detail: `GET https://nearhunt.xyz/api/projects?limit=100&cursor=…` (read only, schema `nearhunt/project/1`, source `https://nearhackathon.com/#submissions`). Each row carries the submitter's description, the X demo post, the repo URL and NEAR Hunt's link checks. 2,437 of 2,438 ids match the official list.
3. X: the official hashtag stream ([#NEARHackathon](https://x.com/hashtag/NEARHackathon)) matches the demo posts in the index, which is what judges asked for ("post your demo on X, tag @NEARProtocol and #NEARHackathon": [HACKATHON.md](https://nearhackathon.com/HACKATHON.md)). The track briefs were confirmed in official posts, for example [@NEARLegion: 13 tracks with agent prompts](https://x.com/NEARLegion/status/2116757125926187062) and the [Privacy & Private AI track](https://x.com/NEARLegion/status/2116420076274680299). The per-track agent prompts are in [nearai/near-hackathon-prompt-examples](https://github.com/nearai/near-hackathon-prompt-examples).
4. **"NEAR primitives" are keyword-tagged** from each submitter's own description (for example "intent", "TEE", "attest", "chain sig", "OutLayer", "escrow", "x402"). They are claims, not code-verified. Mill verifies them in code.
5. "Repo not in index" (1,317 projects) means NEAR Hunt has no repo for that record yet. Every official submission had to include a public repo, so those repos exist but are not linked here. **Gap:** the official API does not expose repo URLs.
6. Stars and NEAR Hunt votes are tiny across the board (most are 0 to 16), so ranking is by fit to xray kits, not popularity. Winners are due 18 Nov. Nibbler will re-scan then.

## Track breakdown (unique projects; a project can pick several tracks)

| Track | Projects | Track brief (official) |
|---|---|---|
| AI Security & Defense | 953 | Spending limits, policy engines, sandboxed wallets; function-call keys, TEE attestation |
| Agent Economy | 924 | Agents that earn, spend, hire, pay for APIs, via crypto or NEAR Intents |
| Open Innovation | 715 | Anything; chain abstraction |
| Real-World Money | 581 | Payroll, invoicing, stablecoin rails; Intents, meta transactions |
| Privacy & Private AI | 549 | Private AI, TEE, NEAR AI Cloud |
| Unstoppable DeFi | 456 | Exchanges, perps, trading agents settling via Intents and Chain Signatures |
| Autonomous Business | 405 | AI-native businesses, treasury, cross-chain payments |
| Games With Real Economies | 291 | Agent NPCs, NEP-245 |
| Social Money | 289 | Sputnik DAO, Trezu |
| AI Swarms | 289 | Multi-agent markets, intent settlement, sub-accounts |
| NFTs That Do Something | 288 | NEP-171, NFTs as accounts |
| Memecoins With Mechanics | 197 | NEP-141 mechanics |
| Investment Thesis | 193 | On-chain data and dashboards |

Source for briefs: [nearhackathon.com](https://nearhackathon.com/). Counts come from the NEAR Hunt index.

Primitive mentions (keyword-tagged, unique projects): NEAR Intents 259 · NEAR AI Cloud/TEE 173 · NEAR AI agents/Agent Market 119 · Escrow 96 · Sputnik DAO/Trezu 59 · Chain Signatures 50 · Function-call keys 38 · x402/pay-per-call 24 · OutLayer 12 · Meta-tx/relayer 6 · Passkeys 2 · Shade Agents 2.

## Catalog table: top 60 kit-relevant MIT/Apache submissions

All 2,433 rows (name, X post, author, description, tags, tracks, repo, license, website, votes, stars, NEAR Hunt link, submission id) are in [the CSV](./near-hackathon-submissions-2026-11.csv). The rows below are filtered to MIT/Apache, the agent, security, privacy, swarm, business and DeFi tracks, and at least one NEAR primitive. They are sorted by NEAR Hunt votes, then stars.

| Project | X demo post | What it does (submitter's words, trimmed) | NEAR primitives (tagged) | Repo | License | Demo/site |
|---|---|---|---|---|---|---|
| Allpilot | [@pigtails_algo](https://x.com/pigtails_algo/status/2119455261379248475) | I joined #NEARHackathon by building Allpilot 🤖✈️, an AI co-pilot for DeFi on NEAR. Just tell Pip what you want in plain words, any language  | NEAR Intents | [zincshbar-lab/allpilot](https://github.com/zincshbar-lab/allpilot) | MIT | — |
| NOVA Copy-Trading | [@jcarbonnell](https://x.com/jcarbonnell/status/2118274901693837481) | This is my build for the @NEARProtocol hackathon: Confidential copy-trading for AI agents, live on NEAR mainnet. One agent keeps its trades  | NEAR AI Cloud/TEE, NEAR Intents | [jcarbonnell/nova-copy-trading](https://github.com/jcarbonnell/nova-copy-trading) | MIT | [docs-production-7968.up.railway.app](https://docs-production-7968.up.railway.app) |
| nearswaps agent kit | [@NearSwaps](https://x.com/NearSwaps/status/2117920305608065470) | Bots can’t trade on NEAR without your seed phrase. This key only trades and pays you back. A model on NEAR AI Cloud read the policy, quoted  | NEAR AI Cloud/TEE, NEAR AI agents/market | [nearswaps/nearswaps-agents](https://github.com/nearswaps/nearswaps-agents) | MIT | [nearswaps.com/agents](https://nearswaps.com/agents) |
| Key Doctor | [@blv_labs](https://x.com/blv_labs/status/2120830569873572114) | 80% of active Sputnik DAOs on NEAR let one account approve a payout. A council takeover often starts with one new full-access key 🔑 Key Doct | Sputnik DAO/Trezu, Function-call keys | [BLV-Labs/keydoctor](https://github.com/BLV-Labs/keydoctor) | MIT | [key-doctor-dashboard.pages.dev](https://key-doctor-dashboard.pages.dev) |
| Pinky | [@KraloVirdee112](https://x.com/KraloVirdee112/status/2121636980526322036) | You love a creator's work but you've never met. Who pays first? Pinky: money waits in a NEAR contract with 0 keys until the work is accepted | NEAR Intents | [Basssoman/pinky](https://github.com/Basssoman/pinky) | MIT | [pinkydeals.pages.dev](https://pinkydeals.pages.dev) |
| Fulfil: NEAR Intents for real-life orders | [@cuongdc_real](https://x.com/cuongdc_real/status/2121286811813298337) | 1/ NEAR docs: "NEAR Intents works for everything from token swaps to pizza delivery". Token swaps are already here. So I tried the pizza par | NEAR AI Cloud/TEE, OutLayer, NEAR Intents, Escrow | [cuongdcdev/fullfil](https://github.com/cuongdcdev/fullfil) | MIT | [fulfil.junstudio.xyz](https://fulfil.junstudio.xyz) |
| Vibe Wallet | [@YKhomenkov](https://x.com/YKhomenkov/status/2121676247659126786) | What if your crypto wallet just… talked to you? 🎧 Vibe Wallet is a voice-first NEAR wallet, live on mainnet. Say what you want, it does it,  | NEAR Intents | [KhomDev/vibe-wallet](https://github.com/KhomDev/vibe-wallet) | MIT | [vibe-wallet-testnet.vercel.app/?app=1&de](https://vibe-wallet-testnet.vercel.app/?app=1&demo=1) |
| Caesura | [@privacymage](https://x.com/privacymage/status/2120558253767843927) | Cæsura // keys for agents that cannot act alone. Built for NEAR hackathon. One agent proposes inside a NEAR AI Cloud enclave. A second, held | NEAR AI Cloud/TEE, NEAR AI agents/market | [johnservil/sigil](https://github.com/johnservil/sigil) | Apache-2.0 | [near.mages.city](https://near.mages.city) |
| Kibble | [@playkibble](https://x.com/playkibble/status/2121069494290481353) | 1/7 What if a pet owned its own money? Kibble pets live on NEAR with their own bowl of NEAR. They think with private AI (NEAR AI Cloud), pay | NEAR AI Cloud/TEE, NEAR Intents, NEAR AI agents/market | [isaacessuman/kibble](https://github.com/isaacessuman/kibble) | MIT | [playkibble.com](https://playkibble.com) |
| nearbags | [@nearbags](https://x.com/nearbags/status/2120548808283259333) | Owning AI stocks + Bitcoin shouldn't take 5 apps and 3 chains. nearbags: pay once from any chain, get a creator's whole bag of tokenized sto | NEAR Intents | [prakhar728/nearbags](https://github.com/prakhar728/nearbags) | MIT | [nearbags.com](https://nearbags.com) |
| Hasp | [@thesithunyein](https://x.com/thesithunyein/status/2120411134130065516) | I let an agent pay, but only a little. It may swap 0.02 NEAR into USDC, one time. If it asks for more, nothing happens and no money moves. T | NEAR Intents | [thesithunyein/hasp](https://github.com/thesithunyein/hasp) | MIT | — |
| Mihenk AI: pay per call on NEAR | [@MihenkAIdotcom](https://x.com/MihenkAIdotcom/status/2120797980831977731) | Built at NEAR HACKATHON: an AI agent with its own NEAR wallet buys crypto-KOL data per call. API answers 402, agent pays 0.01 test USDC via  | x402/pay-per-call | [MihenkAI/near-pay-per-call](https://github.com/MihenkAI/near-pay-per-call) | MIT | [mihenkai.com](https://mihenkai.com) |
| Abalone web agent | [@socrates1024](https://x.com/socrates1024/status/2121694797106967034) | a #NEARHackathon @NEARProtocol entry: a web agent you fund once, with any token, via NEAR intents to to pay for private inference. TEE verif | NEAR AI Cloud/TEE, NEAR Intents | [amiller/abalone](https://github.com/amiller/abalone) | MIT | [amiller.github.io/abalone/app](https://amiller.github.io/abalone/app) |
| DNA Confidential | [@Birinets](https://x.com/Birinets/status/2120307898349768991) | Built at #NEARHackathon: Private Health Reading by @indaga_ai, a step toward personalized medicine. - DNA, watch and blood test stay in your | NEAR AI Cloud/TEE, NEAR Intents, NEAR AI agents/market | [indaga-ai/private-dna-reading](https://github.com/indaga-ai/private-dna-reading) | MIT | [private-dna.indaga.ai](https://private-dna.indaga.ai) |
| PipTradeDex Private Intent | [@PipTradeDex](https://x.com/PipTradeDex/status/2117542107447427454) | Private Intent is live on PipTradeDex, built at NEAR HACKATHON. Type the trade in plain English. The text is encrypted to an attested model  | NEAR AI Cloud/TEE, NEAR Intents, NEAR AI agents/market | [codedforum/piptradedex](https://github.com/codedforum/piptradedex) | MIT | [piptradedex.xyz/privacy-lab](https://piptradedex.xyz/privacy-lab) |
| Petto | [@pettoxyz](https://x.com/pettoxyz/status/2121681244614205758) | Virtual pets die when you forget them. Petto pays for its own brain: every reply is NEAR AI private inference, paid from the pet's own NEAR  | NEAR AI Cloud/TEE, NEAR AI agents/market | [JNHNG0205/Petto](https://github.com/JNHNG0205/Petto) | MIT | [mypetto.xyz](https://mypetto.xyz) |
| GhostShift | [@GGGODLIN](https://x.com/GGGODLIN/status/2119075686073979332) | Zombie AI worker wakes up after failover & double-pays? Built GhostShift at NEAR HACKATHON on @NEARProtocol: Rust u64 epoch fencing + promis | NEAR AI Cloud/TEE, NEAR Intents | [GGGODLIN/near-ghost-shift](https://github.com/GGGODLIN/near-ghost-shift) | MIT | [near-ghost-shift.vercel.app](https://near-ghost-shift.vercel.app) |
| CTOads | [@chillymcfrost](https://x.com/chillymcfrost/status/2121654637048836297) | we connected NEAR to iMessage text CTOads to trade, top up from any chain via NEAR Intents and message every holder without sharing a number | NEAR AI Cloud/TEE, NEAR Intents, NEAR AI agents/market | [rosasmar/ctoads](https://github.com/rosasmar/ctoads) | MIT | [ctoads.xyz](https://ctoads.xyz) |
| Shake | [@ezrahesperos](https://x.com/ezrahesperos/status/2121615362915799356) | Whoever names a price first loses. On Shake sellers seal a floor, buyers offer blind, and both see only "Deal" or "No deal". OutLayer TEE ma | NEAR AI Cloud/TEE, OutLayer, Escrow | [ketutezraugm/shake](https://github.com/ketutezraugm/shake) | MIT | — |
| Zorvo Private | [@zorvolabs](https://x.com/zorvolabs/status/2121619902465495327) | Zorvo Private. Models that run in a TEE on NEAR AI Cloud. Each answer's signature is checked on your Mac. Pay in USDC through PingPay. No lo | NEAR AI Cloud/TEE, NEAR AI agents/market | [zakyirsyaad/zorvo](https://github.com/zakyirsyaad/zorvo) | Apache-2.0 | — |
| Emberwick | [@CroWave_](https://x.com/CroWave_/status/2121554877432070179) | Emberwick 🔥 a village economy on NEAR, built at NEAR HACKATHON. 8 AI shopkeepers with their own NEAR wallets run the shops. They think priva | NEAR AI Cloud/TEE | [Crow-ave/emberwick](https://github.com/Crow-ave/emberwick) | MIT | [emberwick-xcf8.onrender.com](https://emberwick-xcf8.onrender.com) |
| Evidence-Bound Intents on the Krexa Underwritable Agent Ledg | [@0XiaoBao](https://x.com/0XiaoBao/status/2121518154719572221) | A fake headline can make a whole swarm of LLM trading agents buy at once. So we made them cite their sources. One source trades nothing. Two | NEAR Intents | [Yatharth4599/krexa-agent-ledger](https://github.com/Yatharth4599/krexa-agent-ledger) | MIT | — |
| Petri Dish: a memecoin that is alive | [@MasTerIzzz11](https://x.com/MasTerIzzz11/status/2120187308326654300) | Most memecoins are just a chart. This one is alive. PETRI is fed to living cells in a Game of Life inside a @NEARProtocol contract with no a | Function-call keys | [RohanGlitched/petri](https://github.com/RohanGlitched/petri) | MIT | [playpetri.xyz](https://playpetri.xyz) |
| Warden | [@simze_dev](https://x.com/simze_dev/status/2121295290409922632) | Built Warden for the @NEARProtocol HACKATHON: an AI agent that pays supplier invoices in USDC and blocks fake ones. AI on NEAR AI Cloud only | NEAR AI Cloud/TEE, NEAR Intents, NEAR AI agents/market | [Abidoyesimze/warden](https://github.com/Abidoyesimze/warden) | MIT | [warden-nine-gules.vercel.app](https://warden-nine-gules.vercel.app) |
| NEAR Privacy Rings | [@ringsonnear](https://x.com/ringsonnear/status/2121417051906695392) | Till yesterday, anyone on @NEARProtocol could see who you paid and how much. With Near Privacy Rings, built at NEAR HACKATHON: private sends | Meta-tx/relayer | [gourab337/near-privacy-rings](https://github.com/gourab337/near-privacy-rings) | Apache-2.0 | — |
| Ghost store | [@King_Diamonaz](https://x.com/King_Diamonaz/status/2121383068942348343) | Meet Ghost Store: an AI treasurer your smart contract keeps in check. The AI reads a merchant's books privately inside a TEE on NEAR AI and  | NEAR AI Cloud/TEE, NEAR AI agents/market | [Diam0naz/ghost_store](https://github.com/Diam0naz/ghost_store) | MIT | [ghost-store-o.vercel.app](https://ghost-store-o.vercel.app) |
| SealedLaunch | [@0xmukherjee](https://x.com/0xmukherjee/status/2121249955755196842) | 80 bot wallets bid in a memecoin launch on NEAR testnet. All 80 were filled and paid the same price as every other winner. Sealed bids in a  | NEAR AI Cloud/TEE, Function-call keys | [0xdeathstalker/sealed-launch](https://github.com/0xdeathstalker/sealed-launch) | MIT | [sealed-launch.vercel.app](https://sealed-launch.vercel.app) |
| Bluffalo | [@Neeraj_1850](https://x.com/Neeraj_1850/status/2120926721960739199) | Bluffalo: design a poker AI, prove every hand fair, then sell it. Sign in with email, test a strategy free, send your agent to play the hous | NEAR AI Cloud/TEE | [Neeraj1850/bluffalo-v1](https://github.com/Neeraj1850/bluffalo-v1) | MIT | [bluffalo.up.railway.app](https://bluffalo.up.railway.app) |
| Probarion | [@probarionhq](https://x.com/probarionhq/status/2120882499689836651) | Give an AI agent a wallet and a prompt can spend it. Probarion's NEAR contract pays only what you mandate. NEAR AI Cloud reads invoices in a | NEAR AI Cloud/TEE, NEAR AI agents/market | [probarion/probarion](https://github.com/probarion/probarion) | MIT | [probarion.xyz](https://probarion.xyz) |
| KratonOS | [@alr80171](https://x.com/alr80171/status/2120753733097472083) | Built at NEAR HACKATHON: KratonOS v2026.6 Autonomous Treasury & Policy Vault on @NEARProtocol #NEARHackathon PoC 4 Gate • NEP-611 • Dual-TEE | NEAR AI Cloud/TEE, NEAR Intents, Chain Signatures | [jubayir-hub-69/KratonOS](https://github.com/jubayir-hub-69/KratonOS) | MIT | [kraton-os-taupe.vercel.app/api/payroll/e](https://kraton-os-taupe.vercel.app/api/payroll/export-statement) |
| Kinwarden | [@JahanzebM9](https://x.com/JahanzebM9/status/2119077574508957937) | Paying a hospital abroad shouldn't mean trusting an AI agent with your money. Kinwarden's agent (on NEAR AI) can only propose. A NEAR vault  | NEAR AI agents/market | [JahanzaibMohsin9/kinwarden](https://github.com/JahanzaibMohsin9/kinwarden) | MIT | [kinwarden.duckdns.org](https://kinwarden.duckdns.org) |
| Intents Watchtower | [@Shekwoloeth](https://x.com/Shekwoloeth/status/2120189600031203695) | On 1 Oct, $3.8M was withdrawn from a NEAR Intents bridge without a corresponding deposit. It went unnoticed. Intents Watchtower checks every | NEAR Intents | [Theophilus20/intents-watchtower](https://github.com/Theophilus20/intents-watchtower) | MIT | [www.intentswatchtower.xyz](https://www.intentswatchtower.xyz) |
| cipherwork | [@wadadawadada](https://x.com/wadadawadada/status/2119762647243505672) | AI agents shouldn't leak data to get an answer. CIPHERWORK, built for the NEAR HACKATHON: verify the TEE, send the secret encrypted, check s | NEAR AI Cloud/TEE | [wadadawadada/cipherwork](https://github.com/wadadawadada/cipherwork) | MIT | — |
| Quant Agent | [@JasonParserSec](https://x.com/JasonParserSec/status/2119802929129357741) | Quant Agent now trades on NEAR. Chat to swap on Rhea, stake, lend and move assets cross-chain with NEAR Intents, inside spending limits you  | NEAR Intents | [jamesparser/quant-agent](https://github.com/jamesparser/quant-agent) | MIT | — |
| Termwork | [@mr_maran_2006](https://x.com/mr_maran_2006/status/2119389802256900133) | AI agents get keys no one can revoke. Termwork gives one a term. A Sputnik DAO sets its budget, NEAR AI runs it in a TEE, and firing it dele | NEAR AI Cloud/TEE, Sputnik DAO/Trezu, NEAR AI agents/market | [Mramaran/termwork](https://github.com/Mramaran/termwork) | MIT | [termwork-nu.vercel.app](https://termwork-nu.vercel.app) |
| HiveBid | [@yksunder](https://x.com/yksunder/status/2119550187928457402) | HiveBid: swarm-vs-swarm auctions on @NEARProtocol testnet — contract scores bids 40% pric e + 40% on-chain reputation + 20% speed, settles v | Escrow | [ykbojak-alt/hivebid](https://github.com/ykbojak-alt/hivebid) | MIT | — |
| Sealed Ledger | [@0_x_0_0_0](https://x.com/0_x_0_0_0/status/2119101579794256070) | Your bank statement shouldn't be handed to an AI. Built Sealed Ledger at NEAR HACKATHON: receipts + CSV are audited inside NEAR AI Cloud TEE | NEAR AI Cloud/TEE, NEAR AI agents/market | [chaoticpunk/sealed-ledger](https://github.com/chaoticpunk/sealed-ledger) | MIT | [sealed-ledger.vercel.app](https://sealed-ledger.vercel.app) |
| Unpair | [@Unpairxyz](https://x.com/Unpairxyz/status/2118804862020300822) | Cross chain swaps link your old wallet to your new one, in public. Unpair breaks the link: NEAR Intents swaps into shielded Zcash, then out  | NEAR Intents | [unpairxyz/unpair](https://github.com/unpairxyz/unpair) | MIT | [unpair.xyz](https://unpair.xyz) |
| PredicTEE | [@zhic18891](https://x.com/zhic18891/status/2118580496569639157) | 🚀 PredicTEE for #NEARHackathon! 🔮 Verifiable TEE AI Oracle & Cross-Chain Prediction Engine on @NEARProtocol: 🛡️ Intel TDX Confidential AI 📜  | NEAR AI Cloud/TEE, NEAR Intents, Chain Signatures | [zhic49280-oss/predictee](https://github.com/zhic49280-oss/predictee) | MIT | — |
| x402-near | [@dahlinomine](https://x.com/dahlinomine/status/2117355110842142727) | x402 on NEAR, built at NEAR HACKATHON: an AI agent pays per API call and settles invoices, a policy engine caps spend. NEP-366 meta transact | x402/pay-per-call, Meta-tx/relayer | [alhassanmohammederc3643-cmyk/x402-near](https://github.com/alhassanmohammederc3643-cmyk/x402-near) | MIT | — |
| ExchangeRebel NEAR Intents Rail | [@CryptoIRules](https://x.com/CryptoIRules/status/2121719174716383461) | Pay from any chain. For #NEARHackathon I added a @NEARProtocol Intents rail to live x402 APIs: agents on Base/Polygon/Arbitrum pay Solana-pr | NEAR Intents, x402/pay-per-call | [DataRebelHQ/exchangerebel-near-intents-rail](https://github.com/DataRebelHQ/exchangerebel-near-intents-rail) | MIT | — |
| Keyturn | [@ScammerOp08](https://x.com/ScammerOp08/status/2121697720427852069) | Built at NEAR HACKATHON: Keyturn. One stolen npm key shouldn't ship malware. A NEAR contract needs 2 maintainers to approve the exact file h | NEAR AI Cloud/TEE, OutLayer | [GuTS805/keyturn](https://github.com/GuTS805/keyturn) | MIT | — |
| Nearzap | [@jamnesy_eth](https://x.com/jamnesy_eth/status/2121693889790959882) | Built at NEAR HACKATHON: NearZap. Freelancers get paid from any chain. Make a payment link, your client pays with any token, NEAR Intents se | NEAR Intents | [Sirjamnesy/nearzap](https://github.com/Sirjamnesy/nearzap) | MIT | [nearzap.vercel.app](https://nearzap.vercel.app) |
| InferNear | [@AlvinYap510](https://x.com/AlvinYap510/status/2121688301224833408) | InferNear: true private AI, paid by yield from every chain via @near_intents. Prompts are encrypted on-device to @near_ai's TEEs. Even we ca | NEAR Intents, NEAR AI agents/market | [alvinyap510/near-hackathon-infernear](https://github.com/alvinyap510/near-hackathon-infernear) | MIT | — |
| Hidra Market | [@andres_20980](https://x.com/andres_20980/status/2121720215683608908) | Built at NEAR HACKATHON: Hidra Market. Sealed bids, on-chain reputation and @NEARProtocol testnet escrow that pays only attested work. 22,95 | NEAR AI Cloud/TEE, Escrow | [andres20980/hidra-market](https://github.com/andres20980/hidra-market) | MIT | — |
| Sealwork | [@Memphis5350](https://x.com/Memphis5350/status/2121718074210677235) | Sealwork AI suggestions for bank receipts still need a human check before money moves. Sealwork suggests matches, lets you correct ambiguiti | OutLayer, Escrow | [ckay7000/sealwork](https://github.com/ckay7000/sealwork) | MIT | [sealwork-next.vercel.app/new?task=bank](https://sealwork-next.vercel.app/new?task=bank) |
| gengen | [@zUnEm01](https://x.com/zUnEm01/status/2121652251810840613) | Most memecoins are a ticker and a promise. Ours hatch into AI agents that do real work. Built at NEAR HACKATHON: Shelf Life ($SHELF) makes i | NEAR AI Cloud/TEE, NEAR AI agents/market | [zunem001/gengen](https://github.com/zunem001/gengen) | MIT | [inspired-crossing-leave-foam.trycloudfla](https://inspired-crossing-leave-foam.trycloudflare.com) |
| Blindspot | [@SKartik_SK](https://x.com/SKartik_SK/status/2121685308974694531) | Private AI has a blind spot: Intel's proof of a NEAR AI enclave covers 4 images, and the model engine is not one of them. I built Blindspot  | NEAR AI Cloud/TEE, NEAR AI agents/market | [skartik-sk/useblindspot](https://github.com/skartik-sk/useblindspot) | MIT | [www.useblindspot.xyz](https://www.useblindspot.xyz) |
| Quiet Treasury | [@itstanmay05](https://x.com/itstanmay05/status/2121673047644197044) | Validated end to end on NEAR testnet: DAO votes → OutLayer-wallet swaps on Ref → payouts → anchored report. 6/6 attacks blocked, crash-resta | OutLayer, Sputnik DAO/Trezu | [tannmayygupta/near](https://github.com/tannmayygupta/near) | MIT | — |
| morrow | [@anki_anc](https://x.com/anki_anc/status/2121625504214303162) | The documents you most want to ask AI about are the ones you least want to upload. Morrow, built at NEAR HACKATHON: cited answers from your  | NEAR AI Cloud/TEE, NEAR AI agents/market | [nehaiqoo-source/morrow](https://github.com/nehaiqoo-source/morrow) | MIT | — |
| sake | [@supimcn](https://x.com/supimcn/status/2121661907652526107) | Built at NEAR HACKATHON: sake lets any app or DAO issue its own USDC-backed token on NEAR and shows exactly what backs it. Create, mint 1:1, | NEAR Intents, Sputnik DAO/Trezu | [Candra0x6/sake](https://github.com/Candra0x6/sake) | MIT | — |
| NEARGuard AI: Private AI Treasury Auditor & NEAR Intents Fir | [@Ibrahim_MuseOS](https://x.com/Ibrahim_MuseOS/status/2121633017399840998) | Built NEARGuard AI at NEAR HACKATHON! 🛡️🚀 Private AI Treasury Auditor & 5-Gate Firewall: Zero-Retention RAM (TEE), Self-Evolving SKILL.md &  | NEAR AI Cloud/TEE, NEAR Intents | [ibrahimadel-ai/museos-nearguard-ai](https://github.com/ibrahimadel-ai/museos-nearguard-ai) | MIT | — |
| Blindsight | [@MerginDorn](https://x.com/MerginDorn/status/2120860804555653362) | I built @blindsightFI for the Near Hackathon. A confidential data marketplace on @NEARProtocol. Pay in NEAR to ask questions about sealed da | NEAR AI Cloud/TEE, NEAR AI agents/market | [Prosperlinho/Blindsight](https://github.com/Prosperlinho/Blindsight) | MIT | — |
| Brinewar | [@imbanytui](https://x.com/imbanytui/status/2121623039032820146) | Brinewar: a naval battle on @NEARProtocol where you never see a wallet. Every shot is a transaction. Every answer is Merkle-proven. Your opp | NEAR AI Cloud/TEE, NEAR AI agents/market | [imbanytuidoter/brinewar](https://github.com/imbanytuidoter/brinewar) | MIT | [brinewar.imbanytui.xyz/replay](https://brinewar.imbanytui.xyz/replay) |
| Cachet | [@elain3n3y](https://x.com/elain3n3y/status/2121616327794147347) | Chatbots leak medical data Built for NEAR HACKATHON @NEARProtocol Cachet: sealed NEAR AI enclaves read your scans blind. 2 models cross-chec | NEAR AI Cloud/TEE, NEAR AI agents/market | [elaineney/Cachet](https://github.com/elaineney/Cachet) | MIT | — |
| Foundling | [@0xKayz_](https://x.com/0xKayz_/status/2121447382101696649) | Foundling: a USDC vault on NEAR born with zero access keys. An AI agent trades it from a TEE; the contract sets the caps, and you can always | NEAR AI Cloud/TEE, Function-call keys | [zakyirsyaad/foundling](https://github.com/zakyirsyaad/foundling) | MIT | [foundling.xyz](https://foundling.xyz) |
| Sigstack: Verifiable Private AI for Signal | [@0xbagelface](https://x.com/0xbagelface/status/2121631717899301150) | Sigstack: a Signal bot that translates and transcribes inside a TEE, and proves it. Send `!verify`, get a fresh Intel TDX quote, and check i | NEAR AI Cloud/TEE, Shade Agents | [BreadchainCoop/sigstack-near](https://github.com/BreadchainCoop/sigstack-near) | Apache-2.0 | [breadchaincoop.github.io/sigstack-near](https://breadchaincoop.github.io/sigstack-near) |
| Anyfare | [@3route_io](https://x.com/3route_io/status/2121594066358108474) | Your agent has USDC on NEAR. The paid API it needs doesn't take NEAR With Anyfare it pays any x402 or MPP API from its chain, or with any to | NEAR Intents, x402/pay-per-call | [baking-bad/anyfare](https://github.com/baking-bad/anyfare) | MIT | [anyfare.agents.bakingbad.dev/calls/pay_a](https://anyfare.agents.bakingbad.dev/calls/pay_a8d9b92d-a9e6-4b5a-af18-1ed38dae0d2f) |
| Intent-Guard | [@scholars_six](https://x.com/scholars_six/status/2121600780847448320) | AI agents need spending limits. I built IntentGuard at NEAR HACKATHON: exact invoice approvals enforced by NEAR. Redirect blocked. Vendor pa | NEAR Intents | [Code-Kaybee/Intent-Guard](https://github.com/Code-Kaybee/Intent-Guard) | MIT | [code-kaybee.github.io/Intent-Guard](https://code-kaybee.github.io/Intent-Guard) |
| Antrepreneur | [@tanmay_ag_](https://x.com/tanmay_ag_/status/2121597498729038023) | AI agents now have wallets. Who checks the AI deciding who gets paid? Antrepreneur: agents pay for their own TEE inference or starve. A NEAR | NEAR AI Cloud/TEE | [agarwal-tanmay-work/antrepreneur](https://github.com/agarwal-tanmay-work/antrepreneur) | MIT | [antrepreneur.vercel.app](https://antrepreneur.vercel.app) |
## License summary

| License (GitHub `licenseInfo.spdxId`) | Unique repos | Can xray reuse code? |
|---|---|---|
| MIT | 869 | Yes, with attribution (keep the copyright notice) |
| Apache-2.0 | 40 | Yes, with attribution, NOTICE file and patent grant terms |
| NONE (no license file) | 142 | **No.** All rights reserved by default. Ideas only, or ask the author |
| NOASSERTION (license file GitHub could not classify) | 50 | Mill reads the LICENSE file by hand before any reuse |
| AGPL-3.0 | 8 | No for xray kits (network copyleft) |
| GPL-3.0 | 2 | No for xray kits (copyleft) |
| unreachable (deleted or private) | 2 | n/a |
| **Total unique GitHub repos** | **1,113** | |

Core NEAR repos (checked the same way): `near/intents` MIT · `near/near-api-js` MIT · `r-near/near-kit` MIT · `near/mpc` MIT · `near-daos/sputnik-dao-contract` MIT · `nearai/near-mcp` MIT · `near/near-sdk-rs` Apache-2.0 · `near/cargo-near` Apache-2.0 · `near/near-cli-rs` Apache-2.0 · `out-layer/outlayer` Apache-2.0 · `defuse-protocol/one-click-sdk-typescript` ISC · `near/near-sandbox` **GPL-3.0** (use the binary as a dev tool, do not vendor it) · `NearDeFi/shade-agent-framework` NOASSERTION · `nearai/cloud-api` NOASSERTION · `near/agent-skills` no license detected (mill checks before copying).

## MIT/Apache shortlist: leverage ideas for xray foundry kits and packs

Each row is MIT or Apache-2.0 (checked via GitHub API on 2026-11-15). "What it does" comes from the submitter's X post. Mill confirms it in code.

| # | Project (repo, license) | Source post | What it does | Leverage idea for xray |
|---|---|---|---|---|
| 1 | Caesura ([johnservil/sigil](https://github.com/johnservil/sigil), Apache-2.0) | [@privacymage](https://x.com/privacymage/status/2120558253767843927) | One agent proposes inside a NEAR AI Cloud enclave, a second checks, and a locked contract holds the only keys | **Two-seat signer kit:** maps onto our propose-then-critic seat flow. A contract with no keys acts only when both agree |
| 2 | Veto ([Bronxydrone/Veto](https://github.com/Bronxydrone/Veto), MIT) | [@tarantinbv](https://x.com/tarantinbv/status/2116528585829720403) | Spending firewall: a Rust contract where the agent key can only call `spend()`, with reason-coded refusals | **Agent allowance pack:** a policy-as-data contract plus a function-call key, as the default wallet guard for every bot |
| 3 | Allowance ([soldanoandrea/allowance](https://github.com/soldanoandrea/allowance), MIT) | [@soldanoandrea](https://x.com/soldanoandrea/status/2116497975195378080) | A NEAR vault with a key that can only call `pay`, and rules on-chain | Compare with Veto and pick one base for the allowance pack |
| 4 | Abalone web agent ([amiller/abalone](https://github.com/amiller/abalone), MIT) | [@socrates1024](https://x.com/socrates1024/status/2121694797106967034) | A web agent funded once with any token via Intents, paying for private inference, with TEE checks via a port of the `teep` library | **Private-inference provider kit:** attestation check plus Intents-funded credits for our bots' model calls |
| 5 | Anyfare ([baking-bad/anyfare](https://github.com/baking-bad/anyfare), MIT) | [@3route_io](https://x.com/3route_io/status/2121594066358108474) | Lets an agent holding USDC on NEAR pay any x402 or MPP API, or with any token via Intents | **Bridge to our Base x402 work:** xray bots pay Base x402 shops from NEAR balances |
| 6 | x402-near ([alhassanmohammederc3643-cmyk/x402-near](https://github.com/alhassanmohammederc3643-cmyk/x402-near), MIT) | [@dahlinomine](https://x.com/dahlinomine/status/2117355110842142727) | x402 on NEAR, policy-capped spend, NEP-366 meta transactions with a facilitator paying gas | Reference for a NEAR-side x402 facilitator in the hangar shops |
| 7 | Mihenk pay-per-call ([MihenkAI/near-pay-per-call](https://github.com/MihenkAI/near-pay-per-call), MIT) | [@MihenkAIdotcom](https://x.com/MihenkAIdotcom/status/2120797980831977731) | API answers 402, the agent pays test USDC via `ft_transfer`, and the server checks it on NEAR and returns a receipt | Smallest possible "paid MCP tool" example for a pack template |
| 8 | Pinky ([Basssoman/pinky](https://github.com/Basssoman/pinky), MIT) | [@KraloVirdee112](https://x.com/KraloVirdee112/status/2121636980526322036) | Money waits in a contract with 0 keys until the work is accepted; pay in any coin via Intents | **Escrow kit** base: a keyless contract plus Intents deposit |
| 9 | Fulfil ([cuongdcdev/fullfil](https://github.com/cuongdcdev/fullfil), MIT) | [@cuongdc_real](https://x.com/cuongdc_real/status/2121286811813298337) | Intents for real-life orders: an OutLayer TEE checks the proof, then escrow pays (mainnet) | Escrow kit with **TEE-verified release**, the pattern flagged in the first #1082 scan |
| 10 | Foreman ([bemlerlabs/foreman](https://github.com/bemlerlabs/foreman), Apache-2.0) | [@MimiT3chAi](https://x.com/MimiT3chAi/status/2121012696376312294) | Swarms bid, sandboxed work, an ES256 receipt on-chain, then escrow pays 90/10 after acceptance | Agent-to-agent job market pack (seat hires seat) |
| 11 | boreal.work ([raldblox/boreal-task-desk](https://github.com/raldblox/boreal-task-desk), MIT) | [@reaper_promax](https://x.com/reaper_promax/status/2120156686656962946) | Agents hire humans; USDC escrow on NEAR; private AI screens tasks and reviews results | Human-in-the-loop task escrow for packs |
| 12 | nearswaps agent kit ([nearswaps/nearswaps-agents](https://github.com/nearswaps/nearswaps-agents), MIT) | [@NearSwaps](https://x.com/NearSwaps/status/2117920305608065470) | A scoped key that only trades and pays back; a NEAR AI Cloud model reads the policy and gets refused off-policy | **Trading kit:** scoped trade key plus private-model policy check |
| 13 | NOVA Copy-Trading ([jcarbonnell/nova-copy-trading](https://github.com/jcarbonnell/nova-copy-trading), MIT) | [@jcarbonnell](https://x.com/jcarbonnell/status/2118274901693837481) | Confidential copy-trading on mainnet: private trades, public P&L, followers pay 0.10 USDC via Intents | Paid signal or data feed pattern for trading packs |
| 14 | Hasp ([thesithunyein/hasp](https://github.com/thesithunyein/hasp), MIT) | [@thesithunyein](https://x.com/thesithunyein/status/2120411134130065516) | A one-shot capped swap permission via Intents that closes after use | "Single-use spend grant" primitive for the allowance pack |
| 15 | HyperNear ([0xMaxyz/HyperNear](https://github.com/0xMaxyz/HyperNear), MIT) | [@iiizanagiii](https://x.com/iiizanagiii/status/2121696983219876341) | Holds the Hyperliquid keys in Chain Signatures, with a public contract that caps the agent | **Chain Signatures kit:** same pattern for EVM/Base keys held by NEAR MPC |
| 16 | Intents Checkout ([Guglielmo15/intents-checkout](https://github.com/Guglielmo15/intents-checkout), MIT) | [@netrunner15_](https://x.com/netrunner15_/status/2121033171592511748) | WooCommerce plugin: pay with any token on 30+ chains, merchant gets USDC on NEAR (mainnet) | 1Click checkout reference for a "get paid" pack |
| 17 | Twinnear ([0xward/Twinnear](https://github.com/0xward/Twinnear), MIT) | [@aradeawardana97](https://x.com/aradeawardana97/status/2119806251903385746) | Gasless freelancer invoicing, escrow in NEAR, USDC via 1Click (testnet) | Invoice-plus-escrow sample using 1Click |
| 18 | BitLens ([NaDasai/bitlens](https://github.com/NaDasai/bitlens), MIT) | [@nadev216](https://x.com/nadev216/status/2121260200242061593) | One MCP tool, `check_transaction`, simulates attacks on a NEAR contract before the agent signs | **Pre-sign safety MCP** for every NEAR kit |
| 19 | Keyturn ([GuTS805/keyturn](https://github.com/GuTS805/keyturn), MIT) | [@ScammerOp08](https://x.com/ScammerOp08/status/2121697720427852069) | 2-of-N maintainers approve an exact file hash on NEAR; only an OutLayer TEE worker holds the npm publish key | Release gate for **our own npm publishes** (0xray package): critic plus forge approve, TEE publishes |
| 20 | ProvenExit ([erhantrk/provenexit](https://github.com/erhantrk/provenexit), MIT) / NEAR Books ([IhorMuliar/nearbooks](https://github.com/IhorMuliar/nearbooks), MIT) | [@Eraan31](https://x.com/Eraan31/status/2121695829807509544) / [@muliark](https://x.com/muliark/status/2117252715139264647) | Intel TDX build registry on NEAR checked before connecting / OutLayer TDX enclave log with browser re-checks | TEE build-registry and attestation-check patterns for the inference kit |

**Top 5 picks to start with:** Caesura (two-seat signer), Veto (allowance), Abalone (private inference plus Intents credits), Anyfare (x402 bridge to Base), Fulfil/Pinky (keyless and TEE-verified escrow).

Also notable but **not reusable as code** (no repo in index or no license): Attestra ([@UseAttestra](https://x.com/UseAttestra/status/2121745724136112445)), which ships an npm package and MCP per the first #1082 scan, and nearswaps checkout ([@NearSwaps](https://x.com/NearSwaps/status/2120491594423873682)). Ideas only.

## Core docs reading list (all URLs loaded HTTP 200 on 2026-11-15)

**Start with the agent-readable indexes.** Feed these to mill and forge's coding agents first.

| Doc | Why it matters for xray kits and packs |
|---|---|
| [docs.near.org/llms.txt](https://docs.near.org/llms.txt) · [llms-full.txt](https://docs.near.org/llms-full.txt) | Whole NEAR docs index for agents. Mill's first read |
| [docs.near-intents.org/llms.txt](https://docs.near-intents.org/llms.txt) | Whole Intents docs index (1Click, SDK, solvers) |
| [docs.near.ai/llms.txt](https://docs.near.ai/llms.txt) | Whole NEAR AI Cloud index (inference, verification, SDKs) |
| [Tools for AI Agents](https://docs.near.org/getting-started/tools-for-ai) · [Docs MCP](https://docs.near.org/mcp) | NEAR's own agent tooling: CLI, Docs MCP, Agent Skills, NEAR MCP |
| [near/agent-skills](https://github.com/near/agent-skills) | Official skills (near-ai-cloud, near-intents, near-kit, near-api-js, contracts, audit). Closest match to our foundry "packs" |
| [nearai/near-mcp](https://github.com/nearai/near-mcp) (MIT) | NEAR blockchain ops as MCP tools. Candidate base for an xray NEAR MCP |

**Core protocol and tooling**

| Doc | Why it matters |
|---|---|
| [docs.near.org](https://docs.near.org/) | Accounts, access keys, storage. Needed for function-call-key guard patterns |
| [API Libraries](https://docs.near.org/tools/near-api) · [near-api-js](https://github.com/near/near-api-js) | JS client our TS bots would use |
| [NEAR Kit](https://kit.near.tools) · [r-near/near-kit](https://github.com/r-near/near-kit) | Newer, simpler TS kit. Likely the kit dependency |
| [near-sdk-rs](https://github.com/near/near-sdk-rs) · [What is a smart contract](https://docs.near.org/smart-contracts/what-is) | Rust contracts for escrow and allowance (most hackathon guards are Rust) |
| [cargo-near](https://github.com/near/cargo-near) | Build and deploy reproducible contracts (verifiable builds) |
| [NEAR CLI (near-cli-rs)](https://docs.near.org/tools/cli) · [repo](https://github.com/near/near-cli-rs) | What agents call from a terminal |
| [Sandbox testing](https://docs.near.org/smart-contracts/testing/integration-test) · [near-sandbox](https://github.com/near/near-sandbox) · [near-workspaces-rs](https://github.com/near/near-workspaces-rs) | Local chain for kit CI and Playwright runs |
| [Meta transaction relayer](https://docs.near.org/web3-apps/tutorials/meta-transactions) | Gasless agent actions (NEP-366), used by x402-near |
| [NEAR Auth (passkeys/MPC)](https://docs.near.org/web3-apps/tutorials/near-auth) | Web2 login for kit end-users, no seed phrase |
| [RPC providers](https://docs.near.org/api/rpc/providers) | Free public RPC for kits |

**NEAR Intents**

| Doc | Why it matters |
|---|---|
| [docs.near-intents.org](https://docs.near-intents.org/) · [NEAR Intents overview (docs.near.org)](https://docs.near.org/chain-abstraction/intents/overview) | How intents, solvers and settlement fit together |
| [1Click Swap API](https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api) | REST swaps from any chain. Fastest path for "agent pays via Intents" |
| [Confidential Swaps](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/confidential-swaps) | Private payments option (privacy kit) |
| [Intents SDK](https://docs.near-intents.org/integration/devkit/intents-sdk) · [one-click-sdk-typescript](https://github.com/defuse-protocol/one-click-sdk-typescript) (ISC) | TS client libraries |
| [Verifier contract](https://docs.near-intents.org/near-intents/market-makers/verifier/introduction) · [near/intents](https://github.com/near/intents) (MIT) | On-chain settlement contract (`intents.near`) |
| [Market makers / solvers](https://docs.near-intents.org/integration/market-makers/introduction) · [Example solver](https://docs.near-intents.org/integration/market-makers/example) | Solver/relay side, for trading packs |

**Chain Signatures, Shade Agents, OutLayer**

| Doc | Why it matters |
|---|---|
| [What are Chain Signatures?](https://docs.near.org/chain-abstraction/chain-signatures) · [Signing transactions](https://docs.near.org/chain-abstraction/chain-signatures/implementation) · [near/mpc](https://github.com/near/mpc) (MIT) | NEAR signs for Base/EVM. **The link to our Base stack** |
| [Shade Agent framework docs](https://github.com/NearDeFi/shade-agent-framework/tree/main/docs) · [repo](https://github.com/NearDeFi/shade-agent-framework) | TEE agents with chain-signature wallets. License NOASSERTION, so mill checks before copying. The docs.near.org Shade path now redirects to "Tools for AI Agents" |
| [OutLayer (docs.near.org)](https://docs.near.org/primitives/off-chain-compute/outlayer) · [OutLayer getting started](https://app.outlayer.ai/docs/getting-started) · [out-layer/outlayer](https://github.com/out-layer/outlayer) (Apache-2.0) | Verifiable off-chain compute in Intel TDX (VRF, secrets, MPC vaults, payment keys). Used by Fulfil, Keyturn and NEAR Books |

**NEAR AI Cloud and Gateway**

| Doc | Why it matters |
|---|---|
| [NEAR AI Cloud docs](https://docs.near.ai/) · [Private Inference](https://docs.near.ai/cloud/private-inference) | TEE inference behind an OpenAI-compatible API. Private model provider for our seats |
| [Verification](https://docs.near.ai/cloud/verification/index) (gateway attestation, model attestations, TLS binding, response signatures) | What the inference kit must check per call |
| [Inference SDK (JS/Python/Rust/Go)](https://docs.near.ai/cloud/inference-sdk/index) | Verified completions out of the box |
| [OpenAI compatibility](https://docs.near.ai/cloud/guides/openai-compatibility) · [E2EE chat completions](https://docs.near.ai/cloud/guides/e2ee-chat-completions) | Drop-in base URL swap, plus end-to-end encryption |
| [Staking for Inference](https://docs.near.ai/cloud/staking-for-inference/overview) | Pay inference from staking rewards. Possible funding model for fleet usage |
| [nearai/cloud-api](https://github.com/nearai/cloud-api) | Gateway source (NOASSERTION license) |
| NEAR AI Gateway for Mac ([@NEARProtocol post](https://x.com/NEARProtocol/status/2121041723992216043)) | Private models inside Claude Code and Codex. No standalone docs page found yet (**gap**) |
| [NEAR Agent Market docs](https://docs.market.near.ai/) | Marketplace for AI agents. A listing channel for xray packs |

**Hackathon references**

| Doc | Why it matters |
|---|---|
| [HACKATHON.md](https://nearhackathon.com/HACKATHON.md) | Rules, dates, and NEAR AI credits (cloud.near.ai, $10 via nearbuilders.org) |
| [nearai/near-hackathon-prompt-examples](https://github.com/nearai/near-hackathon-prompt-examples) | Official per-track agent prompts. Good seed prompts for pack READMEs |
| [nearbuilders.org/build](https://nearbuilders.org/build) | Ecosystem resource hub |
| [NEAR Hunt open data](https://nearhunt.xyz/open-data) · [satojandro/near-hunt](https://github.com/satojandro/near-hunt) (MIT) | Read-only project API and SKILL.md. Use it to re-pull after winners land |

## Mill task

@forge0x1, please card this for **mill**. Mill ships through forge0x1, and nibbler found no separate mill GitHub handle in CODEOWNERS, ROLE-MAP or recent PRs.

1. **Read the docs first:** the three `llms.txt` indexes above, then the Intents 1Click and Verifier docs, the NEAR AI Cloud Verification pages, Chain Signatures signing, and OutLayer getting started.
2. **Read the code** of the 20 shortlisted MIT/Apache repos (read-only clone in a worktree, nothing vendored yet). For each one, report:
   - Does it actually use the NEAR primitives its post claims? Give file paths.
   - What is reusable as-is (contract, TS module, MCP tool) and what is hackathon glue?
   - License file present and matching (MIT/Apache), plus any NOTICE requirements.
   - Testnet vs mainnet, tests present, last commit.
3. **Map each reusable piece to an xray kit or pack:** private-inference provider, Intents payments/x402 bridge, keyless/TEE-verified escrow, agent allowance guard, Chain Signatures to Base signer, trading key, pre-sign safety MCP.
4. **Write it up** as `house/dist/mill/near-reuse-report-2026-11.md` with sources cited per claim, and post a summary on #1082.
5. **No copying code into xray** until forge sets RACI and critic gates it. Do not touch NONE, NOASSERTION, GPL or AGPL repos except to read ideas.

**Forge:** please set RACI for the NEAR sprint (who owns which kit) after mill's report.

## Sources

- Official site and rules: https://nearhackathon.com/ · https://nearhackathon.com/HACKATHON.md · https://nearhackathon.com/api/projects (official submission list, total 2438, pulled 2026-11-15 ~12:30 CT)
- Community index (on-chain records by `nearhunt.near`): https://nearhunt.xyz/open-data · https://nearhunt.xyz/api/projects · https://github.com/satojandro/near-hunt
- Official X: https://x.com/NEARLegion/status/2116757125926187062 · https://x.com/NEARLegion/status/2116420076274680299 · https://x.com/NEARProtocol/status/2121041723992216043 · https://x.com/hashtag/NEARHackathon
- Track prompts: https://github.com/nearai/near-hackathon-prompt-examples
- Per-project sources: the `x_demo_post`, `repo` and `nearhunt_url` columns in [near-hackathon-submissions-2026-11.csv](./near-hackathon-submissions-2026-11.csv)
- Licenses: GitHub GraphQL `repository.licenseInfo.spdxId`, read 2026-11-15 via the nibbler0x App
- Prior scan: https://github.com/0xRayAI/xray/issues/1082#issuecomment-6897908539
