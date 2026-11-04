---
name: scout
description: Scout feed plant. Brief → plane → digest → receipt. Nibbler organ. Not the suit HUD. Not the eng mill. Not Dist beds.
---

# Scout

This plant **fastens** a feed mill. Nibbler wears it. A brief becomes a digest and a receipt. Goggles stays the suit HUD. This plant is the job.

**Seat:** `foundry.json` `{ "plant": "scout", "costume": false }` turns mill off. Default stays mill+inspect. `"plant": ["mill", "scout"]` wears both.

This is not the eng mill catalog. It is not Dist beds. It is not sound. It is not blip. It is not costume.

**Spine:**

1. **Brief** → topic.
2. **Plane** → `dev` | `integration` | `domain` | `ecosystem`. A missing plane fails closed.
3. **Look** → body from `--body`, `--file`, or `--stdin`, plus paths. An empty body fails closed.
4. **Digest** → `.xray/scout/digest.md`. A missing digest fails closed.
5. **Receipt** → `.xray/scout-feed-receipt.json` (`PASS` / `FAIL` + plane, topic, paths).

```bash
npx @0xray/foundry scout look --brief "night board" --plane dev --body "the card is the feed"
npx @0xray/foundry scout inspect
npx @0xray/foundry inspect --skip-live
```

Mint fastens `scout` + `scout-inspect` + `scout-look`. It does not dump mill inspect or the eng catalog onto a scout seat.

Nibbler pin:

```json
{ "plant": "scout", "costume": false }
```
