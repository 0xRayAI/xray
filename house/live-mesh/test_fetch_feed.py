"""Tests for fetch_feed.py App-token auth and --watch survival. Stdlib only; network is mocked.
A throwaway RSA key is generated per run (openssl); no real key or token is used.

  cd house/live-mesh && python3 -m unittest -v test_fetch_feed
"""
import http.client
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_feed as ff  # noqa: E402

ENV_TOKEN = "ghp_ENV_FALLBACK_SHOULD_NEVER_BE_USED"
TMP = tempfile.TemporaryDirectory()
KEY = os.path.join(TMP.name, "throwaway.pem")
OUT = os.path.join(TMP.name, "out.json")


def setUpModule():
    subprocess.run(["openssl", "genrsa", "-out", KEY, "2048"], check=True, capture_output=True)


def tearDownModule():
    TMP.cleanup()


class Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def http_err(url, code):
    return urllib.error.HTTPError(url, code, "x", {}, io.BytesIO(b"{}"))


class Net:
    """Fake urlopen: counts mints, records Authorization on API GETs, replays GET status codes."""

    def __init__(self, get_codes=None):
        self.mints, self.auth, self.get_codes = 0, [], list(get_codes or [])

    def __call__(self, req, timeout=None):
        url = req.full_url
        if url.endswith("/access_tokens"):
            assert req.get_method() == "POST"
            assert req.headers["Authorization"].startswith("Bearer ")
            assert req.headers["Authorization"].count(".") == 2  # JWT
            self.mints += 1
            exp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 3600))
            return Resp(json.dumps({"token": f"ghs_minted_{self.mints}", "expires_at": exp}).encode())
        self.auth.append(req.headers.get("Authorization"))
        code = self.get_codes.pop(0) if self.get_codes else 200
        if code != 200:
            raise http_err(url, code)
        return Resp(b'{"ok": true}')


def app():
    return ff.AppToken("123", "456", KEY)


def quiet():
    return mock.patch("sys.stderr", io.StringIO())


class Jwt(unittest.TestCase):
    def test_jwt_shape_and_claims(self):
        j = app().jwt()
        self.assertEqual(len(j.split(".")), 3)
        body = json.loads(ff.base64.urlsafe_b64decode(j.split(".")[1] + "=="))
        self.assertEqual(body["iss"], "123")
        self.assertLessEqual(body["exp"] - body["iat"], 600)


class Remint55(unittest.TestCase):
    def test_stale_boundaries(self):
        a, now = app(), 1_000_000.0
        self.assertTrue(a.stale(now))  # no token yet
        a.token, a.minted_at, a.expires_at = "t", now - 54 * 60, now + 3600
        self.assertFalse(a.stale(now))
        a.minted_at = now - 55 * 60
        self.assertTrue(a.stale(now))
        a.minted_at, a.expires_at = now - 60, now + 299  # <5 min to expires_at
        self.assertTrue(a.stale(now))

    def test_get_remints_at_55_min(self):
        net = Net()
        with mock.patch("urllib.request.urlopen", net), quiet():
            gh = ff.GitHub(None, app())
            gh.get("/x"); self.assertEqual(net.mints, 1)  # first use mints
            gh.get("/x"); self.assertEqual(net.mints, 1)  # fresh: no mint
            gh.app.minted_at -= 55 * 60
            gh.get("/x"); self.assertEqual(net.mints, 2)
        self.assertEqual(net.auth[-1], "Bearer ghs_minted_2")


