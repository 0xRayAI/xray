"""live-inbox --handoff posts one packet and prints one 1:1 line. The same PR and head keep one id."""
import json, os, subprocess, threading, unittest
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
        for p in self.keys.glob("*"):
            p.unlink()
        self.keys.rmdir()

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

    def test_bad_kind_posts_nothing(self):
        r = self.run_handoff("--handoff", "critic", "--pr", "0xRayAI/xray#1", "--kind", "room")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(Inbox.posts, [])


if __name__ == "__main__":
    unittest.main()
