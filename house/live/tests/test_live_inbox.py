"""live-inbox --handoff posts one packet and prints one 1:1 line. The same PR and head keep one id."""
import json, os, shutil, subprocess, threading, time, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "live-inbox"
KINDS = ("ready", "critic_fail", "live_pass", "merge", "ci_fail")


class Inbox(BaseHTTPRequestHandler):
    posts = []

    def log_message(self, fmt, *args):
        return

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n).decode())
        self.posts.append({"path": self.path, "auth": self.headers.get("Authorization"), "body": body})
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true,"added":1,"rejected":[]}')


class HandoffCommand(unittest.TestCase):
    def setUp(self):
        Inbox.posts = []
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Inbox)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.keys = Path(self.id().replace(".", "_") + "-keys")
        self.keys.mkdir(exist_ok=True)
        (self.keys / "forge.key").write_text("seat-key-forge\n")
        self.env = {**os.environ, "LIVE_URL": f"http://127.0.0.1:{self.httpd.server_address[1]}",
                    "SEAT_KEYS_DIR": str(self.keys), "LIVE_CURSORS": str(self.keys / "cursors")}

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        shutil.rmtree(self.keys, ignore_errors=True)

    def run_handoff(self, *args):
        return subprocess.run([str(TOOL), "forge", *args], env=self.env, capture_output=True, text=True)

    def test_each_kind_posts_one_packet_and_prints_one_line(self):
        sha = "abc1234"
        for i, kind in enumerate(KINDS, start=1):
            Inbox.posts = []
            r = self.run_handoff("--handoff", "critic", "--pr", f"0xRayAI/xray#{i}", "--kind", kind, "--sha", sha)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(r.stdout.count("\n"), 1)
            self.assertIn(f"SendToAgent critic: handoff {kind} 0xRayAI/xray#{i} ", r.stdout)
            self.assertNotIn("seat-key-forge", r.stdout + r.stderr)
            self.assertEqual(len(Inbox.posts), 1)
            self.assertEqual(Inbox.posts[0]["path"], "/inbox")
            self.assertEqual(Inbox.posts[0]["auth"], "Bearer seat-key-forge")
            line = Inbox.posts[0]["body"]["lines"][0]
            self.assertEqual(line["seat"], "critic")
            self.assertEqual(line["from"], "forge")
            self.assertEqual(line["type"], "packet")
            self.assertEqual(line["kind"], kind)
            self.assertEqual(line["number"], i)
            self.assertEqual(line["sha"], sha)
            self.assertEqual(len(Inbox.posts[0]["body"]["lines"]), 1)

    def test_missing_sha_is_refused(self):
        before = len(Inbox.posts)
        r = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#21", "--kind", "ready")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(len(Inbox.posts), before)
        short = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#22", "--kind", "ready", "--sha", "abc1234")
        self.assertEqual(short.returncode, 0, short.stderr)
        posted = Inbox.posts[-1]["body"]["lines"][0]
        self.assertEqual(posted["id"], "handoff:0xrayai/xray#22:ready:abc1234")
        self.assertEqual(posted["sha"], "abc1234")

    def test_cloud_turn_posts_kind_turn_only(self):
        agent = "bc-531f2033-90e0-595f-87de-8dfe576ec69c"
        env = {**self.env, "CURSOR_AGENT": "1", "CURSOR_CONVERSATION_ID": agent}
        Inbox.posts = []
        r = subprocess.run([str(TOOL), "forge", "--turn", "start"], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([p["path"] for p in Inbox.posts], ["/activity"])
        self.assertEqual(Inbox.posts[0]["body"]["kind"], "turn")
        self.assertEqual(Inbox.posts[0]["body"]["action"], "start")
        self.assertNotIn("cloud_agent", json.dumps(Inbox.posts))
        self.assertNotIn("seat-key-forge", r.stdout + r.stderr)
        Inbox.posts = []
        end = subprocess.run([str(TOOL), "forge", "--turn", "end"], env=env, capture_output=True, text=True)
        self.assertEqual(end.returncode, 0, end.stderr)
        self.assertEqual(len(Inbox.posts), 1)
        self.assertEqual(Inbox.posts[0]["body"]["kind"], "turn")
        self.assertEqual(Inbox.posts[0]["body"]["action"], "end")

    def test_same_pr_and_head_is_one_id(self):
        a = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#9", "--kind", "ready", "--sha", "abcdef0")
        b = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#9", "--kind", "ready", "--sha", "abcdef0")
        c = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#9", "--kind", "ready", "--sha", "bbbbbbb")
        self.assertEqual(a.returncode, 0)
        ids = [p["body"]["lines"][0]["id"] for p in Inbox.posts]
        self.assertEqual(ids[0], ids[1])
        self.assertNotEqual(ids[0], ids[2])
        self.assertEqual(b.stdout, a.stdout)
        self.assertNotEqual(c.stdout, a.stdout)

    def test_start_after_posts_the_card_date(self):
        r = self.run_handoff("--card", "acme/app#9", "--start-after", "2026-10-18T08:00-05:00")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("start after 2026-10-18T08:00-05:00 acme/app#9", r.stdout)
        self.assertNotIn("seat-key-forge", r.stdout + r.stderr)
        self.assertEqual(len(Inbox.posts), 1)
        self.assertEqual(Inbox.posts[0]["path"], "/cards/start-after")
        self.assertEqual(Inbox.posts[0]["auth"], "Bearer seat-key-forge")
        self.assertEqual(Inbox.posts[0]["body"], {"repo": "acme/app", "number": 9, "start_after": "2026-10-18T08:00-05:00"})
        bad = self.run_handoff("--card", "acme/app#9", "--start-after", "tomorrow")
        self.assertNotEqual(bad.returncode, 0)
        self.assertEqual(len(Inbox.posts), 1)

    def test_bad_kind_posts_nothing(self):
        r = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#1", "--kind", "room")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(Inbox.posts, [])

    def test_ack_review_is_sent_with_the_id(self):
        url = "https://github.com/0xRayAI/xray/pull/80#pullrequestreview-554"
        r = self.run_handoff("--ack", "handoff:0xrayai/xray#80:merge:abc1234", "--review", url)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(Inbox.posts[-1]["path"], "/inbox/forge/ack")
        self.assertEqual(Inbox.posts[-1]["body"]["id"], "handoff:0xrayai/xray#80:merge:abc1234")
        self.assertEqual(Inbox.posts[-1]["body"]["review"], url)
        refused = self.run_handoff("--review", url)
        self.assertNotEqual(refused.returncode, 0)
        self.assertEqual(len(Inbox.posts), 1)
        both = self.run_handoff("--ack", "all", "--review", url)
        self.assertNotEqual(both.returncode, 0)
        self.assertEqual(len(Inbox.posts), 1)

    def test_handoff_timeout_still_prints_the_wake(self):
        class Hang(BaseHTTPRequestHandler):
            def log_message(self, fmt, *args):
                return

            def do_POST(self):
                n = int(self.headers.get("Content-Length") or 0)
                self.rfile.read(n)
                time.sleep(30)

        hang = ThreadingHTTPServer(("127.0.0.1", 0), Hang)
        thread = threading.Thread(target=hang.serve_forever, daemon=True)
        thread.start()
        try:
            env = {**self.env, "LIVE_URL": f"http://127.0.0.1:{hang.server_address[1]}", "LIVE_INBOX_TIMEOUT": "0.3"}
            r = subprocess.run(
                [str(TOOL), "forge", "--handoff", "critic", "--pr", "0xRayAI/xray#551", "--kind", "merge", "--sha", "abc1234"],
                env=env, capture_output=True, text=True, timeout=5,
            )
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("SendToAgent critic: handoff merge 0xRayAI/xray#551 @abc1234 ", r.stdout)
            self.assertIn("server unreachable", r.stderr)
        finally:
            hang.shutdown()
            hang.server_close()

    def test_handoff_refused_prints_no_wake(self):
        env = {**self.env, "LIVE_URL": "http://127.0.0.1:1", "LIVE_INBOX_TIMEOUT": "0.3"}
        r = subprocess.run(
            [str(TOOL), "forge", "--handoff", "critic", "--pr", "0xRayAI/xray#551", "--kind", "merge", "--sha", "abc1234"],
            env=env, capture_output=True, text=True, timeout=5,
        )
        self.assertNotEqual(r.returncode, 0)
        self.assertNotIn("SendToAgent", r.stdout)
        self.assertIn("server unreachable", r.stderr)



    def test_cloud_posts_cloud_agent_and_rebinds_xray_tag(self):
        agent = "bc-043681df"
        full = "bc-531f2033-90e0-595f-87de-8dfe576ec69c"
        Inbox.posts = []
        short = self.run_handoff("--cloud", "reply", "--agent", agent, "--tag", "xray#628")
        self.assertEqual(short.returncode, 0, short.stderr)
        self.assertNotIn("seat-key-forge", short.stdout + short.stderr)
        self.assertEqual(Inbox.posts[0]["path"], "/activity")
        self.assertEqual(Inbox.posts[0]["auth"], "Bearer seat-key-forge")
        body = Inbox.posts[0]["body"]
        self.assertEqual(body["kind"], "cloud_agent")
        self.assertEqual(body["action"], "reply")
        self.assertEqual(body["agent"], agent)
        self.assertEqual(body["tag"], "0xRayAI/xray#628")
        self.assertNotIn("seat", body)
        self.assertRegex(body["t_ct"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")
        kept = self.run_handoff("--cloud", "launch", "--agent", agent, "--tag", "0xRayAI/xray#0627")
        self.assertEqual(kept.returncode, 0, kept.stderr)
        self.assertEqual(Inbox.posts[-1]["body"]["tag"], "0xRayAI/xray#627")
        self.assertEqual(Inbox.posts[-1]["body"]["action"], "launch")
        other = self.run_handoff("--cloud", "cancel", "--agent", agent, "--tag", "0xRayAI/bifrost#12")
        self.assertEqual(other.returncode, 0, other.stderr)
        self.assertEqual(Inbox.posts[-1]["body"]["tag"], "0xRayAI/bifrost#12")
        self.assertEqual(Inbox.posts[-1]["body"]["action"], "cancel")
        bare = self.run_handoff("--cloud", "finished", "--agent", full)
        self.assertEqual(bare.returncode, 0, bare.stderr)
        self.assertEqual(set(Inbox.posts[-1]["body"]), {"kind", "action", "agent", "t_ct"})
        self.assertEqual(Inbox.posts[-1]["body"]["action"], "finished")
        self.assertEqual(Inbox.posts[-1]["body"]["agent"], full)

    def test_cloud_refuses_a_bad_tag_agent_or_turn_mix(self):
        before = len(Inbox.posts)
        refused = [
            ["--cloud", "reply", "--tag", "xray#628"],
            ["--cloud", "nope", "--agent", "bc-043681df"],
            ["--cloud", "reply", "--agent", "x", "--tag", "xray#1"],
            ["--cloud", "reply", "--agent", "bc-043681df", "--tag", "bifrost#3"],
            ["--cloud", "reply", "--agent", "bc-043681df", "--tag", "xray#0"],
            ["--cloud", "reply", "--agent", "bc-043681df", "--turn", "start"],
            ["--cloud", "reply", "--agent", "bc-043681df", "--tag", "xray#628", "--turn", "start"],
        ]
        for args in refused:
            got = self.run_handoff(*args)
            self.assertNotEqual(got.returncode, 0, args)
            self.assertEqual(len(Inbox.posts), before, args)

    def test_cloud_posts_while_another_turn_owns_the_claim(self):
        cur = Path(self.env["LIVE_CURSORS"])
        cur.mkdir(parents=True, exist_ok=True)
        sleeper = subprocess.Popen(["sleep", "30"])
        try:
            (cur / "forge.claims.json").write_text(json.dumps({
                "0xrayai/xray#1|abc1234|ready": {"pid": sleeper.pid, "token": "other-wake", "at": 1, "id": "line"},
            }))
            Inbox.posts = []
            blocked = self.run_handoff("--turn", "start", "--tag", "bc-043681df track")
            self.assertEqual(blocked.returncode, 0, blocked.stderr)
            self.assertEqual(blocked.stdout, "")
            self.assertEqual(Inbox.posts, [])
            posted = self.run_handoff("--cloud", "reply", "--agent", "bc-043681df", "--tag", "xray#628")
            self.assertEqual(posted.returncode, 0, posted.stderr)
            self.assertEqual(len(Inbox.posts), 1)
            self.assertEqual(Inbox.posts[0]["body"]["kind"], "cloud_agent")
            self.assertEqual(Inbox.posts[0]["body"]["tag"], "0xRayAI/xray#628")
            saved = json.loads((cur / "forge.claims.json").read_text())
            self.assertEqual(saved["0xrayai/xray#1|abc1234|ready"]["token"], "other-wake")
        finally:
            sleeper.kill()
            sleeper.wait(timeout=5)


if __name__ == "__main__":
    unittest.main()
