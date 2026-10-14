"""bifrost check: PASS/FAIL per rule with its OP-PROC line, non-zero on FAIL; --dry-run never writes; live steps hit only --repo/--target."""
import http.server, json, os, subprocess, sys, tempfile, threading, unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "bifrost-check"


def run(*args, env=None):
    return subprocess.run([sys.executable, str(TOOL), *args], capture_output=True, text=True, env={**os.environ, **(env or {})}, timeout=240)


def fleet(d, needles=("@arch1", "@arch10x")):
    (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"arch1": {"needles": list(needles)}}}))
    (Path(d) / "nodes.json").write_text(json.dumps({"arch10x[bot]": "arch1"}))
    return ["--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json")]


class Offline(unittest.TestCase):
    def test_dry_run_passes_and_skips_live(self):
        with tempfile.TemporaryDirectory() as d:
            r = run(*fleet(d), "--dry-run", "--only", "routing,deliver-sim,edit-sim,tripwire,deliver,ack")
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertRegex(r.stdout, r"PASS routing +\[grok-bot/OP-PROC\.md:\d+\]")
            self.assertIn("PASS tripwire", r.stdout)
            self.assertIn("PASS edit-sim", r.stdout)
            self.assertIn("would: post issue + @arch10x comment on <repo>", r.stdout)
            self.assertIn("SKIP deliver", r.stdout)

    def test_nickname_only_route_fails_nonzero(self):
        with tempfile.TemporaryDirectory() as d:
            r = run(*fleet(d, ["@arch1"]), "--only", "routing,deliver-sim")
            self.assertEqual(r.returncode, 1)
            self.assertIn("FAIL routing", r.stdout)
            self.assertIn("nickname-only arch1", r.stdout)
            self.assertIn("FAIL deliver-sim", r.stdout)   # a real @arch10x comment would not reach arch1

    def test_stale_phrase_fails(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "docs").mkdir()
            (Path(d) / "docs" / "a.md").write_text("ok\nForge files them into Arch1's Bifrost inbox.\n")
            (Path(d) / "tools").mkdir()
            (Path(d) / "tools" / "stale.json").write_text(json.dumps({"paths": ["docs"], "phrases": ["files them into Arch1's Bifrost inbox"]}))
            r = run(*fleet(d), "--only", "names", "--stale", str(Path(d) / "tools" / "stale.json"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("a.md:2", r.stdout)


class Board(unittest.TestCase):
    def test_board_findings(self):
        import importlib.machinery, importlib.util
        ld = importlib.machinery.SourceFileLoader("bc", str(TOOL)); m = importlib.util.module_from_spec(importlib.util.spec_from_loader("bc", ld)); ld.exec_module(m)
        cards = [{"repo": "o/r", "number": 1, "owner": "forge"}, {"repo": "o/r", "number": 1, "owner": "forge"},
                 {"repo": "o/r", "number": 2, "owner": "Somebody"}]
        missing, dupes, bad = m.board_findings(cards, [("o/r", 1), ("o/r", 2), ("o/r", 3)], {"forge", "arch1"})
        self.assertEqual((missing, dupes), (["o/r#3"], ["o/r#1 x2"]))
        self.assertEqual(bad, ["o/r#2 owner='Somebody'"])

    def test_board_page_and_owner_live(self):
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                if self.path.startswith("/cards"):
                    b = json.dumps({"cards": [{"repo": "o/r", "number": 1, "owner": "arch1"}]}).encode()
                elif self.path == "/healthz":
                    self.send_response(500); self.end_headers(); return
                else:
                    b = b"<html></html>"
                self.send_response(200); self.end_headers(); self.wfile.write(b)
        srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        with tempfile.TemporaryDirectory() as d:
            r = run(*fleet(d), "--only", "board-page,board-owner", "--target", f"http://127.0.0.1:{srv.server_port}")
        srv.shutdown()
        self.assertEqual(r.returncode, 1)
        self.assertIn("FAIL board-page", r.stdout); self.assertIn("/healthz 500", r.stdout)
        self.assertIn("PASS board-owner", r.stdout)


class Live(unittest.TestCase):
    """Fake gh on PATH + a fake Bifrost server: posts go to --repo, inbox reads/acks go to --target with the seat key."""
    def test_deliver_and_ack(self):
        acks, reads = [], []

        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def _send(self, obj):
                b = json.dumps(obj).encode(); self.send_response(200); self.end_headers(); self.wfile.write(b)
            def do_GET(self):
                reads.append((self.path, self.headers.get("Authorization")))
                self._send({"lines": [{"id": "l1", "type": "issue_open", "repo": "org/sandbox", "number": 5},
                                      {"id": "l2", "type": "issue_comment", "repo": "org/sandbox", "number": 5},
                                      {"id": "l2:edit:arch10x", "type": "comment_edit", "repo": "org/sandbox", "number": 5}]})
            def do_POST(self):
                acks.append((self.path, json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
                self._send({"ok": True})

        srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        with tempfile.TemporaryDirectory() as d:
            bind, keys = Path(d) / "bin", Path(d) / "keys"
            bind.mkdir(); keys.mkdir()
            (keys / "arch1.key").write_text("seat-secret\n")
            log = Path(d) / "gh.log"
            (bind / "gh").write_text(f"#!/bin/sh\necho \"$@\" >> {log}\n[ \"$2\" = create ] && echo https://github.com/org/sandbox/issues/5\n[ \"$2\" = comment ] && echo https://github.com/org/sandbox/issues/5#issuecomment-77\nexit 0\n")
            (bind / "gh").chmod(0o755)
            r = run(*fleet(d), "--only", "deliver,ack,addressed", "--repo", "org/sandbox", "--target", f"http://127.0.0.1:{srv.server_port}",
                    "--wait", "5", env={"PATH": f"{bind}:{os.environ['PATH']}", "SEAT_KEYS_DIR": str(keys)})
            srv.shutdown()
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn("PASS deliver", r.stdout)
            self.assertIn("PASS ack", r.stdout)
            self.assertNotIn("seat-secret", r.stdout + r.stderr)
            calls = log.read_text()
            self.assertIn("issue create --repo org/sandbox", calls)
            self.assertIn("issue comment 5 --repo org/sandbox --body @arch10x", calls)
            self.assertIn("api -X PATCH repos/org/sandbox/issues/comments/77 -f body=bifrost check edit @arch10x", calls)
            self.assertIn("PASS edit", r.stdout)
            self.assertIn("PASS addressed", r.stdout)
            self.assertIn("issue close 5 --repo org/sandbox", calls)
            self.assertEqual(acks, [("/inbox/arch1/ack", {"id": "l1"})])
            self.assertEqual(reads[0], ("/inbox/arch1", "Bearer seat-secret"))

    def test_resolve_fails_an_unresolved_login(self):
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                b = json.dumps({"ok": False, "seats": [{"seat": "arch1", "login": "arch10x", "aliases": [], "status": "ok"},
                                                      {"seat": "critic", "login": "nobody", "aliases": [], "status": "missing"},
                                                      {"seat": "mill", "login": None, "aliases": [], "status": "no_login"}]}).encode()
                self.send_response(200); self.end_headers(); self.wfile.write(b)
        srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        with tempfile.TemporaryDirectory() as d:
            r = run(*fleet(d), "--only", "resolve", "--target", f"http://127.0.0.1:{srv.server_port}")
        srv.shutdown()
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("FAIL resolve", r.stdout)
        self.assertIn("critic=@nobody missing", r.stdout)
        self.assertNotIn("mill", r.stdout)

    def test_live_steps_need_repo_and_target(self):
        with tempfile.TemporaryDirectory() as d:
            r = run(*fleet(d), "--only", "deliver,ack")
            self.assertEqual(r.returncode, 0)
            self.assertIn("SKIP deliver", r.stdout)
            self.assertIn("needs --repo and --target", r.stdout)


if __name__ == "__main__":
    unittest.main()
