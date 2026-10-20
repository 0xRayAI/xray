"""A pull updated in the same second as the cursor is replayed.

put() is idempotent. Stopping on <= skips that pull, and the page-1 ETag
then answers 304 forever. The compare is an instant, not the timestamp text.
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
SAME = "2026-10-14T17:00:00+00:00"
FLEET = {"octocat": "Example", "merger": "Example"}


class Page:
    def __init__(self, body):
        self.body = body
        self.token = "t"

    def rest(self, path, params=None, etag=None, essential=True):
        if etag == "page-1":
            return 304, None, etag, None
        return 200, self.body, "page-1", None


class PullsCursorBoundary(unittest.TestCase):
    def _collector(self, repo=REPO):
        ff = type("FF", (), {"CT": ZoneInfo("America/Chicago")})
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        col = uc.RepoCollector(repo, Path(tmp.name), ff, lambda *_a: None)
        col._tmp = tmp
        return col

    def test_pull_sharing_the_cursor_second_is_replayed(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        pull = _pull()

        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
            self.assertEqual(col.st["etags"].get("pulls"), "page-1")
            col.poll_pulls(Page([pull]))
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertEqual(col.ev[f"{REPO}#7:open"]["actor"], "octocat")
        self.assertEqual(col.st["cur"]["pulls"], WHEN)

    def test_cursor_moves_to_newest_updated_at(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = "2026-10-14T16:00:00Z"
        newer = "2026-10-14T18:00:00Z"
        pull = _pull()
        pull["updated_at"] = newer
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertEqual(col.st["cur"]["pulls"], newer)

    def test_plus_offset_same_instant_is_not_before_z(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        pull = _pull()
        pull["updated_at"] = SAME
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertEqual(col.st["cur"]["pulls"], WHEN)

    def test_later_offset_is_not_skipped(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        later = "2026-10-14T17:00:00-05:00"
        pull = _pull()
        pull["updated_at"] = later
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertEqual(col.st["cur"]["pulls"], later)

    def test_issue_comment_review_and_push_share_the_cursor_second(self):
        col = self._collector()
        col.st["bf"]["comments:critic3"] = True
        col.st["cur"]["issues"] = WHEN
        col.st["cur"]["comments"] = WHEN
        col.st["cur"]["rcomments"] = WHEN
        col.st["cur"]["pushes"] = WHEN
        issue = {
            "number": 3, "updated_at": SAME, "created_at": "2026-10-14T12:00:00Z",
            "html_url": f"https://github.com/{REPO}/issues/3", "title": "latch",
            "user": {"login": "octocat"}, "state": "open", "body": "", "labels": [],
        }
        comment = {
            "id": 9, "updated_at": SAME, "created_at": "2026-10-14T12:00:00Z",
            "issue_url": f"https://api.github.com/repos/{REPO}/issues/3",
            "html_url": f"https://github.com/{REPO}/issues/3#issuecomment-9",
            "user": {"login": "octocat"}, "body": "hi",
        }
        review = {
            "id": 4, "updated_at": SAME, "created_at": "2026-10-14T12:00:00Z",
            "pull_request_url": f"https://api.github.com/repos/{REPO}/pulls/7",
            "html_url": f"https://github.com/{REPO}/pull/7#discussion_r4",
            "user": {"login": "octocat"}, "body": "nit",
        }
        push = {
            "id": "11", "type": "PushEvent", "created_at": SAME,
            "actor": {"login": "octocat"},
            "payload": {"ref": "refs/heads/main", "head": "d" * 40,
                        "commits": [{"sha": "d" * 40, "message": "latch"}]},
        }
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_issues(Page([issue]))
            col.poll_comments(Page([comment]))
            col.poll_review_comments(Page([review]))
            col.poll_pushes(Page([push]))
            self.assertEqual(col.st["etags"].get("issues"), "page-1")
            col.poll_issues(Page([issue]))
            col.poll_comments(Page([comment]))
            col.poll_review_comments(Page([review]))
            col.poll_pushes(Page([push]))
        self.assertIn(f"{REPO}!3:open", col.ev)
        self.assertIn(f"{REPO}!3:comment:9", col.ev)
        self.assertIn(f"{REPO}#7:rcomment:4", col.ev)
        self.assertIn(f"{REPO}:push:11", col.ev)

    def test_tie_past_page_cap_does_not_save_etag(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        first = _pull()
        tail = _pull()
        tail["number"] = 8
        tail["html_url"] = f"https://github.com/{REPO}/pull/8"
        tail["head"] = {"sha": "e" * 40}
        nxt = "https://example.test/page-2"

        class C:
            token = "t"

            def rest(self, path, params=None, etag=None, essential=True):
                if path == nxt:
                    return 200, [tail], None, None
                return 200, [first], "page-1", nxt

        real = uc.RepoCollector.paged

        def capped(self, c, path, params, key, stop=None, essential=True, max_pages=400):
            return real(self, c, path, params, key, stop=stop, essential=essential, max_pages=1)

        with mock.patch.object(uc.RepoCollector, "paged", capped), mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(C())
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertNotIn(f"{REPO}#8:open", col.ev)
        self.assertNotIn("pulls", col.st["etags"])
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(C())
        self.assertIn(f"{REPO}#8:open", col.ev)

    def test_capped_tie_restarts_at_page_one_and_leaves_the_tail(self):
        """Two polls that both hit the cap restart at page 1. The tail stays out until a poll fits."""
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        first = _pull()
        tail = _pull()
        tail["number"] = 8
        tail["html_url"] = f"https://github.com/{REPO}/pull/8"
        tail["head"] = {"sha": "e" * 40}
        nxt = "https://example.test/page-2"
        seen = []

        class C:
            token = "t"

            def rest(self, path, params=None, etag=None, essential=True):
                seen.append(path)
                if path == nxt:
                    return 200, [tail], None, None
                return 200, [first], "page-1", nxt

        real = uc.RepoCollector.paged

        def capped(self, c, path, params, key, stop=None, essential=True, max_pages=400):
            return real(self, c, path, params, key, stop=stop, essential=essential, max_pages=1)

        with mock.patch.object(uc.RepoCollector, "paged", capped), mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(C())
            col.poll_pulls(C())
        self.assertEqual(seen, [f"/repos/{REPO}/pulls", f"/repos/{REPO}/pulls"])
        self.assertIn(f"{REPO}#7:open", col.ev)
        self.assertNotIn(f"{REPO}#8:open", col.ev)
        self.assertNotIn("pulls", col.st["etags"])

    def test_same_second_head_change_sets_enrich(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["bf"]["prs:done"] = True
        col.st["cur"]["pulls"] = WHEN
        col.st["prs"]["7"] = {
            "author": "octocat", "updated_at": WHEN, "head": "a" * 40, "state": "open", "base": "main",
        }
        pull = _pull()
        pull["head"] = {"sha": "c" * 40}
        pull["updated_at"] = WHEN
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertIn(f"{REPO}#7:commit:{'c' * 40}", col.ev)
        self.assertTrue(col.st.get("enrich", {}).get("7"))

    def test_merged_pull_sharing_the_cursor_second_is_replayed(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = WHEN
        pull = _pull()
        pull["merged_at"] = WHEN
        pull["state"] = "closed"
        pull["merged_by"] = {"login": "merger"}
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertIn(f"{REPO}#7:merged", col.ev)
        self.assertIn(f"{REPO}#7:open", col.ev)

    def test_merged_day_rewinds_a_fresh_cursor_once(self):
        col = self._collector()
        col.st["bf"]["author:seat"] = True
        col.st["cur"]["pulls"] = "2099-01-01T00:00:00Z"
        pull = _pull()
        pull["updated_at"] = "2026-10-20T06:00:00Z"
        pull["merged_at"] = "2026-10-20T06:00:00Z"
        pull["state"] = "closed"
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertTrue(col.st["bf"].get("merged:day"))
        self.assertIn(f"{REPO}#7:merged", col.ev)
        self.assertLess(col.st["cur"]["pulls"], "2099-01-01T00:00:00Z")
        etag = col.st["etags"].get("pulls")
        with mock.patch.dict(uc.NODE_LC, FLEET):
            col.poll_pulls(Page([pull]))
        self.assertEqual(col.st["etags"].get("pulls"), etag)


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


if __name__ == "__main__":
    unittest.main()
