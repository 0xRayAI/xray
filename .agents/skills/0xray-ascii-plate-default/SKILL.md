---
name: 0xray-ascii-plate-default
description: >-
  Default for any 0xRay plate or @0xRayAI plate post: a left-to-right
  architecture / network diagram (domains, their parts, and how nodes connect)
  in yellow-mark mono ASCII boxes on a dark panel with a cyan frame. Use before
  drawing any plate unless the owner names another style.
---
# 0xRay ASCII plate (default style)

The owner set this as the default plate on 2026-11-17. Reference: `.agents/skills/0xray-ascii-plate-default/refs/foundry-architecture-ascii-v4.png`, made by `.agents/skills/0xray-ascii-plate-default/refs/render_foundry_ascii_v4.py` in the same folder. Copy that script as the starting point. Pass the output folder as the first argument (or `PLATE_OUT`); it defaults to the current directory.

## Objective (always)
Every plate is a left-to-right architecture / network diagram, also called a system context diagram. It shows the domains (systems, services, actors), the parts inside each domain, and how the nodes connect. Inputs start on the left and outcomes end on the right. Group a domain's parts inside one big box. Put outside actors and services outside it, joined by labeled arrows.

## Look (keep exactly)
- Canvas 1280 wide, height fit to content (no empty space). Pillow render.
- Colors: void bg #08090B, panel #14171C, footer strip #12151A, ink #F5F7FA, yellow #F5C518, cyan #3DE0E8, grey #787E87.
- Fonts: DejaVuSansMono (Bold for title/mark). Body mono 16px min, line height 24.
- Header: `0xRay` in yellow bold + white bold title in caps; one cyan subtitle line under it.
- Cyan outer frame with corner dots; dark rounded panel holds the diagram.
- Boxes and arrows drawn as thin white lines on a character grid (not font box glyphs, which leave gaps between rows). Dashed box = optional or pending.
- Footer: cyan `#consult  ·  consult@0xray.dev`, small grey `stamped · 0xray 4.2.3`.

## Layout rules (owner fixes, 2026-11-17)
1. Boxes are small and airy: a box name in caps plus at most one 2-3 word line. Never paragraphs in boxes.
2. Edge labels are 1-2 words and sit on or just above their arrow.
3. No notes block, no legend, no detail list under the flow. "No one is gonna read that." Aim for about 25 words outside the box names in total.
4. Return paths (result, refund) are dashed lines under the flow running right to left with short labels.
5. Show the right view: the domain itself with its parts inside (for example agent, skills, tools, config, mailbox), not only a payment pipeline.
6. Every box and placement must come from a real source: the plate's .md, repo code or docs. Never invent a component. Report anything the owner asks for that sources don't back.
7. The main flow runs left to right. Its order and edges must match the source .md.

## Check before showing
- Read the PNG back. Check that nothing is clipped, there's no tofu (the ◄ glyph needs a font that has it, or draw it as a line), the arrows point the right way and nothing is crowded.
- Show the owner before any post. Posting still needs his own-words GO.
