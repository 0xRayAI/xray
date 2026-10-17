"""live-inbox --ack stale is a dry run. --apply sends it. --upto posts the existing receipt."""
import json, os, subprocess, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "live-inbox"


class Inbox(BaseHTTPRequestHandler):
    calls = []

    def log_message(self, fmt, *args):
        return

    def _read(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n).decode()) if n else None

    def _ok(self, body):
        raw = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        Inbox.calls.append({"method": "GET", "path": self.path, "auth": self.headers.get("Authorization")})
        self._ok({"seat": "arch1", "lines": [
            {"id": "org/repo#1:merged", "t_ct": "2026-10-01T00:00:00Z", "title": "merged"},
            {"id": "org/repo#2:closed", "t_ct": "2026-10-02T00:00:00Z", "title": "gone"},
        ]})

    fail_ids = set()

    def do_POST(self):
        body = self._read()
        Inbox.calls.append({"method": "POST", "path": self.path, "auth": self.headers.get("Authorization"), "body": body})
        if isinstance(body, dict) and body.get("id") in Inbox.fail_ids:
            raw = b'{"error":"nope"}'
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self._ok({"ok": True, "acked": 1, "open": 1})


class StaleAck(unittest.TestCase):
    def setUp(self):
        Inbox.calls = []
        Inbox.fail_ids = set()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Inbox)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.keys = Path(self.id().replace(".", "_") + "-keys")
        self.keys.mkdir(exist_ok=True)
        (self.keys / "arch1.key").write_text("seat-key-arch1\n")
        self.env = {**os.environ, "LIVE_URL": f"http://127.0.0.1:{self.httpd.server_address[1]}",
                    "SEAT_KEYS_DIR": str(self.keys), "LIVE_CURSORS": str(self.keys / "cursors")}

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        for p in self.keys.glob("*"):
            p.unlink()
        self.keys.rmdir()

    def run_tool(self, *args):
        return subprocess.run([str(TOOL), "arch1", *args], env=self.env, capture_output=True, text=True)

    def test_stale_is_a_dry_run_until_apply(self):
        dry = self.run_tool("--ack", "stale")
        self.assertEqual(dry.returncode, 0, dry.stderr)
        self.assertIn("org/repo#1:merged", dry.stdout)
        self.assertIn("org/repo#2:closed", dry.stdout)
        self.assertIn("dry run: 2 stale line(s)", dry.stderr)
        self.assertNotIn("seat-key-arch1", dry.stdout + dry.stderr)
        self.assertEqual([c["method"] for c in Inbox.calls], ["GET"])
        self.assertIn("stale=1", Inbox.calls[0]["path"])
        applied = self.run_tool("--ack", "stale", "--apply")
        self.assertEqual(applied.returncode, 0, applied.stderr)
        self.assertEqual(json.loads(applied.stdout)["acked"], 2)
        posts = [c for c in Inbox.calls if c["method"] == "POST"]
        self.assertEqual([c["body"] for c in posts], [
            {"id": "org/repo#1:merged"},
            {"id": "org/repo#2:closed"},
        ])
        self.assertNotIn("seat-key-arch1", applied.stdout + applied.stderr)
        self.assertNotIn("stale", json.dumps(posts))

    def test_upto_posts_the_receipt(self):
        r = self.run_tool("--upto", "org/repo#2:closed")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(Inbox.calls[-1]["method"], "POST")
        self.assertEqual(Inbox.calls[-1]["body"], {"upto": "org/repo#2:closed"})

    def test_a_failed_apply_still_prints_the_ids_it_acked(self):
        Inbox.fail_ids = {"org/repo#2:closed"}
        applied = self.run_tool("--ack", "stale", "--apply")
        self.assertNotEqual(applied.returncode, 0)
        receipt = json.loads(applied.stdout)
        self.assertEqual(receipt["ids"], ["org/repo#1:merged"])
        self.assertIn("HTTP 500", receipt["error"])
        self.assertNotIn("seat-key-arch1", applied.stdout + applied.stderr)

    def test_apply_without_stale_is_refused(self):
        refused = self.run_tool("--ack", "all", "--apply")
        self.assertNotEqual(refused.returncode, 0)
        self.assertEqual(Inbox.calls, [])
        bare = self.run_tool("--apply")
        self.assertNotEqual(bare.returncode, 0)
        self.assertEqual(Inbox.calls, [])
