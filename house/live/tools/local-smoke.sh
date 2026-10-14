#!/usr/bin/env bash
# One local run of the board. Boots the server, writes one collector feed, and checks
# a card, its packet, a seat wake, and an ack. No token, no network, no host.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec node --test tests/flow-smoke.test.mjs
