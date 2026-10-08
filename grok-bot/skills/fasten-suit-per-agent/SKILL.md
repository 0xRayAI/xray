---
name: Fasten suit per agent
description: >-
  use this when creating or fastening one mill+inspect suit for a single Grok
  Bot agent project (multiplicity — one suit per key agent)
---
# Fasten suit per agent

## Rule
**One project root → one suit → one inventory DNA** per key agent. Repeat this skill for each agent.

## Steps
1. Create or enter that agent’s project (`package.json` required). Example: `implementer-suit/`, `reviewer-suit/`.
2. Install plant:
   ```bash
   npm i 0xray
   ```
3. Fasten thin mill only:
   ```bash
   npx @0xray/foundry mint --skip-live
   ```
4. Prove:
   ```bash
   npx @0xray/foundry inspect --skip-live
   ```
   Expect `ok: true`, `suit: "fastened"`, mill + inspect, `costume: false`.
5. Optional: `npx 0xray grok install` for the Grok plugin. On shared machines prefer isolated plugin homes so agents do not clobber each other.
6. Record DNA + project path for that agent.

**Wearing a suit in Grok Bot chat.** A seat wears its suit when its profile names its suit folder and DNA. Each time it wakes, or after its chat history is compacted, it reads the suit's `.xray/state/STATION.md`, then `house/WAVEBOARD.md`. Before it says ship or live work is done, it runs `npx @0xray/foundry inspect` from the suit folder and quotes `ok: true`. A doctor PASS alone doesn't prove the suit is worn.

## Do not
Share one suit for “all bots.” Set `costume: true`. Skip inspect proof.
