"""tools/inbox-watch.sh: FAIL once per distinct error, ACTION_REQUIRED on new lines, one turn start and one turn end."""
import os, subprocess, tempfile, unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
W = LIVE / "tools" / "inbox-watch.sh"


class InboxWatch(unittest.TestCase):
    def test_syntax_and_exec(self):
        subprocess.run(["bash", "-n", str(W)], check=True)
        self.assertTrue(os.access(W, os.X_OK))
        text = W.read_text()
        self.assertIn("house/live/tools/live-inbox", text)
        self.assertIn("XRAY_MAIN", text)
        self.assertNotIn("command -v live-inbox", text)

    def _run(self, body, args, env_extra):
        with tempfile.TemporaryDirectory() as d:
            fake = Path(d) / "live-inbox"
            log = Path(d) / "calls"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "printf '%%s\\n' \"$*\" >> %s\n"
                "printf 'URL=%%s KEYS=%%s CUR=%%s\\n' \"$LIVE_URL\" \"$SEAT_KEYS_DIR\" \"$LIVE_CURSORS\" >> %s\n"
                "%s\n" % (log, log, body)
            )
            fake.chmod(0o755)
            env = {"PATH": os.environ["PATH"], "HOME": d, "LIVE_INBOX": str(fake), "INBOX_WATCH_INTERVAL": "0"}
            env.update(env_extra)
            r = subprocess.run(["bash", str(W), *args], env=env, capture_output=True, text=True)
            return r, log.read_text() if log.exists() else ""

    def test_defaults_and_empty_poll_is_quiet(self):
        r, calls = self._run("exit 0", [], {"INBOX_WATCH_ONCE": "1"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout, "")
        self.assertIn("arch1", calls.splitlines()[0])
        self.assertIn("URL=https://bifrost.0xray.dev", calls)
        self.assertIn("/.burst/seat-keys", calls)
        self.assertIn("/.burst/cursors", calls)
        self.assertNotIn("--ack", calls)
        self.assertNotIn("--turn", calls)

    def test_new_lines_turn_start_then_end(self):
        body = r"""
if [[ "$*" == *"--turn"* ]]; then exit 0; fi
count="$(dirname "$0")/n"
n=0
[[ -f "$count" ]] && n=$(cat "$count")
n=$((n + 1))
echo "$n" > "$count"
if [[ "$n" -eq 1 || "$n" -eq 2 ]]; then echo 'line-a'; fi
exit 0
"""
        r, calls = self._run(body, ["arch1"], {"INBOX_WATCH_MAX": "3"})
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("ACTION_REQUIRED"), 1)
        self.assertIn("line-a", r.stdout)
        self.assertEqual(calls.count("--turn start --tag wake"), 1)
        self.assertEqual(calls.count("--turn end"), 1)
        self.assertNotIn("--ack", calls)
        self.assertNotIn("seat-key", r.stdout + r.stderr)

    def test_fail_once_per_distinct_error(self):
        body = r"""
if [[ "$*" == *"--turn"* ]]; then exit 0; fi
count="$(dirname "$0")/n"
n=0
[[ -f "$count" ]] && n=$(cat "$count")
n=$((n + 1))
echo "$n" > "$count"
if [[ "$n" -le 2 ]]; then echo 'boom' >&2; exit 1; fi
echo 'other' >&2
exit 1
"""
        r, _calls = self._run(body, ["mill"], {"INBOX_WATCH_MAX": "3"})
        self.assertEqual(r.stdout.count("FAIL"), 2)
        self.assertIn("boom", r.stdout)
        self.assertIn("other", r.stdout)
        self.assertNotIn("ACTION_REQUIRED", r.stdout)


if __name__ == "__main__":
    unittest.main()
