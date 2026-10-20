# Packet: the board hands off PR and review lines

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

The CoS seat no longer sends dev handoffs. The board does.

## Packet

- scope: The board does every PR and review handoff. The CoS seat only acks a dev line and sends no message. CoS acts only on next-wave planning, burn pacing, H-lane and Dist packets, and seat onboarding.
- files: `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`
- tests: `house/live/tests/test_wake_template.py` keeps the numbered wake steps. The CoS rule stays inside the handoff step.
- acceptance: A critic fail, a merge go, and a re-check are board handoffs. The CoS seat acks those lines and sends no message. The four duties stay the only CoS actions.
- next owner: critic
