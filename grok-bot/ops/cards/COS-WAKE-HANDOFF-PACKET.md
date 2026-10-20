# Packet: the CoS seat does not post a handoff

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

The CoS seat does not post a handoff. It only acks a dev line and sends no message about it.

## Packet

- scope: The CoS seat does not post a handoff. It only acks a dev line and sends no message. CoS acts only on next-wave planning, burn pacing, H-lane and Dist packets, and seat onboarding.
- files: `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`
- tests: `house/live/tests/test_wake_template.py` asserts the CoS sentence in the handoff step. The `--handoff` command stays.
- acceptance: The CoS seat does not post a handoff. It acks a dev line and sends no message. The four duties stay the only CoS actions.
- next owner: critic
