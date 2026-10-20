# Packet: stored CI rows labeled Others

## Scope

On every store load, `RepoCollector.__init__` in `house/live/feed/live_collect.py` does two things to a CI event whose actor is outside the node map.

1. Lines 455–457 skip `node(login)` for every CI kind (`workflow_run`, `check_suite`, `check_run`, `ci_pass`, `ci_fail`). A row stored as `from=CI` stays `CI`. A row already stored as `from=Others` stays `Others`, including after that actor is added to `LIVE_NODE_MAP`.
2. Lines 466–474 then delete every remaining row whose `from` or `to` is `Others`. The next `save()` removes it from disk.

That is the drop (issue 453, for rows an earlier load already rewrote to `Others`) and the missed reclaim (issue 459). `from=CI` itself is already left alone. This change only moves a CI-kind row that is stored as `Others`: back to `CI` while the actor is unmapped, and to `node(login)` once that actor is in the map. Any other `from` on a CI kind stays put.

## Files

- `house/live/feed/live_collect.py` — the load relabel above.
- `house/live/tests/fixtures/ci_others_store.json` — one store with the drop row and the reclaim row.
- `house/live/tests/test_collect.py` — load that fixture both ways, then `save()`.
- `house/live/docs/faq.md` — the stored-Others answer names this CI case.
- `house/live/docs/fleet-setup.md` — the `LIVE_NODE_MAP` sentence names the CI reclaim.

## Tests

`tests/fixtures/ci_others_store.json` is one `acme/app` store with two `workflow_run` rows, both `from=Others`:

- `cursor[bot]`, absent from the map, is the drop. Load and `save()` must keep the row and set `from` to `CI`.
- `reclaim-bot[bot]` is the reclaim. With `LIVE_NODE_MAP` sending that login to `forge`, load and `save()` must keep the row and set `from` to `forge`.

Run `python3 -m unittest tests.test_collect.StoredCiOthersReclaim` from `house/live`, then `bash house/live/tests/run_tests.sh`.

## Docs

- `house/live/docs/faq.md`
- `house/live/docs/fleet-setup.md`