class Remint401(unittest.TestCase):
    def test_one_remint_on_401_then_retry_succeeds(self):
        net = Net(get_codes=[200, 401, 200])
        with mock.patch("urllib.request.urlopen", net), quiet():
            gh = ff.GitHub(None, app()); gh.get("/x")
            gh.app.minted_at -= 120
            self.assertEqual(gh.get("/x"), {"ok": True})
        self.assertEqual(net.mints, 2)
        self.assertEqual(net.auth, ["Bearer ghs_minted_1", "Bearer ghs_minted_1", "Bearer ghs_minted_2"])

    def test_persistent_401_mints_once_then_stops(self):
        net = Net(get_codes=[200, 401, 401, 401, 401])
        with mock.patch("urllib.request.urlopen", net), quiet():
            gh = ff.GitHub(None, app()); gh.get("/x")
            gh.app.minted_at -= 120
            with self.assertRaises(urllib.error.HTTPError):
                gh.get("/x")  # 401 -> mint -> 401 -> raise
            for _ in range(2):  # same minute: no further mint
                with self.assertRaises(urllib.error.HTTPError):
                    gh.get("/x")
        self.assertEqual(net.mints, 2)

    def test_401_on_fresh_token_does_not_mint(self):
        net = Net(get_codes=[401])
        with mock.patch("urllib.request.urlopen", net), quiet():
            with self.assertRaises(urllib.error.HTTPError):
                ff.GitHub(None, app()).get("/x")
        self.assertEqual(net.mints, 1)  # only the initial mint


class NoFallback(unittest.TestCase):
    def test_partial_app_env_fails_loudly(self):
        with mock.patch.dict(os.environ, {"GITHUB_APP_ID": "1"}, clear=True):
            with self.assertRaises(SystemExit):
                ff.AppToken.from_env()
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(ff.AppToken.from_env())

    def test_env_tokens_ignored_when_mint_fails(self):
        env = {"GITHUB_TOKEN": ENV_TOKEN, "GH_TOKEN": ENV_TOKEN, "GITHUB_APP_ID": "123",
               "GITHUB_APP_INSTALLATION_ID": "456", "GITHUB_APP_PRIVATE_KEY_PATH": "/nonexistent.pem"}
        seen, calls, real_run = {}, [], ff.subprocess.run

        def fake_build(args, gh):
            seen["token"] = gh.token
            gh.get("/x")  # forces a mint with a bad key

        def spy_run(cmd, *a, **k):
            calls.append(cmd[0])
            return real_run(cmd, *a, **k)

        with mock.patch.dict(os.environ, env), mock.patch.object(ff, "build", fake_build), \
                mock.patch.object(ff.subprocess, "run", spy_run), mock.patch("urllib.request.urlopen", Net()), \
                mock.patch.object(sys, "argv", ["fetch_feed.py", "--out", OUT]), quiet():
            self.assertEqual(ff.main(), 1)  # MintError -> keep last feed, exit 1 (one pass)
        self.assertIsNone(seen["token"])
        self.assertEqual(set(calls), {"openssl"})  # never gh

    def test_env_token_never_sent_in_app_mode(self):
        env = {"GITHUB_TOKEN": ENV_TOKEN, "GH_TOKEN": ENV_TOKEN, "GITHUB_APP_ID": "123",
               "GITHUB_APP_INSTALLATION_ID": "456", "GITHUB_APP_PRIVATE_KEY_PATH": KEY}
        net = Net()
        with mock.patch.dict(os.environ, env), mock.patch("urllib.request.urlopen", net), \
                mock.patch.object(ff, "build", lambda a, gh: (gh.get("/x"), {"event_count": 0})[1]), \
                mock.patch.object(ff, "write", lambda f, o: 0), \
                mock.patch.object(sys, "argv", ["fetch_feed.py", "--out", OUT]), quiet():
            self.assertEqual(ff.main(), 0)
        self.assertTrue(net.auth and all(ENV_TOKEN not in (h or "") for h in net.auth))


