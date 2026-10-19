# Wave schedule

The board is Bifrost. `WAVEBOARD.md` is retired. Seats read Bifrost cards.

A wave is one stretch of cards in `bifrost-waves.json`, in rank order. Replace that list with this fleet's ranked backlog. When a wave's last card is closed or merged, Bifrost raises one card titled `plan next wave` for the CoS seat. The card carries the ranked backlog of waves that are still open.

The tripwire flags that card `nothing carded` when the trip window passes and no new card appeared.

Load a seed with `node house/live/tools/load-wave-seed.mjs`. That prints the cards and does not post. `--apply` posts them to `LIVE_URL` and refuses the production board unless `BIFROST_SEED_APPLY=1`.
