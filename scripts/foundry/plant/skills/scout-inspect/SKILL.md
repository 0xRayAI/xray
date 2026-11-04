---
name: scout-inspect
description: Scout feed inspect. Last digest receipt, fail-closed. Not mill inspect. Not a Dist bed. Not the suit HUD.
---

# Scout inspect

This is the **feed** inspect, not mill inspect of AI work. Open the last receipt. Quote the status, the plane, the topic, and the paths. Do not invent a pass.

`npx @0xray/foundry scout inspect` is the digest check. `npx @0xray/foundry inspect` reports the scout plant plus that receipt.

## Gates (fail-closed)

Missing receipt, missing digest, empty body, or a missing plane is **FAIL**.

1. **Plane.** `dev`, `integration`, `domain`, or `ecosystem`. Empty is `missing-plane`.
2. **Body.** The look text is non-empty. Empty is `empty-body`.
3. **Digest.** `.xray/scout/digest.md` is on disk and non-empty. Missing is `missing-digest`.
4. **Receipt.** `.xray/scout-feed-receipt.json` is `PASS` or `FAIL`.

```bash
npx @0xray/foundry scout look --brief "night board" --plane dev --body "the card is the feed"
npx @0xray/foundry scout inspect
```

Plant-vs-worn allowlists `scout` + `scout-inspect` + `scout-look` when `"plant": "scout"`. They are not a costume dump. Mill may be off on this seat.
