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


def _collector(repo=REPO):
    ff = type("FF", (), {"CT": ZoneInfo("America/Chicago")})
    tmp = tempfile.TemporaryDirectory()
    col = uc.RepoCollector(repo, Path(tmp.name), ff, lambda *_a: None)
    col._tmp = tmp
    return col


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
    def test_close_then_merged_event_is_a_merge(self):
        """Close is stored while merged_at is still missing. The later merged
        issue event records the merge and drops that close. An older close stays."""
        col = _collector()
        col.st["prs"]["12"] = {"author": "octocat", "state": "open", "base": "main"}
        col.ev[f"{REPO}#12:ev:10"] = {
            "id": f"{REPO}#12:ev:10",
            "kind": "pr_close",
            "number": 12,
            "t_ct": "2026-10-12T11:00:00-05:00",
        }
        page = [_event(21, "closed", WHEN), _event(22, "merged", MERGED_WHEN)]

        class Events:
            def rest(self, path, params=None, etag=None, essential=True):
                return 200, page, "etag", None

        with mock.patch.dict(uc.NODE_LC, {"octocat": "Example"}):
            col.poll_issue_events(Events())

        kinds = sorted(e["kind"] for e in col.ev.values() if e.get("number") == 12)
        self.assertEqual(kinds, ["merged", "pr_close"])
        self.assertIn(f"{REPO}#12:ev:10", col.ev)
        self.assertNotIn(f"{REPO}#12:ev:21", col.ev)
        merged = col.ev[f"{REPO}#12:merged"]
        self.assertEqual(merged["actor"], "octocat")
        self.assertEqual(merged["author"], "octocat")
        self.assertEqual(merged["merged_by"], "octocat")
        self.assertEqual(merged["merge_sha"], "a" * 40)
        self.assertEqual(col.st["prs"]["12"].get("merged_at"), MERGED_WHEN)


if __name__ == "__main__":
    unittest.main()
