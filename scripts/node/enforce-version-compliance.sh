#!/bin/bash
# Foundry mill: docs + version SSOT. Not UVM.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
exec node scripts/foundry/validate-release-docs.mjs "$@"
