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
   npx 0xray wear
   ```
4. Prove:
   ```bash
   npx 0xray validate
   ```
   Expect `✅ plant: mill + inspect fastened` and `🎉 Wear checks passed.` A `❌` line names the miss. (`0xray inspect` is not in 0xray 4.2.1, the version npm installs on Node below 24.22.3, xray#1068.)
5. Optional: `npx 0xray grok install` for the Grok plugin. On shared machines prefer isolated plugin homes so agents do not clobber each other.
6. Record DNA + project path for that agent.
7. In that seat’s own chat, run `seat-label`. One seat does not set another seat’s title.

**Wearing a suit in Grok Bot chat.** A seat wears its suit when its profile names its suit folder and DNA. Each time it wakes, or after its chat history is compacted, it reads the suit's `.xray/state/STATION.md`, then the board: `house/WAVEBOARD.md` when `LIVE_URL` is unset, or its Bifrost cards (`GET /cards`) when `LIVE_URL` is set, and `house/ATTENTION_STATE.md`. Before it says ship or live work is done, it runs `npx 0xray validate` from the suit folder and quotes `✅ plant: mill + inspect fastened`. A doctor PASS alone doesn't prove the suit is worn.

## Do not
Share one suit for “all bots.” Set `costume: true`. Skip inspect proof.
