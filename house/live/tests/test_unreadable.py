"""A 403 or 404 on a per-repo read marks that repo unreadable. A missing branch does not."""
import email.message
import io
import os
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))))


def http_error(code):
    return urllib.error.HTTPError("https://api.github.com/repos/x", code, "no", email.message.Message(), io.BytesIO(b""))


class FF:
    class CT:
        pass


class Unreadable(unittest.TestCase):
    def test_workflow_runs_403_marks_the_repo(self):
        import live_collect as uc
        from datetime import timezone
        FF.CT = timezone.utc

        class Client:
            def rest(self, *args, **kwargs):
                raise http_error(403)

        with tempfile.TemporaryDirectory() as d:
            col = uc.RepoCollector("0xRayAI/0xray-moltbook", Path(d), FF, lambda *_: None)
            col.run(Client(), 0)
            self.assertEqual(col.unreadable, "0xRayAI/0xray-moltbook")

    def test_missing_branch_404_does_not_mark_the_repo(self):
        import live_collect as uc
        from datetime import timezone
        FF.CT = timezone.utc

        class Client:
            def rest(self, *args, **kwargs):
                raise http_error(404)

        with tempfile.TemporaryDirectory() as d:
            col = uc.RepoCollector("0xRayAI/xray", Path(d), FF, lambda *_: None)
            col._denied = None
            col.poll_commits(Client())
            self.assertIsNone(col._denied)
            self.assertIsNone(col.unreadable)
