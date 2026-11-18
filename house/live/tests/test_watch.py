"""bin/live-inbox-watch: bash syntax, plist parses, prints asks, 401 says 'key not registered', never acks or prints the key.
Also: the /live-events.json methodology note carries no template brand."""
import os, plistlib, subprocess, tempfile, unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
W = LIVE / "bin" / "live-inbox-watch"


class Watch(unittest.TestCase):
    def run_with(self, body):
        with tempfile.TemporaryDirectory() as d:
            fake = Path(d) / "live-inbox"; log = Path(d) / "calls"
            fake.write_text("#!/usr/bin/env bash\necho \"$@\" >> %s\n%s\n" % (log, body)); fake.chmod(0o755)
            env = {"PATH": os.environ["PATH"], "HOME": d, "LIVE_INBOX": str(fake), "LIVE_WATCH_ONCE": "1"}
            r = subprocess.run(["bash", str(W), "arch1", "60"], env=env, capture_output=True, text=True)
            return r, log.read_text()

    def test_syntax_exec_plist(self):
        subprocess.run(["bash", "-n", str(W)], check=True)
        self.assertTrue(os.access(W, os.X_OK))
        pl = plistlib.loads((LIVE / "bin" / "com.burst.live-inbox-watch.plist").read_bytes())
        self.assertEqual(pl["ProgramArguments"][1:], ["arch1", "60"])
        self.assertIn("house/live/bin/live-inbox-watch", pl["ProgramArguments"][0])
        self.assertNotIn(".burst/bin", pl["ProgramArguments"][0])
        text = W.read_text()
        self.assertIn("house/live/tools/live-inbox", text)
        self.assertIn("XRAY_MAIN", text)

    def test_prints_asks_never_acks(self):
        r, calls = self.run_with("echo '{\"id\":\"wake-test-1\"}'")
        self.assertEqual(r.returncode, 0); self.assertIn("1 open ask", r.stdout); self.assertIn("wake-test-1", r.stdout)
        self.assertEqual(calls.strip(), "arch1"); self.assertNotIn("--ack", calls)

    def test_401_key_not_registered(self):
        r, _ = self.run_with("echo 'live-inbox: HTTP 401 {\"error\":\"unauthorized\"}' >&2; exit 1")
        self.assertNotEqual(r.returncode, 0); self.assertIn("key not registered", r.stderr)

    def test_delta_prints_same_set_once(self):
        import os, subprocess, tempfile
        with tempfile.TemporaryDirectory() as d:
            fake = Path(d) / "live-inbox"
            fake.write_text("#!/usr/bin/env bash\necho '{\"id\":\"wake-test-1\"}'\n")
            fake.chmod(0o755)
            env = {"PATH": os.environ["PATH"], "HOME": d, "LIVE_INBOX": str(fake),
                   "LIVE_WATCH_DELTA": "1", "LIVE_WATCH_MAX": "2"}
            r = subprocess.run(["bash", str(W), "arch1", "0"], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0)
        self.assertEqual(r.stdout.count("open ask"), 1)
        self.assertIn("wake-test-1", r.stdout)
        self.assertNotIn("--ack", r.stdout)


class MethodologyNote(unittest.TestCase):
    def test_no_template_brand_in_notes(self):
        src = (LIVE / "feed" / "live_mesh.py").read_text()
        self.assertNotIn("Example branding", src); self.assertIn("relabeled for {live_site.SITE['name']}", src)


if __name__ == "__main__":
    unittest.main()
