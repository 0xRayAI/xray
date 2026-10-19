"""A pull updated in the same second as the cursor is replayed.

put() is idempotent. Stopping on <= skips that pull, and the page-1 ETag
then answers 304 forever.
"""
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

REPO = "example-org/gadgets"
WHEN = "2026-10-14T17:00:00Z"


def _collector(repo=REPO):
    ff = type("FF", (), {"CT": ZoneInfo("America/Chicago")})
    tmp = tempfile.TemporaryDirectory()
    col = uc.RepoCollector(repo, Path(tmp.name), ff, lambda *_a: None)
    col._tmp = tmp
    return col


def _pull():
    return {
        "number": 7,
        "user": {"login": "octocat"},
        "updated_at": WHEN,
        "created_at": "2026-10-14T12:00:00Z",
        "html_url": f"https://github.com/{REPO}/pull/7",
        "title": "tighten the latch",
        "head": {"sha": "b" * 40},
        "base": {"ref": "main"},
        "state": "open",
        "merged_at": None,
        "draft": False,
        "body": "",
        "labels": [],
    }


class PullsCursorBoundary(unittest.TestCase):
    def test_pull_sharing_the_cursor_second_is_replayed(self):
        col = _collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        pull = _pull()

        class C:
            token = "t"

            def rest(self, path, params=None, etag=None, essential=True):
                if etag == "page-1":
                    return 304, None, etag, None
                return 200, [pull], "page-1", None

        with mock.patch.dict(uc.NODE_LC, {"octocat": "Example"}):
            col.poll_pulls(C())
            self.assertEqual(col.st["etags"].get("pulls"), "page-1")
            col.poll_pulls(C())
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertEqual(col.ev[f"{REPO}#7:open"]["actor"], "octocat")
        self.assertEqual(col.st["cur"]["pulls"], WHEN)


if __name__ == "__main__":
    unittest.main()
