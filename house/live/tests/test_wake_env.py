"""Hotfix: WAKE-ROUTINE's export line + commands work in a fresh shell (env -i), and live-inbox fails loudly without env."""
import json, os, re, shutil, subprocess, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TEMPLATE = ROOT / "grok-bot" / "templates" / "house" / "fleet" / "WAKE-ROUTINE.md"
TOOL = Path(__file__).resolve().parents[1] / "tools" / "live-inbox"
BASE_PATH = "/usr/local/bin:/usr/bin:/bin"


class Hit(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        self.server.posts.append((self.path, json.loads(self.rfile.read(n) or b"{}")))
        self.send_response(202); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, *a):
        pass


def export_line():
    blocks = re.findall(r"```bash\n(.*?)```", TEMPLATE.read_text(), re.S)
    lines = [l for b in blocks for l in b.splitlines() if l.startswith("export ")]
    return lines[0] if lines else ""


class WakeEnvFreshShell(unittest.TestCase):
    def setUp(self):
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), Hit)
        self.srv.posts = []
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        self.home = Path(self.tmp.name)
        (self.home / ".burst" / "bin").mkdir(parents=True)
        (self.home / ".burst" / "seat-keys").mkdir()
        (self.home / ".burst" / "seat-keys" / "forge.key").write_text("k-test\n")
        shutil.copy(TOOL, self.home / ".burst" / "bin" / "live-inbox")

    def tearDown(self):
        self.srv.shutdown(); self.srv.server_close(); self.tmp.cleanup()

    def sh(self, script, **env):
        return subprocess.run(["env", "-i", f"HOME={self.home}", f"PATH={BASE_PATH}", *[f"{k}={v}" for k, v in env.items()],
                              "bash", "--noprofile", "--norc", "-c", script], capture_output=True, text=True, timeout=20)

    def test_template_ships_export_with_defaults(self):
        line = export_line()
        self.assertTrue(line, "WAKE-ROUTINE.md has no ```bash export line")
        for want in ("PATH=", "https://burst-live-production.up.railway.app", "SEAT_KEYS_DIR=", "LIVE_CURSORS=", ".burst/bin"):
            self.assertIn(want, line)

    def test_wake_commands_run_in_fresh_shell(self):
        url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        r = self.sh(export_line() + "\nlive-inbox forge --turn start --tag wake && live-inbox forge --turn end --tag wake", LIVE_URL=url)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([p for p, _ in self.srv.posts], ["/activity", "/activity"])
        self.assertNotIn("k-test", r.stdout + r.stderr)

    def test_missing_env_fails_loudly(self):
        r = self.sh(f"{self.home}/.burst/bin/live-inbox forge --turn end --tag wake")
        self.assertEqual(r.returncode, 2)
        for name in ("LIVE_URL", "SEAT_KEYS_DIR", "LIVE_CURSORS"):
            self.assertIn(name, r.stderr)
        self.assertEqual(self.srv.posts, [])


if __name__ == "__main__":
    unittest.main()
