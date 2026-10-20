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
        self.assertRegex(self.steps[0], r"live-inbox <seat> --prompt")
        self.assertNotIn("--from blaze", self.steps[0])
        self.assertNotIn("--from blaze", self.text)
        self.assertIn("trap 'live-inbox <seat> --turn end --tag wake; live-inbox <seat> --release' EXIT", self.text)
        self.assertLess(self.steps[0].index("--prompt"), self.steps[0].index("--turn start"))
        self.assertRegex(self.steps[0], r"live-inbox <seat> --turn start --tag wake")
        self.assertIn("--room", self.steps[0])
        low = self.steps[0].lower()
        self.assertIn("owner message", low)
        self.assertIn("1:1", low)
        self.assertIn("room", low)
        self.assertRegex(self.steps[-1], r"live-inbox <seat> --turn end --tag wake")
        self.assertEqual(self.steps[-1].count("--turn end"), 1)
        self.assertIn("trap", self.steps[-1].lower())
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
        self.assertIn("pushes its branch only", cloud.lower())
        self.assertIn("never opens a pull request or an issue", cloud.lower())

    def test_cos_seat_does_not_post_a_handoff(self):
        handoff = self.steps[3]
        self.assertIn(
            "The CoS seat does not post a handoff. The CoS seat only acks a dev line and sends no message about it.",
            handoff,
        )
        self.assertIn("live-inbox <seat> --handoff", handoff)
        self.assertIn("critic_fail", handoff)
        self.assertNotIn("The board does every", handoff)
        self.assertNotIn("merge go", handoff)
        self.assertNotIn("re-check", handoff)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode()
        self.server.hits.append({"path": self.path, "auth": self.headers.get("Authorization"), "body": json.loads(raw)})
        reply = getattr(self.server, "reply", {"ok": True})
        out = json.dumps(reply).encode()
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
        self.house = Path(self.tmp.name) / "HOUSE.md"
        self.house.write_text("## Owner\nname: Ada\n", encoding="utf-8")
        self.env = {
            "PATH": os.environ["PATH"],
            "LIVE_URL": f"http://127.0.0.1:{self.srv.server_address[1]}",
            "SEAT_KEYS_DIR": str(self.keys),
            "LIVE_CURSORS": str(Path(self.tmp.name) / "cursors"),
            "HOUSE": str(self.house),
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
        self.assertEqual(hit["body"]["from"], "Ada")
        self.assertEqual(hit["body"]["to"], "forge")
        self.assertEqual(hit["body"]["seat"], "forge")
        self.assertNotIn("note", hit["body"])
        self.assertEqual(hit["body"]["room"], "ops")
        self.assert_chicago(hit["body"]["t_ct"])
        self.assert_secret_hidden(proc)
        self.assertFalse((run / "fleet" / "prompts.jsonl").exists())
        self.assertFalse((home / "run" / "fleet" / "prompts.jsonl").exists())

    def test_prompt_note_is_one_line(self):
        proc = self.run_turn("--prompt", "--note", "check the message on the board")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        hit = self.srv.hits[0]
        self.assertEqual(hit["body"]["note"], "check the message on the board")
        self.assertEqual(hit["body"]["from"], "Ada")
        self.assertEqual(hit["body"]["to"], "forge")
        self.assert_secret_hidden(proc)
        before = len(self.srv.hits)
        bad = self.run_turn("--prompt", "--note", "x" * 241)
        self.assertNotEqual(bad.returncode, 0)
        self.assertIn("short plain line", bad.stderr)
        self.assertEqual(len(self.srv.hits), before)
        broken = self.run_turn("--prompt", "--note", "line\nwith a break")
        self.assertNotEqual(broken.returncode, 0)
        self.assertEqual(len(self.srv.hits), before)
        self.assertNotIn("blaze", (broken.stdout + broken.stderr).lower())

    def test_prompt_from_override(self):
        proc = self.run_turn("--prompt", "--from", "mill")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        hit = self.srv.hits[0]
        self.assertEqual(hit["body"]["from"], "mill")
        self.assertNotIn("room", hit["body"])
        self.assert_secret_hidden(proc)

    def test_prompt_prints_ok_and_id_only(self):
        self.srv.reply = {"ok": True, "id": "ada.9", "key": self.secret.strip(), "token": "planted-token"}
        self.env["PLANTED_KEY"] = "planted-token"
        proc = self.run_turn("--prompt")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        body = json.loads(proc.stdout)
        self.assertEqual(set(body), {"ok", "id"})
        self.assertEqual(body, {"ok": True, "id": "ada.9"})
        self.assertNotIn("planted-token", proc.stdout + proc.stderr)
        self.assert_secret_hidden(proc)
        self.assertEqual(self.srv.hits[0]["body"]["from"], "Ada")

    def test_missing_name_exits_2_and_posts_nothing(self):
        missing = Path(self.tmp.name) / "missing.md"
        self.env["HOUSE"] = str(missing)
        proc = self.run_turn("--prompt")
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn(f"missing name: in {missing}", proc.stderr)
        self.assertEqual(self.srv.hits, [])
        blob = (proc.stdout + proc.stderr).lower()
        self.assertNotIn("blaze", blob)


if __name__ == "__main__":
    unittest.main()

