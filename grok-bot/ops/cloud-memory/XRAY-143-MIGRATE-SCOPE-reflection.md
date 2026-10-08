# Reflection — house init migrate and doctor Scope

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

UNREVIEWED

`house init --migrate` moves `ops/WAVEBOARD.md` to `house/WAVEBOARD.md` and starts `ATTENTION_STATE.md` when that file is missing. A house file you already changed stays. Both boards, with the house board edited, is a refuse and writes nothing. An untouched template board may be replaced by the old board.

Doctor wallet nags stop only for a HOUSE.md line that is exactly `wallet off` or `Scope: wallet off`. Default stays on.
