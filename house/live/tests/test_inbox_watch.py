"""tools/inbox-watch.sh: FAIL once per distinct error, ACTION_REQUIRED+unfinished:N on every open poll, auto-ack closed items, held lines once."""
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

    def _hooks(self, d, gh_body, card_body="printf 'live\\n'"):
        gh = Path(d) / "gh"
        card = Path(d) / "card"
        gh.write_text("#!/usr/bin/env bash\n" + gh_body + "\n")
        card.write_text("#!/usr/bin/env bash\n" + card_body + "\n")
        gh.chmod(0o755)
        card.chmod(0o755)
        return {"INBOX_WATCH_GH": str(gh), "INBOX_WATCH_CARD": str(card)}

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

    def test_success_writes_watch_state(self):
        with tempfile.TemporaryDirectory() as d:
            state = str(Path(d) / "inbox-watch.state")
            pid_path = str(Path(d) / "inbox-watch.pid")
            r, _calls = self._run("exit 0", [], {"INBOX_WATCH_ONCE": "1", "INBOX_WATCH_STATE": state, "INBOX_WATCH_PID": pid_path})
            self.assertEqual(r.returncode, 0, r.stderr)
            text = Path(state).read_text()
            self.assertIn("pid=", text)
            self.assertIn("started=", text)
            self.assertIn("last_ok=", text)
            self.assertIn("live_url=https://bifrost.0xray.dev", text)
            self.assertIn("script=house/live/tools/inbox-watch.sh", text)
            pid_text = Path(pid_path).read_text().strip()
            self.assertTrue(pid_text.isdigit())
            self.assertIn("pid=%s\n" % pid_text, text)

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
        self.assertEqual(r.stdout.count("ACTION_REQUIRED"), 2)
        self.assertEqual(r.stdout.count("unfinished:1"), 2)
        self.assertEqual(r.stdout.count("open 1: raw=1"), 2)
        self.assertEqual(r.stdout.count("line-a"), 2)
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
        self.assertIn("LIVE_URL=https://bifrost.0xray.dev", r.stdout)
        self.assertIn("expected=https://bifrost.0xray.dev", r.stdout)
        self.assertIn("boom", r.stdout)
        self.assertIn("other", r.stdout)
        self.assertNotIn("ACTION_REQUIRED", r.stdout)

    def test_closed_line_is_auto_acked(self):
        line = '{"id":"closed-1","repo":"0xRayAI/xray","number":531,"title":"done"}'
        body = """
if [[ "$*" == *"--turn"* || "$*" == *"--ack"* ]]; then exit 0; fi
echo '%s'
exit 0
""" % line
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, "printf 'closed\\t\\t\\n'")
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "2"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("auto-ack closed-1"), 2)
        self.assertNotIn("ACTION_REQUIRED", r.stdout)
        self.assertNotIn(line, r.stdout)
        self.assertEqual(calls.count("--ack closed-1"), 2)
        self.assertNotIn("--turn", calls)
        self.assertNotIn("seat-key", r.stdout + r.stderr)

    def test_held_label_once_and_open_line_repeats(self):
        open_line = '{"id":"open-1","repo":"0xRayAI/xray","number":549,"title":"open"}'
        held_line = '{"id":"held-1","repo":"0xRayAI/xray","number":570,"title":"held"}'
        body = """
if [[ "$*" == *"--turn"* || "$*" == *"--ack"* ]]; then exit 0; fi
count="$(dirname "$0")/n"
n=0
[[ -f "$count" ]] && n=$(cat "$count")
n=$((n + 1))
echo "$n" > "$count"
if [[ "$n" -le 2 ]]; then
  echo '%s'
  echo '%s'
fi
exit 0
""" % (open_line, held_line)
        gh = """
case "$2" in
  549) printf 'open\\t\\tbug\\n' ;;
  570) printf 'open\\t\\tOn-Hold\\n' ;;
  *) exit 1 ;;
esac
"""
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, gh)
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "3"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("ACTION_REQUIRED"), 2)
        self.assertEqual(r.stdout.count("unfinished:1"), 2)
        self.assertEqual(r.stdout.count("open-1"), 2)
        self.assertNotIn(open_line, r.stdout)
        self.assertEqual(r.stdout.count("held: 1"), 1)
        self.assertNotIn(held_line, r.stdout)
        self.assertNotIn("auto-ack", r.stdout)
        self.assertNotIn("--ack", calls)
        self.assertEqual(calls.count("--turn start --tag wake"), 1)
        self.assertEqual(calls.count("--turn end"), 1)

    def test_held_card_listed_once(self):
        held_line = '{"id":"held-card","repo":"0xRayAI/xray","number":416,"title":"card"}'
        body = """
if [[ "$*" == *"--turn"* || "$*" == *"--ack"* ]]; then exit 0; fi
count="$(dirname "$0")/n"
n=0
[[ -f "$count" ]] && n=$(cat "$count")
n=$((n + 1))
echo "$n" > "$count"
if [[ "$n" -le 2 ]]; then echo '%s'; fi
exit 0
""" % held_line
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, "printf 'open\\t\\tbug\\n'", "printf 'held\\n'")
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "3"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("held: 1"), 1)
        self.assertNotIn("ACTION_REQUIRED", r.stdout)
        self.assertNotIn(held_line, r.stdout)
        self.assertNotIn("--ack", calls)
        self.assertEqual(calls.count("--turn start --tag wake"), 1)
        self.assertEqual(calls.count("--turn end"), 1)

    def test_gh_failure_leaves_the_line_open(self):
        line = '{"id":"unknown-1","repo":"0xRayAI/xray","number":588,"title":"unknown"}'
        body = """
if [[ "$*" == *"--turn"* || "$*" == *"--ack"* ]]; then exit 0; fi
echo '%s'
exit 0
""" % line
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, "echo boom >&2; exit 1")
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "1"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("ACTION_REQUIRED"), 1)
        self.assertIn("unfinished:1", r.stdout)
        self.assertIn("unknown-1", r.stdout)
        self.assertNotIn(line, r.stdout)
        self.assertNotIn("auto-ack", r.stdout)
        self.assertNotIn("--ack", calls)

    def test_ack_failure_reprints_the_line(self):
        line = '{"id":"closed-2","repo":"0xRayAI/xray","number":532,"title":"merged"}'
        body = """
if [[ "$*" == *"--ack"* ]]; then exit 1; fi
if [[ "$*" == *"--turn"* ]]; then exit 0; fi
echo '%s'
exit 0
""" % line
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, "printf 'merged\\tmerged\\t\\n'")
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "1"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertNotIn("auto-ack", r.stdout)
        self.assertIn("ACTION_REQUIRED", r.stdout)
        self.assertIn("unfinished:1", r.stdout)
        self.assertIn("closed-2", r.stdout)
        self.assertNotIn(line, r.stdout)
        self.assertIn("--ack closed-2", calls)

    def test_same_open_set_prints_unfinished(self):
        """Same non-empty set reprints ACTION_REQUIRED + unfinished:N; empty stays quiet."""
        line = '{"id":"open-2","repo":"0xRayAI/xray","number":608,"title":"still open","type":"issue_comment"}'
        body = """
if [[ "$*" == *"--turn"* || "$*" == *"--ack"* ]]; then exit 0; fi
count="$(dirname "$0")/n"
n=0
[[ -f "$count" ]] && n=$(cat "$count")
n=$((n + 1))
echo "$n" > "$count"
if [[ "$n" -le 2 ]]; then echo '%s'; fi
exit 0
""" % line
        with tempfile.TemporaryDirectory() as d:
            hooks = self._hooks(d, "printf 'open\\t\\tbug\\n'")
            r, calls = self._run(body, ["arch1"], dict({"INBOX_WATCH_MAX": "3"}, **hooks))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.count("ACTION_REQUIRED"), 2)
        self.assertEqual(r.stdout.count("unfinished:1"), 2)
        self.assertEqual(r.stdout.count("open-2"), 2)
        self.assertNotIn(line, r.stdout)
        self.assertEqual(calls.count("--turn start --tag wake"), 1)
        self.assertEqual(calls.count("--turn end"), 1)
        self.assertNotIn("--ack", calls)


if __name__ == "__main__":
    unittest.main()
