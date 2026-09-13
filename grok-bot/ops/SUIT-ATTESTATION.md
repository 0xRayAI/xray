# Suit proof (wear check)

Chat approval is not proof. Grok Bot is not a fake tool-deny floor.

## How we know a seat is worn
1. Inventory file: `<suit>/.xray/foundry-inventory.json`  
   - `suit: "fastened"`  
   - `costume: false` (thin mill — not a full dump)  
   - mill skills include `mill` + `inspect`  
   - DNA hex matches the file
2. Live check: `cd <suit> && npx @0xray/foundry inspect --skip-live` → `ok: true`
3. Eng seats: reviewer re-reads inventory + inspect before calling the seat worn

## How to fasten
```bash
npm i 0xray@4.0.12 @0xray/foundry@0.1.10
npx @0xray/foundry mint --skip-live
```

Optional Grok plugin install: `npx 0xray grok install`  
On a shared machine, last mint may win the shared plugin home — prefer per-seat isolation when available.

## Do not
Set `costume: true` for fleet seats. Dump dozens of skills “just in case.”
