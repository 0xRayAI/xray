# Wave schedule

When `LIVE_URL` is set, the board is Bifrost and this schedule runs there. When `LIVE_URL` is unset, open cards stay in `WAVEBOARD.md`.

A wave is one stretch of cards in `house/bifrost-waves.json`, in rank order. The template ships with an empty `waves` array. Fill it with this house's ranked backlog. `house init` copies that empty file. It does not copy another fleet's issues.

The server reads `house/bifrost-waves.json`. `BIFROST_WAVE_SEED` overrides it. The live image also bundles `house/live/app/bifrost-waves.json` so boot still finds a seed.

When a real wave's last card is closed or merged, Bifrost raises one card titled `plan next wave` for the CoS seat. The card names the next open wave. One wave is on the board at a time. A card with no GitHub number is closed.

The window is a Chicago cron (`window` in the seed, default `0 9 * * 1`, Monday 09:00 America/Chicago). The due time is stored on the card. A restart does not re-arm it. Weekly burn at 75% (`BIFROST_WEEKLY_BURN` of `0.75` or `75`) keeps the card quiet. The tripwire flags that card `nothing carded` when the window passes and no new card appeared.

Load a seed with `node house/live/tools/load-wave-seed.mjs`. That prints the cards and does not post. `--apply` posts the seed to `LIVE_URL`. The server puts only the current wave on the board. It refuses the production board unless `BIFROST_SEED_APPLY=1`.
