# Auto Review policy (Blaze Strategic Consulting)

**LOCKED draft 2026-09-16** — paste into [Auto-review rules](grokbot://app/v1/settings?id=auto-review-rules). Critic L2 on the capital-exception section in `OPS-SPEC.md`.

**A friend would hear:** Auto Review can’t tell forge from herald. So we **Ask first** on money/deploy/publish, and only **Allow** Dist posts + read-only checks + git push to known eng repos.

## Why
Product: all Bots share one computer — not a security fence.  
House: Blaze = capital; Dist @0xRayAI posts are the known bot-owned exception; forge ships after critic PASS.

## Ask first (replace / add these)
Paste as **Ask first** rules:

1. Publish any package to the npm registry
2. Deploy with the Railway CLI or change a production Railway service
3. Pay hangar shops, send USDC/crypto, or call eip3009 / x402 pay endpoints
4. Create a public gist that contains tokens, keys, registration secrets, or wallet material
5. Send peer notes or messages to external A2A / agent-network endpoints
6. Delete production data, revoke credentials, or rotate publish tokens
7. Spend money or change billing

## Allow automatically (keep / add these only)
Paste as **Allow automatically** rules:

1. Use `npm view` / `npm` read commands and `curl` to check npm registry status (no publish)
2. Run `git push` for `0xRayAI/xray`, `htafolla/blips`, `htafolla/clearing`, `htafolla/groover` when forge owns the ship track
3. Download SSOT archives from `gist.githubusercontent.com` into the workspace when requested
4. Post or reply on X as `@0xRayAI` when Dist execute path is active (house Dist exception)
5. Create public gists for **non-secret** auxiliary files / tarballs only (no tokens)

## Remove from current Always-allow
These are live today and clash with capital law — **delete** them from Allow:

- Use npm to publish packages… (both variants)
- Pay hangar pin shop and complete payments using crypto or eip3009…
- Deploy services using railway CLI…
- Create public gists … for registration tokens and cards
- Send peer notes to external A2A endpoints…

## Seat process (not Auto Review)
Auto Review is account-wide. Seat law still applies:

| Action | Who | Gate |
|--------|-----|------|
| git push / merge after critic PASS | forge | critic Strict + CI |
| npm publish | forge | critic PASS + tag; **Ask first** card (Blaze Allow once / Always if desired) |
| Railway deploy | forge | critic when Strict; **Ask first** card |
| @0xRayAI Dist | herald | CoS EXECUTE packet + friend-test; Auto Review **Allow** |
| Hangar / Blips pay | forge/magnet dogfood | **Ask first** — capital |
| Credentials / token rotate | Blaze only | never Always-allow |

## Verify
After paste: open [Auto-review](grokbot://app/v1/settings?id=auto-review) — enabled.  
Test: forge `npm publish` should card; herald Dist post should not stop for Auto Review (still needs CoS packet).
