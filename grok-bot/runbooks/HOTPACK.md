# Hotpack runbook

A hotpack is a short-lived pack cut from a main tip that just merged. Seats wear it before the next npm cut. It is not a kit, a suit, a bundle, or a packet. The words are in [LEXICON](../LEXICON.md).

0. On a wake, follow [Station boot](../OP-PROC.md#station-boot).
1. The tip is already on main. Cut the pack from that commit. Do not cut it from a dirty tree.
2. Wear one seat at a time. The strip order, when forge runs it, is blinky, then forge, then critic, then herald. Not the eng room.
3. On each seat: install the pack, wear, doctor. One prove. Write the receipt on the card.
4. Leave the pack when Blaze gives Dist GO and the npm cut ships. That step is graduate. Until then Dist stays HOLD.
5. A hotpack is not a hotfix. Hotfix rules stay in [SHIP](SHIP.md#hotfix) and [Hotfix bypass](../OP-PROC.md#hotfix-bypass).
