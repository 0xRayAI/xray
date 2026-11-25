"""#1263: live-inbox --prompt --to names the receiver (default the posting seat), and a /history 401 during --at dedupe warns."""
import json, os, shutil, subprocess, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "live-inbox"


class Board(BaseHTTPRequestHandler):
    posts = []
    history_code = 200

    def log_message(self, fmt, *args):
        return

    def _send(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_GET(self):
        if self.path.startswith("/history"):
            if Board.history_code != 200:
                return self._send(Board.history_code, {"error": "unauthorized"})
            return self._send(200, {"events": []})
        self._send(404, {})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        Board.posts.append({"path": self.path, "body": json.loads(self.rfile.read(n).decode())})
        self._send(202, {"ok": True, "id": "e.1"})


class PromptTo(unittest.TestCase):
    def setUp(self):
        Board.posts, Board.history_code = [], 200
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Board)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.keys = Path(self.id().replace(".", "_") + "-keys")
        self.keys.mkdir(exist_ok=True)
        (self.keys / "operator.key").write_text("seat-key-operator\n")
        self.env = {**os.environ, "LIVE_URL": f"http://127.0.0.1:{self.httpd.server_address[1]}",
                    "SEAT_KEYS_DIR": str(self.keys), "LIVE_CURSORS": str(self.keys / "cursors")}

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        shutil.rmtree(self.keys, ignore_errors=True)

    def run_tool(self, *args):
        return subprocess.run([str(TOOL), "operator", *args], env=self.env, capture_output=True, text=True)

    def test_to_names_the_receiver(self):
        r = self.run_tool("--prompt", "--from", "Blaze", "--to", "critic", "--note", "hello")
        self.assertEqual(r.returncode, 0, r.stderr)
        body = Board.posts[-1]["body"]
        self.assertEqual((body["from"], body["to"], body["seat"]), ("Blaze", "critic", "operator"))
        self.assertNotIn("seat-key-operator", r.stdout + r.stderr)

    def test_to_defaults_to_the_posting_seat(self):
        r = self.run_tool("--prompt", "--from", "Blaze", "--note", "hello")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(Board.posts[-1]["body"]["to"], "operator")

    def test_bad_to_exits(self):
        r = self.run_tool("--prompt", "--from", "Blaze", "--to", "no\nway")
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(Board.posts, [])

    def test_history_401_warns_and_posts(self):
        Board.history_code = 401
        r = self.run_tool("--prompt", "--from", "Blaze", "--to", "critic", "--at", "2026-11-09T09:24:00-06:00", "--note", "late")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("HTTP 401", r.stderr)
        self.assertIn("dedupe skipped", r.stderr)
        self.assertEqual(Board.posts[-1]["body"]["to"], "critic")


if __name__ == "__main__":
    unittest.main()
