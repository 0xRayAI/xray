"""The pack's seat wake routine is the standard wake: turn start, STATION.md then NOTES.md, inbox, NOTES.md update, turn end on every exit."""
import json, os, re, subprocess, sys, tempfile, threading, unittest
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

TEMPLATE = Path(os.environ.get("WAKE_TEMPLATE") or Path(__file__).resolve().parents[3] / "grok-bot" / "templates" / "house" / "fleet" / "WAKE-ROUTINE.md")
TOOL = Path(__file__).resolve().parents[1] / "tools" / "live-inbox"
CT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")


def steps(text):
    return [m.group(1) for m in re.finditer(r"^\d+\.\s+(.*)$", text, re.M)]


class WakeTemplate(unittest.TestCase):
    def setUp(self):
        self.text = TEMPLATE.read_text()
        self.steps = steps(self.text)
        self.assertGreaterEqual(len(self.steps), 6, TEMPLATE)

    def test_station_step_reads_station_then_notes(self):
        hit = [s for s in self.steps if "STATION.md" in s]
        self.assertEqual(len(hit), 1)
        first = hit[0]
        self.assertIn(".xray/state/STATION.md", first)
        self.assertIn(".xray/state/NOTES.md", first)
        self.assertLess(first.index("STATION.md"), first.index("NOTES.md"), "STATION.md is read before NOTES.md")
        self.assertRegex(first, r"(?i)\bread")

    def test_notes_step_updates_notes_with_intent_next_cut_no_secrets(self):
        hit = [s for s in self.steps if re.search(r"(?i)\bupdate\b.*\.xray/state/NOTES\.md", s)]
        self.assertEqual(len(hit), 1)
        last = hit[0]
        for want in ("intent", "next cut", "no secrets"):
            self.assertIn(want, last.lower())

    def test_turn_start_and_turn_end_on_every_exit(self):
        self.assertRegex(self.steps[0], r"live-inbox <seat> --prompt --from blaze")
        self.assertLess(self.steps[0].index("--prompt"), self.steps[0].index("--turn start"))
        self.assertRegex(self.steps[0], r"live-inbox <seat> --turn start --tag wake")
        self.assertIn("--room", self.steps[0])
        low = self.steps[0].lower()
        self.assertIn("owner message", low)
        self.assertIn("1:1", low)
        self.assertIn("room", low)
        self.assertRegex(self.steps[-1], r"live-inbox <seat> --turn end --tag wake")
        end = self.steps[-1].lower()
        self.assertIn("every exit", end)
        for phrase in ("empty inbox", "early return", "error"):
            self.assertIn(phrase, end)
        blob = "\n".join(self.steps)
        self.assertLess(blob.index("--turn start"), blob.index("STATION.md"))
        self.assertLess(blob.index("update"), blob.rindex("--turn end"))
        self.assertNotIn("prompts.jsonl", self.text)

    def test_wake_never_launches_or_resumes(self):
        cloud = self.steps[4]
        self.assertIn("never launches or resumes a cloud agent", cloud)
        self.assertIn("duplicate", cloud)
        self.assertIn("still-waiting", cloud)
        self.assertIn("records the event", cloud)
        self.assertIn("forge for builds", cloud)
        self.assertIn("critic for reviews", cloud)
        self.assertIn("seat message pointing at the card", cloud)
        self.assertIn("persistent chat", cloud)
        self.assertIn("launches or resumes a cloud agent", cloud)
        self.assertNotIn("build_bc", self.text)
        self.assertNotIn("resume that same agent", self.text)
        self.assertIn("critic_bc", cloud)
        self.assertIn("one critic agent per pr", cloud.lower())
        self.assertIn("launches a new agent only when", cloud.lower())
        low = self.steps[0].lower()
        self.assertIn("posts no turn end", low)
        self.assertIn("owner token", low)
        self.assertIn("still waiting", low)
        self.assertIn("does not stop a newer line", low)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode()
        self.server.hits.append({"path": self.path, "auth": self.headers.get("Authorization"), "body": json.loads(raw)})
        out = b'{"ok":true}'
        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, fmt, *args):
        return


