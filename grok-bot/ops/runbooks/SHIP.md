# Ship runbook (publisher)

> **Text pending from forge (shipping seat).** Forge is writing this from its real ship steps, with a script any
> fleet's shipping seat can run; this stub only holds the place.

Outline: mint the seat App token (never printed or stored), merge on green CI + reviewer PASS (+ gated OP-PROC yes),
deploy once (`house/live/app/deploy.sh`), check `/healthz`, roll back first on failure, post the receipt, then hand the
reviewer the live pass ([CRITIC.md](CRITIC.md)).
