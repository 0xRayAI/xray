# Put published Repertoire 0.2.5 inside 0xray

This is the working plan. If chat is compacted, read Station, then this file, then continue. Do not start a different job.

## What this is

Copy the published npm package `@0xray/repertoire@0.2.5` into `0xray`’s `vendor/@0xray/repertoire/` folder. Make that the copy `0xray` loads. Then publish a new `0xray` so installs get that copy.

**Repertoire is preferred.** `0xray` still boots if Repertoire is missing or explicitly turned off — Station then holds the compact ticket. That is fallback, not the preferred brain. Dest is named laws. This cut stops `0xray` from running an older leftover copy.

## What this is not

- Not required to start `0xray`
- Not a claim that the 20-repo brain is done
- Not a new MCP or skill
- Not a deploy onto hangar apps (website, blips, zigzag, clearing)
- Not republishing Repertoire 0.2.5 (it is already live)
- Not using a neighboring git checkout as the source of truth

## Why the current tree lies

There are three copies:

1. `vendor/@0xray/repertoire` — still 0.2.0 (what the `0xray` tarball ships)
2. `node_modules/@0xray/repertoire` — leftover 0.2.2 (what this machine loads)
3. The sibling repo `/agent/repos/repertoire` — 0.2.5 (what heat reads when a file is missing)

The wear script refuses to replace any usable Repertoire already in `node_modules`. That is why 0.2.2 stays. The boot file-finder then reads overlay files from whichever tree has them, so the project list looks current while the code that runs is old.

## Off switch (keep this)

In `.xray/features.json` / `xray/features.json`:

```json
"memory_routing": {
  "enabled": false,
  "provider": "repertoire"
}
```

When that is set: do not copy seed files, do not require the package, Station is the memory. Missing vendor must not crash boot.

## Steps

1. Put this plan on disk. Read it back. Thin Station points here.
2. Branch from current `main` (`0xray@4.0.18`). Do not pile this onto the cleanup branch.
3. Download `@0xray/repertoire@0.2.5` from npm (`npm pack`). Replace `vendor/@0xray/repertoire/` with that exact tree. Confirm `package.json` version is 0.2.5 and `data/stack-overlay.json` + `data/subject-overlay.json` exist.
4. Change wear so an older leftover in `node_modules` is replaced by vendor. Keep a newer user-installed copy (someone who installed Repertoire themselves). Same real path as vendor is already worn — leave it.
5. Change the boot file-finder order to: worn `node_modules`, then `vendor`, then a sibling checkout last. Do not prefer a sibling file over the copy `0xray` ships.
6. Skip seed copy and matching when the off switch is on.
7. Wear this machine: vendor 0.2.5, `node_modules` 0.2.5, same real path. Prove with `package.json` version reads. Prove `0xray` still boots with the off switch.
8. Update tests that still expect vendor 0.2.0.
9. Commit, push, open a PR.
10. Publish a new `0xray` only after this machine is wearing 0.2.5 and tests pass. Use `npm publish --access public` in a live terminal and paste the clickable login URL. Do not ask for a six-digit code in chat. Poll `npm view 0xray version` until the new version is live. Install once fresh and once as an upgrade and confirm each has vendor 0.2.5.

## After a compact

1. Read `.xray/state/STATION.md` — same cloud id, this ticket.
2. Read this file.
3. Read `.xray/state/NOTES.md` pickup line.
4. Continue the current step. Do not restart.

## Done when

- `vendor/@0xray/repertoire/package.json` is 0.2.5
- This machine’s `node_modules/@0xray/repertoire/package.json` is 0.2.5
- Those two are the same copy (link or match)
- Off switch still boots `0xray`
- A new `0xray` is live on npm and a fresh install contains 0.2.5