class TurnFlag(unittest.TestCase):
    def setUp(self):
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.srv.hits = []
        self.thread = threading.Thread(target=self.srv.serve_forever, daemon=True)
        self.thread.start()
        self.tmp = tempfile.TemporaryDirectory()
        self.keys = Path(self.tmp.name) / "keys"
        self.keys.mkdir()
        self.secret = "bifrost-seat-key-9f3c7a\n"
        (self.keys / "forge.key").write_text(self.secret)
        self.env = {
            "PATH": os.environ["PATH"],
            "LIVE_URL": f"http://127.0.0.1:{self.srv.server_address[1]}",
            "SEAT_KEYS_DIR": str(self.keys),
            "LIVE_CURSORS": str(Path(self.tmp.name) / "cursors"),
        }

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()
        self.tmp.cleanup()

    def run_turn(self, *args):
        return subprocess.run([sys.executable, str(TOOL), "forge", *args], env=self.env, capture_output=True, text=True, timeout=20)

    def assert_chicago(self, stamp):
        self.assertRegex(stamp, CT)
        got = datetime.fromisoformat(stamp)
        as_ct = got.astimezone(ZoneInfo("America/Chicago"))
        self.assertEqual(got.replace(tzinfo=None), as_ct.replace(tzinfo=None))
        self.assertLess(abs((datetime.now(got.tzinfo) - got).total_seconds()), 120)

    def assert_secret_hidden(self, proc):
        leaked = self.secret.strip()
        self.assertNotIn(leaked, proc.stdout)
        self.assertNotIn(leaked, proc.stderr)
        for hit in self.srv.hits:
            self.assertNotIn(leaked, json.dumps(hit["body"]))

    def test_turn_start_posts_body_and_hides_key(self):
        proc = self.run_turn("--turn", "start", "--tag", "wake")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.strip(), '{"ok": true}')
        self.assertEqual(len(self.srv.hits), 1)
        hit = self.srv.hits[0]
        self.assertEqual(hit["path"], "/activity")
        self.assertEqual(hit["auth"], "Bearer " + self.secret.strip())
        self.assertEqual(list(hit["body"]), ["kind", "action", "t_ct", "tag"])
        self.assertEqual(hit["body"]["kind"], "turn")
        self.assertEqual(hit["body"]["action"], "start")
        self.assertEqual(hit["body"]["tag"], "wake")
        self.assert_chicago(hit["body"]["t_ct"])
        self.assert_secret_hidden(proc)

    def test_turn_end_omits_tag_when_unset(self):
        proc = self.run_turn("--turn", "end")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        hit = self.srv.hits[0]
        self.assertEqual(list(hit["body"]), ["kind", "action", "t_ct"])
        self.assertEqual(hit["body"]["action"], "end")
        self.assertEqual(hit["auth"], "Bearer " + self.secret.strip())
        self.assert_chicago(hit["body"]["t_ct"])
        self.assert_secret_hidden(proc)

    def test_prompt_posts_activity_and_writes_no_file(self):
        run = Path(self.tmp.name) / "run"
        home = Path(self.tmp.name) / "home"
        self.env["MESH_RUN"] = str(run)
        self.env["LIVE_HOME"] = str(home)
        proc = self.run_turn("--prompt", "--room", "ops")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(len(self.srv.hits), 1)
        hit = self.srv.hits[0]
        self.assertEqual(hit["path"], "/activity")
        self.assertEqual(hit["auth"], "Bearer " + self.secret.strip())
        self.assertEqual(list(hit["body"]), ["t_ct", "seat", "kind", "action", "from", "to", "room"])
        self.assertEqual(hit["body"]["kind"], "prompt")
        self.assertEqual(hit["body"]["action"], "sent")
        self.assertEqual(hit["body"]["from"], "blaze")
        self.assertEqual(hit["body"]["to"], "forge")
        self.assertEqual(hit["body"]["seat"], "forge")
        self.assertEqual(hit["body"]["room"], "ops")
        self.assert_chicago(hit["body"]["t_ct"])
        self.assert_secret_hidden(proc)
        self.assertFalse((run / "fleet" / "prompts.jsonl").exists())
        self.assertFalse((home / "run" / "fleet" / "prompts.jsonl").exists())

    def test_prompt_from_override(self):
        proc = self.run_turn("--prompt", "--from", "mill")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        hit = self.srv.hits[0]
        self.assertEqual(hit["body"]["from"], "mill")
        self.assertNotIn("room", hit["body"])
        self.assert_secret_hidden(proc)


if __name__ == "__main__":
    unittest.main()

