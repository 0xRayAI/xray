"""Hotfix: WAKE-ROUTINE's export line + commands work in a fresh shell (env -i), and live-inbox fails loudly without env."""
import json, os, re, subprocess, tempfile, threading, unittest
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


def bash_block():
    blocks = re.findall(r"```bash\n(.*?)```", TEMPLATE.read_text(), re.S)
    return blocks[0] if blocks else ""


def export_line():
    lines = [line for line in bash_block().splitlines() if line.startswith("export ")]
    return "\n".join(lines)


class WakeEnvFreshShell(unittest.TestCase):
    def setUp(self):
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0), Hit)
        self.srv.posts = []
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        self.home = Path(self.tmp.name)
        (self.home / ".burst" / "seat-keys").mkdir(parents=True)
        (self.home / ".burst" / "seat-keys" / "forge.key").write_text("k-test\n")

    def tearDown(self):
        self.srv.shutdown(); self.srv.server_close(); self.tmp.cleanup()

    def sh(self, script, **env):
        return subprocess.run(["env", "-i", f"HOME={self.home}", f"PATH={BASE_PATH}", *[f"{k}={v}" for k, v in env.items()],
                              "bash", "--noprofile", "--norc", "-c", script], capture_output=True, text=True, timeout=20)

    def test_template_ships_export_with_defaults(self):
        block = bash_block()
        self.assertIn("house/live/tools/live-inbox", block)
        self.assertNotIn("export PATH", block)
        self.assertNotIn("LIVE_INBOX_BIN", block)
        self.assertIn('export LIVE_CURSORS="$HOME/.burst/cursors"', block)
        self.assertNotIn("LIVE_CURSORS:-", block)
        self.assertIn('"$INBOX" --migrate-cursors', block)
        self.assertIn("/home/box/burst-run/cursors", block)
        self.assertIn("/workspace/.cursors", block)
        self.assertIn("https://bifrost.0xray.dev", export_line())
        self.assertIn("SEAT_KEYS_DIR=", export_line())

    def test_wake_commands_run_in_fresh_shell(self):
        url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        tool = ROOT / "house" / "live" / "tools" / "live-inbox"
        r = self.sh(export_line() + f"\n{tool} forge --turn start --tag wake && {tool} forge --turn end --tag wake", LIVE_URL=url, XRAY_MAIN=str(ROOT))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([p for p, _ in self.srv.posts], ["/activity", "/activity"])
        self.assertNotIn("k-test", r.stdout + r.stderr)

    def test_documented_command_runs_as_written(self):
        recorded = self.home / "ran.txt"
        main = self.home / "main"
        stub = main / "house" / "live" / "tools" / "live-inbox"
        stub.parent.mkdir(parents=True)
        stub.write_text("#!/bin/bash\nprintf '%s\\n' \"$LIVE_URL\" \"$LIVE_CURSORS\" \"$SEAT_KEYS_DIR\" \"$WAKE_RUN\" \"$*\" >> \"$OUT\"\n")
        stub.chmod(0o755)
        script = bash_block().replace("<seat>", "forge")
        self.assertIn("export LIVE_URL=", bash_block())
        self.assertIn('export LIVE_CURSORS="$HOME/.burst/cursors"', bash_block())
        self.assertIn("house/live/tools/live-inbox", bash_block())
        self.assertIn('trap \'"$INBOX" <seat> --turn end --tag wake; "$INBOX" <seat> --release\' EXIT', bash_block())
        r = self.sh(script, OUT=str(recorded), XRAY_MAIN=str(main), LIVE_CURSORS="/workspace/.cursors")
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        rows = recorded.read_text().splitlines()
        self.assertGreaterEqual(len(rows), 15, rows)
        url, cursors, keys, wake_run, args = rows[:5]
        self.assertEqual(url, "https://bifrost.0xray.dev")
        self.assertEqual(cursors, str(self.home / ".burst" / "cursors"))
        self.assertEqual(keys, str(self.home / ".burst" / "seat-keys"))
        self.assertRegex(wake_run, r"^\d+$")
        self.assertEqual(args, "forge")
        self.assertEqual(rows[9], "forge --turn end --tag wake")
        self.assertEqual(rows[14], "forge --release")

    def test_documented_ack_runs_with_seat(self):
        text = TEMPLATE.read_text()
        self.assertIn("live-inbox <seat> --ack <id>", text)
        recorded = self.home / "ack.txt"
        main = self.home / "main"
        stub = main / "house" / "live" / "tools" / "live-inbox"
        stub.parent.mkdir(parents=True)
        stub.write_text("#!/bin/bash\nprintf '%s\\n' \"$LIVE_URL\" \"$LIVE_CURSORS\" \"$SEAT_KEYS_DIR\" \"$*\" > \"$OUT\"\n")
        stub.chmod(0o755)
        script = export_line().replace("<seat>", "forge") + "\n" + f'"{stub}" forge --ack line-1'
        r = self.sh(script, OUT=str(recorded), XRAY_MAIN=str(main), LIVE_CURSORS="/home/box/burst-run/cursors")
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        url, cursors, keys, args = recorded.read_text().splitlines()
        self.assertEqual(url, "https://bifrost.0xray.dev")
        self.assertEqual(cursors, str(self.home / ".burst" / "cursors"))
        self.assertEqual(keys, str(self.home / ".burst" / "seat-keys"))
        self.assertEqual(args, "forge --ack line-1")

    def test_wake_block_migrates_when_the_seat_file_is_split(self):
        recorded = self.home / "ran.txt"
        main = self.home / "main"
        stub = main / "house" / "live" / "tools" / "live-inbox"
        stub.parent.mkdir(parents=True)
        stub.write_text("#!/bin/bash\nprintf '%s\\n' \"$*\" >> \"$OUT\"\n")
        stub.chmod(0o755)
        cursors = self.home / ".burst" / "cursors"
        cursors.mkdir(parents=True)
        (cursors / "forge.txt").write_text("home\n")
        legacy = self.home / "legacy"
        (legacy / "workspace" / ".cursors").mkdir(parents=True)
        (legacy / "workspace" / ".cursors" / "forge.txt").write_text("work\n")
        script = bash_block().replace("<seat>", "forge")
        r = self.sh(script, OUT=str(recorded), XRAY_MAIN=str(main), LIVE_CURSOR_ROOT=str(legacy))
        self.assertEqual(r.returncode, 0, r.stderr + r.stdout)
        rows = recorded.read_text().splitlines()
        self.assertEqual(rows[0], "--migrate-cursors")
        self.assertEqual(rows[1], "forge")
        self.assertEqual(rows[2], "forge --turn end --tag wake")
        self.assertEqual(rows[3], "forge --release")

    def test_migrate_reads_legacy_folders_under_the_root(self):
        legacy = self.home / "legacy"
        work = legacy / "workspace" / ".cursors"
        work.mkdir(parents=True)
        home_cur = self.home / ".burst" / "cursors"
        home_cur.mkdir(parents=True)
        (home_cur / "forge.txt").write_text("0xrayai/xray#1|aaaaaaa|ready\n")
        (work / "forge.txt").write_text("0xrayai/xray#2|bbbbbbb|ready\n")
        r = self.sh(
            f"{TOOL} --migrate-cursors",
            LIVE_URL="http://127.0.0.1:9",
            SEAT_KEYS_DIR=str(self.home / ".burst" / "seat-keys"),
            LIVE_CURSOR_ROOT=str(legacy),
        )
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("migrated forge 2 keys", r.stdout)
        self.assertFalse((work / "forge.txt").exists())
        self.assertTrue((work / "forge.txt.migrated").is_file())
        text = set((home_cur / "forge.txt").read_text().splitlines())
        self.assertEqual(text, {"0xrayai/xray#1|aaaaaaa|ready", "0xrayai/xray#2|bbbbbbb|ready"})

    def test_missing_env_fails_loudly(self):
        r = self.sh(f"{TOOL} forge --turn end --tag wake")
        self.assertEqual(r.returncode, 2)
        for name in ("LIVE_URL", "SEAT_KEYS_DIR"):
            self.assertIn(name, r.stderr)
        self.assertNotIn("LIVE_CURSORS", r.stderr)
        self.assertEqual(self.srv.posts, [])


if __name__ == "__main__":
    unittest.main()
