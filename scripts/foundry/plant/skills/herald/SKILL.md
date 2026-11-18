---
name: herald
description: Herald Dist write plant. H-lane write/brand. Brief → gates → draft → receipt. Not the eng mill. Not scout goggles. Not Dist packaging or send.
---

# Herald

This plant **fastens** the H-lane write/brand mill. Herald wears it. A brief becomes a draft and a receipt. Aliases `write` and `brand` fasten the same plant.

**Seat:** `foundry.json` `{ "plant": "herald", "costume": false }` turns mill off. Default stays mill+inspect. `"plant": ["mill", "herald"]` wears both.

This is not the eng mill catalog. It is not scout or the suit HUD. It is not Dist packaging and it never sends Dist. It is not sound, blip, or costume.

**Pointers (seat skills, not shipped here):** brand voice (`0xray-brand-voice`), friend-hear (`synaptical-comms` H lane), plate outsider (`0xray-plate-outsider`), Dist GO gate (`dist-0xrayai-publish`). Dist GO is a human gate; the receipt always says `dist: HOLD`.

**Spine:**

1. **Brief** → what the post is for. Missing fails closed.
2. **Lane** → `H` only. Missing or B lane fails closed.
3. **Friend-hear** → one line a friend would hear. Missing fails closed.
4. **Body** → `--body`, `--file`, or `--stdin`. Empty fails closed.
5. **Draft** → `.xray/herald/draft.md`. **Receipt** → `.xray/herald-write-receipt.json` (`PASS` / `FAIL`, `dist: HOLD`, `sent: false`).

```bash
npx @0xray/foundry herald draft --brief "scout plant shipped" --lane H --friend-hear "Nibbler reads the feed so you don't" --body "..."
npx @0xray/foundry herald inspect
```

Herald pin (document only; do not wear yet):

```json
{ "plant": "herald", "costume": false }
```
