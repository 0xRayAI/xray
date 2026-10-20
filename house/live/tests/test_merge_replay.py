"""A merged pull is not counted closed-unmerged when the merge issue event
arrives before pulls have stored merged_at."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
FEED_DIR = Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))
sys.path.insert(0, str(FEED_DIR))
sys.dont_write_bytecode = True
import live_collect as uc  # noqa: E402

REPO = "example-org/widgets"
WHEN = "2026-10-14T16:00:00Z"
MERGED_WHEN = "2026-10-14T16:00:01Z"
FLEET = {"octocat": "Example", "merger": "Example"}


class Events:
    def __init__(self, page):
        self.page = page

    def rest(self, path, params=None, etag=None, essential=True):
        return 200, self.page, "etag", None


def _event(eid, name, when):
    return {
        "id": eid,
        "event": name,
        "created_at": when,
        "actor": {"login": "octocat"},
        "commit_id": "a" * 40 if name == "merged" else None,
        "issue": {
            "number": 12,
            "pull_request": {},
            "html_url": f"https://github.com/{REPO}/pull/12",
        },
    }


class MergedEventRace(unittest.TestCase):
    def _collector(self, repo=REPO):
        ff = type("FF", (), {"CT": ZoneInfo("America/Chicago")})
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        col = uc.RepoCollector(repo, Path(tmp.name), ff, lambda *_a: None)
        col._tmp = tmp
        return col

    def _poll(self, col, page):
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_issue_events(Events(page))

    def test_close_then_merged_event_is_a_merge(self):
        """Close is stored while merged_at is still missing. The later merged
        issue event records the merge and drops that close. An older close stays."""
        col = self._collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        col.ev[f"{REPO}#12:ev:10"] = {
            "id": f"{REPO}#12:ev:10",
            "kind": "pr_close",
            "number": 12,
            "t_ct": "2026-10-12T11:00:00-05:00",
        }
        self._poll(col, [_event(21, "closed", WHEN), _event(22, "merged", MERGED_WHEN)])

        kinds = sorted(e["kind"] for e in col.ev.values() if e.get("number") == 12)
        self.assertEqual(kinds, ["merged", "pr_close", "pr_open"])
        self.assertIn(f"{REPO}#12:ev:10", col.ev)
        self.assertNotIn(f"{REPO}#12:ev:21", col.ev)
        self.assertIn(f"{REPO}#12:open", col.ev)
        merged = col.ev[f"{REPO}#12:merged"]
        self.assertEqual(merged["actor"], "octocat")
        self.assertEqual(merged["author"], "octocat")
        self.assertEqual(merged["merged_by"], "octocat")
        self.assertEqual(merged["merge_sha"], "a" * 40)
        self.assertEqual(col.st["prs"]["12"].get("merged_at"), MERGED_WHEN)

    def test_merged_event_writes_open_card(self):
        col = self._collector()
        col.st["need_merger"] = {"12": 1}
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        self._poll(col, [_event(22, "merged", MERGED_WHEN)])
        self.assertIn(f"{REPO}#12:open", col.ev)
        self.assertIn(f"{REPO}#12:merged", col.ev)
        self.assertNotIn("12", col.st.get("need_merger") or {})

    def test_merge_then_close_is_not_an_unmerged_close(self):
        col = self._collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        self._poll(col, [_event(22, "merged", MERGED_WHEN), _event(23, "closed", MERGED_WHEN)])
        self.assertIn(f"{REPO}#12:merged", col.ev)
        self.assertIn(f"{REPO}#12:open", col.ev)
        self.assertNotIn(f"{REPO}#12:ev:23", col.ev)

    def test_replay_of_the_merged_event_keeps_one_card(self):
        col = self._collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        page = [_event(22, "merged", MERGED_WHEN)]
        self._poll(col, page)
        self._poll(col, page)
        merged = [e["id"] for e in col.ev.values() if e.get("kind") == "merged"]
        self.assertEqual(merged, [f"{REPO}#12:merged"])
        self.assertIn(f"{REPO}#12:open", col.ev)

    def test_restart_that_saw_only_the_merge(self):
        col = self._collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        self._poll(col, [_event(22, "merged", MERGED_WHEN)])
        self.assertIn(f"{REPO}#12:open", col.ev)
        col.save()
        col2 = uc.RepoCollector(REPO, Path(col._tmp.name), col.ff, lambda *_a: None)
        self.assertIn(f"{REPO}#12:merged", col2.ev)
        self.assertNotIn(f"{REPO}#12:ev:30", col2.ev)
        self._poll(col2, [_event(30, "closed", WHEN)])
        self.assertNotIn(f"{REPO}#12:ev:30", col2.ev)
        self.assertIn(f"{REPO}#12:merged", col2.ev)
        self.assertIn(f"{REPO}#12:open", col2.ev)

    def test_close_before_reopen_stays_inside_the_merge_window(self):
        """A close, a reopen, and a merge inside 30s. The earlier close is history.
        The close at the merge instant is the echo and drops."""
        col = self._collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        close_at = "2026-10-14T16:00:00Z"
        reopen_at = "2026-10-14T16:00:10Z"
        merge_at = "2026-10-14T16:00:20Z"
        self._poll(col, [
            _event(21, "closed", close_at),
            _event(22, "reopened", reopen_at),
            _event(23, "closed", merge_at),
            _event(24, "merged", merge_at),
        ])
        self.assertIn(f"{REPO}#12:ev:21", col.ev)
        self.assertNotIn(f"{REPO}#12:ev:23", col.ev)
        self.assertIn(f"{REPO}#12:merged", col.ev)
        self.assertEqual(col.ev[f"{REPO}#12:ev:22"]["kind"], "pr_reopen")

    def test_bad_created_at_still_stamps_and_the_batch_continues(self):
        col = self._collector()
        col.st["bf"]["merged_by_pull"] = True
        col.st["need_merger"] = {"7": 1, "8": 1}
        for n in (7, 8):
            col.ev[f"{REPO}#{n}:merged"] = {
                "id": f"{REPO}#{n}:merged", "kind": "merged", "number": n,
                "t_ct": "2026-10-14T11:00:01-05:00",
            }

        class C:
            token = "t"

            def rest(self, path, params=None, etag=None, essential=True):
                n = int(str(path).rstrip("/").rsplit("/", 1)[-1])
                return 200, {
                    "number": n,
                    "created_at": "bogusZ" if n == 7 else WHEN,
                    "title": "latch",
                    "merged_by": {"login": "merger"},
                    "user": {"login": "octocat"},
                    "state": "closed",
                }, None, None

        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.backfill_mergers(C())
        self.assertEqual(col.ev[f"{REPO}#7:merged"]["merged_by"], "merger")
        self.assertEqual(col.ev[f"{REPO}#8:merged"]["merged_by"], "merger")
        self.assertNotIn(f"{REPO}#7:open", col.ev)
        self.assertIn(f"{REPO}#8:open", col.ev)


if __name__ == "__main__":
    unittest.main()
