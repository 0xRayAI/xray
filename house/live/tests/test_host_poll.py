"""Railway deploy poll: the token comes from the environment, and the file it writes has no secret."""
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "feed"))
import host_poll  # noqa: E402


class HostPoll(unittest.TestCase):
    def test_source_has_no_token_or_project_id(self):
        rail = (ROOT / "feed" / "host_poll.py").read_text()
        server = (ROOT / "app" / "server.mjs").read_text()
        mesh = (ROOT / "feed" / "live_mesh.py").read_text()
        for text in (rail, server, mesh):
            self.assertNotIn("ghp_", text)
            self.assertNotIn("github_pat_", text)
            self.assertNotRegex(text, r"ghs_[A-Za-z0-9]{8}")
        self.assertIn('os.environ.get("RAILWAY_TOKEN"', rail)
        self.assertIn("env.RAILWAY_TOKEN = railTok", server)
        self.assertIn("host_poll.poll()", mesh)
        self.assertNotRegex(rail, r"https://github.com/(?!0xRayAI/)")

    def test_unset_token_does_not_call_out(self):
        saved = os.environ.pop("RAILWAY_TOKEN", None)
        try:
            def fetch(*_a):
                raise AssertionError("fetch called without a token")
            self.assertEqual(host_poll.poll(fetch=fetch), 0)
        finally:
            if saved is not None:
                os.environ["RAILWAY_TOKEN"] = saved

    def test_token_from_env_is_not_stored(self):
        token = "railway-test-token-value"
        keys = ("RAILWAY_TOKEN", "RAILWAY_PROJECTS", "RAILWAY_POLL_S", "MESH_RUN", "LIVE_RAILWAY_FILE")
        saved = {k: os.environ.get(k) for k in keys}
        with tempfile.TemporaryDirectory() as d:
            os.environ["RAILWAY_TOKEN"] = token
            os.environ["MESH_RUN"] = d
            os.environ.pop("LIVE_RAILWAY_FILE", None)
            os.environ["RAILWAY_POLL_S"] = "180"
            os.environ["RAILWAY_PROJECTS"] = json.dumps([{
                "project": "example-board", "projectId": "proj-1", "service": "burst-live",
                "environments": ["production"],
            }])
            calls = []

            def fetch(url, body, tok):
                calls.append((url, tok))
                self.assertEqual(tok, token)
                self.assertNotIn(token.encode(), body)
                return {"data": {"project": {"services": {"edges": [{"node": {
                    "name": "burst-live",
                    "deployments": {"edges": [{"node": {
                        "id": "abcdef1234567890",
                        "status": "SUCCESS",
                        "createdAt": "2026-10-14T15:00:00Z",
                        "meta": {"commitHash": "deadbeefcafe", "message": "do not keep"},
                        "environment": {"name": "production"},
                    }}]},
                }}]}}}}

            now = time.time()
            try:
                n = host_poll.poll(fetch=fetch, now=now)
                self.assertEqual(n, 1)
                blob = (Path(d) / "feed" / "railway-deploys.json").read_text()
                self.assertNotIn(token, blob)
                self.assertNotIn("do not keep", blob)
                row = json.loads(blob)["deploys"][0]
                self.assertEqual(row["id"], "abcdef12")
                self.assertEqual(row["cli"], False)
                self.assertEqual(row["sha"], "deadbeefcafe")
                self.assertEqual(row["service"], "burst-live")
                self.assertEqual(set(row), {"id", "project", "service", "env", "status", "created", "cli", "sha"})
                self.assertEqual(host_poll.poll(fetch=fetch, now=now), 0)
                self.assertEqual(len(calls), 1)
            finally:
                for k, v in saved.items():
                    if v is None:
                        os.environ.pop(k, None)
                    else:
                        os.environ[k] = v

    def test_project_token_falls_back_to_project_header(self):
        import io
        from unittest import mock
        seen = []

        class R(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def urlopen(req, timeout=None):
            hdr = {k.lower(): v for k, v in req.header_items()}
            seen.append("project" if "project-access-token" in hdr else "bearer")
            if "project-access-token" in hdr:
                return R(json.dumps({"data": {"project": {"name": "x"}}}).encode())
            return R(json.dumps({"errors": [{"message": "Not Authorized"}], "data": None}).encode())

        with mock.patch.object(host_poll.urllib.request, "urlopen", urlopen):
            out = host_poll._gql("tok", "q", {})
        self.assertEqual(seen, ["bearer", "project"])
        self.assertEqual(out["data"]["project"]["name"], "x")


if __name__ == "__main__":
    unittest.main()