class WatchSurvives(unittest.TestCase):
    def run_watch(self, errors):
        """Run main() --watch with build() raising each error in turn, then one ok pass, then stop."""
        seq, hits = list(errors) + ["ok", KeyboardInterrupt], []

        def fake_build(args, gh):
            item = seq.pop(0)
            hits.append(item)
            if item == "ok":
                return {"event_count": 0}
            raise item

        buf = io.StringIO()
        with mock.patch.object(ff, "build", fake_build), mock.patch.object(ff, "write", lambda f, o: 0), \
                mock.patch("time.sleep", lambda s: None), mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(sys, "argv", ["fetch_feed.py", "--out", OUT, "--watch", "1"]), \
                mock.patch("sys.stderr", buf):
            with self.assertRaises(KeyboardInterrupt):
                ff.main()
        return hits, buf.getvalue()

    def test_urlerror_and_timeout(self):
        hits, _ = self.run_watch([urllib.error.URLError("dns"), TimeoutError()])
        self.assertEqual(hits[-2:], ["ok", KeyboardInterrupt])

    def test_mint_error(self):
        hits, log = self.run_watch([ff.MintError("access_tokens HTTP 500")])
        self.assertEqual(hits[-2:], ["ok", KeyboardInterrupt])
        self.assertIn("no fallback token", log)

    def test_remote_disconnected_does_not_exit_watch(self):
        """21:04 CT Oct 5: RemoteDisconnected from gh._get <- deploy_events killed --watch."""
        hits, log = self.run_watch([http.client.RemoteDisconnected("Remote end closed connection")])
        self.assertEqual(hits[-2:], ["ok", KeyboardInterrupt])
        self.assertIn("network error (RemoteDisconnected); keeping last feed", log)

    def test_other_dropped_connection_errors(self):
        hits, _ = self.run_watch([http.client.IncompleteRead(b""), ConnectionResetError(), OSError("x")])
        self.assertEqual(hits[-2:], ["ok", KeyboardInterrupt])

    def test_remote_disconnected_from_real_get_path(self):
        """Through GitHub.get (not a mocked build): urlopen raising RemoteDisconnected is survived."""
        n = {"i": 0}

        def flaky(req, timeout=None):
            n["i"] += 1
            if n["i"] == 1:
                raise http.client.RemoteDisconnected("Remote end closed connection")
            return Resp(b"[]")

        def build(args, gh):
            gh.get("/repos/0xRayAI/muse-house/deployments")
            if n["i"] >= 2:
                raise KeyboardInterrupt
            return {"event_count": 0}

        with mock.patch("urllib.request.urlopen", flaky), mock.patch.object(ff, "build", build), \
                mock.patch("time.sleep", lambda s: None), mock.patch.dict(os.environ, {}, clear=True), \
                mock.patch.object(sys, "argv", ["fetch_feed.py", "--out", OUT, "--watch", "1"]), quiet():
            with self.assertRaises(KeyboardInterrupt):
                ff.main()
        self.assertEqual(n["i"], 2)  # second poll ran after the dropped connection

    def test_probe_dropped_connection_is_unreachable(self):
        def drop(req, timeout=None):
            raise http.client.RemoteDisconnected("x")
        with mock.patch("urllib.request.urlopen", drop):
            self.assertEqual(ff.probe("https://example.invalid/health"), (False, "unreachable"))

    def test_mint_dropped_connection_is_minterror(self):
        def drop(req, timeout=None):
            raise http.client.IncompleteRead(b"")
        with mock.patch("urllib.request.urlopen", drop):
            with self.assertRaises(ff.MintError):
                app().mint()


class Secrets(unittest.TestCase):
    def test_no_token_or_jwt_in_logs(self):
        buf, net = io.StringIO(), Net(get_codes=[200, 401, 200])
        with mock.patch("sys.stderr", buf), mock.patch("urllib.request.urlopen", net):
            gh = ff.GitHub(None, app()); gh.get("/x"); gh.app.minted_at -= 120; gh.get("/x")
        out = buf.getvalue()
        for s in ("ghs_minted", "Bearer", "BEGIN"):
            self.assertNotIn(s, out)

    def test_bad_key_error_does_not_echo_key_or_stderr(self):
        with self.assertRaises(ff.MintError) as cm:
            ff.AppToken("1", "2", "/nonexistent.pem").jwt()
        self.assertEqual(str(cm.exception), "JWT sign failed (CalledProcessError)")
        self.assertIsNone(cm.exception.__cause__)

    def test_no_gh_cli_or_personal_credentials_in_source(self):
        src = Path(ff.__file__).read_text()
        for bad in ("gh auth", ".config/gh", "hosts.yml"):
            self.assertNotIn(bad, src)
        self.assertEqual(src.count("subprocess.run("), 1)  # the openssl JWT sign only
        self.assertIn('subprocess.run(["openssl"', src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
