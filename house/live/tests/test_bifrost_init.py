"""bifrost init (#294): writes routing for any fleet, placeholders only, fails on an unrouted seat."""
import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "bifrost-init"


def run(*args, stdin=None):
    env = {**os.environ, "BIFROST_GITHUB_API": os.environ.get("TEST_GITHUB_API", "http://127.0.0.1:9")}
    return subprocess.run([sys.executable, str(TOOL), *args], input=stdin, capture_output=True, text=True, env=env)


class BifrostInit(unittest.TestCase):
    def test_new_fleet_gets_a_route_per_seat_and_placeholder_webhooks(self):
        with tempfile.TemporaryDirectory() as d:
            r = run("--seats", "alpha,beta,gamma", "--no-wake", "gamma", "--routing-dir", d, "--yes")
            self.assertEqual(r.returncode, 0, r.stderr)
            roles = json.loads((Path(d) / "inbox-roles.json").read_text())
            for s in ("alpha", "beta", "gamma"):
                self.assertIn(f"@{s}", roles["extra_seats"][s]["needles"])
            hooks = json.loads((Path(d) / "seat-webhooks.json").read_text())
            self.assertEqual(sorted(hooks), ["alpha", "beta"])
            self.assertEqual(hooks["alpha"]["key_env"], "WAKE_KEY_ALPHA")
            self.assertNotIn("http", json.dumps(hooks))
            self.assertEqual(run("--check", "--seats", "alpha,beta,gamma", "--routing-dir", d).returncode, 0)

    def test_interactive_wake_url_never_written(self):
        with tempfile.TemporaryDirectory() as d:
            r = run("--routing-dir", d, stdin="one,two\nhttps://hooks.example/secret-path\n\n")
            self.assertEqual(r.returncode, 0, r.stderr)
            text = (Path(d) / "seat-webhooks.json").read_text() + (Path(d) / "inbox-roles.json").read_text()
            self.assertNotIn("secret-path", text)
            self.assertEqual(sorted(json.loads((Path(d) / "seat-webhooks.json").read_text())), ["one"])

    def test_check_fails_on_unrouted_seat(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"forge": {"needles": ["@forge"]}, "mill": {}}}))
            r = run("--check", "--seats", "forge,mill", "--routing-dir", d)
            self.assertEqual(r.returncode, 1)
            self.assertIn("no route for seat(s): mill", r.stderr)

    def test_check_fails_on_rule_to_seat_outside_fleet(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"forge": {"needles": ["@forge"]}},
                                                                   "seats": {"builder": {"seat": "ghost"}}}))
            r = run("--check", "--seats", "forge", "--routing-dir", d)
            self.assertEqual(r.returncode, 1)
            self.assertIn("not in the fleet: ghost", r.stderr)

    def test_existing_rules_kept(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"forge": {"kinds": ["ci_fail"], "needles": ["merge ask"]}}}))
            self.assertEqual(run("--seats", "forge", "--routing-dir", d, "--yes").returncode, 0)
            f = json.loads((Path(d) / "inbox-roles.json").read_text())["extra_seats"]["forge"]
            self.assertEqual((f["kinds"], f["needles"]), (["ci_fail"], ["@forge", "@forge0x1", "merge ask"]))

    def test_bad_seat_name_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertNotEqual(run("--seats", "Bad Seat!", "--routing-dir", d, "--yes").returncode, 0)

    def test_our_routing_routes_every_roster_seat(self):
        self.assertEqual(run("--check").returncode, 0)


if __name__ == "__main__":
    unittest.main()


class MentionAudit(unittest.TestCase):
    """Every route's mention matches the seat's real GitHub login (fleet-nodes.json), not only its nickname."""
    def _fleet(self, d, needles):
        (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"arch1": {"needles": needles}}}))
        (Path(d) / "nodes.json").write_text(json.dumps({"arch10x[bot]": "arch1"}))

    def test_nickname_only_route_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._fleet(d, ["@arch"])
            r = run("--check", "--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("nickname-only route (no @login mention) for: arch1", r.stderr)

    def test_login_route_passes_and_table_prints(self):
        with tempfile.TemporaryDirectory() as d:
            self._fleet(d, ["@arch10x"])
            r = run("--check", "--table", "--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json"))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("arch1 | @arch10x | arch10x | unverified | OK", r.stdout)

    def test_init_adds_the_login_mention(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "nodes.json").write_text(json.dumps({"alpha0x[bot]": "alpha"}))
            r = run("--seats", "alpha,beta", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json"), "--yes")
            self.assertEqual(r.returncode, 0, r.stderr)
            roles = json.loads((Path(d) / "inbox-roles.json").read_text())
            self.assertEqual(roles["extra_seats"]["alpha"]["needles"][:2], ["@alpha", "@alpha0x"])

    def test_committed_routing_reaches_arch1_on_arch10x(self):
        sys.path.insert(0, str(TOOL.parent.parent / "feed"))
        import inbox_pass
        roles = json.loads((TOOL.parent.parent / "feed" / "routing" / "inbox-roles.json").read_text())
        self.assertEqual(roles["extra_seats"]["arch1"]["needles"], ["@arch10x"])   # @arch1 is someone else's account
        ev = {"kind": "issue_comment", "label": "please look", "mentions": ["arch10x[bot]"], "repo": "example-org/x",
              "number": 7, "t_ct": "2026-10-14T06:00:00-05:00", "id": "c-arch10x"}
        self.assertIn("arch1", {l.get("seat") for l in inbox_pass._direct_all(ev, roles) if l})
        ev2 = dict(ev, mentions=["arch10x"], id="c-arch10x-2")
        self.assertIn("arch1", {l.get("seat") for l in inbox_pass._direct_all(ev2, roles) if l})


class RoutingMap(unittest.TestCase):
    def test_init_writes_the_map_entry_with_login_and_aliases(self):
        with tempfile.TemporaryDirectory() as d:
            r = run("--seats", "forge,arch1", "--logins", "forge=forge0x1[bot],arch1=arch10x[bot]", "--routing-dir", d,
                    "--nodes", str(Path(d) / "none.json"), "--yes")
            self.assertEqual(r.returncode, 0, r.stderr)
            roles = json.loads((Path(d) / "inbox-roles.json").read_text())
            self.assertEqual(roles["routing"]["forge"], {"login": "forge0x1[bot]", "aliases": ["forge", "Forge"]})
            self.assertEqual(roles["routing"]["arch1"]["login"], "arch10x[bot]")
            self.assertIn("@forge0x1", roles["extra_seats"]["forge"]["needles"])
            self.assertIn("@arch10x", roles["extra_seats"]["arch1"]["needles"])

    def test_committed_map_lists_each_seat_once(self):
        roles = json.loads((TOOL.parent.parent / "feed" / "routing" / "inbox-roles.json").read_text())
        self.assertNotIn("aliases", roles)   # nicknames live on the map entry, not in a second list
        self.assertEqual(roles["routing"]["arch1"]["login"], "arch10x[bot]")
        self.assertEqual(roles["routing"]["herald"]["login"], "herald0x[bot]")
        self.assertIsNone(roles["routing"]["blinky"]["login"])
        self.assertEqual(roles["routing"]["forge"]["login"], "forge0x1[bot]")
        owner = {}
        for seat, e in roles["routing"].items():
            for a in e["aliases"]:
                self.assertEqual(owner.setdefault(a.lower(), seat), seat, a)   # a nickname belongs to one seat


class OutsideFleet(unittest.TestCase):
    """Arch1 is outside the fleet: reached only by an explicit @arch10x, never by bare keywords or a fallback copy."""
    def test_audit_flags_bare_keywords_for_an_outside_seat(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "inbox-roles.json").write_text(json.dumps({"routing": {"arch1": {"login": "arch10x", "aliases": [], "outside": True}},
                "extra_seats": {"arch1": {"needles": ["@arch10x", "gate b"]}}, "fallback": {"seat": "arch1", "from": ["arch1"]}}))
            r = run("--check", "--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "none.json"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("arch1: bare keyword(s) gate b", r.stderr)
            self.assertIn("arch1: fallback copies its lines", r.stderr)

    def _seats(self, ev):
        sys.path.insert(0, str(TOOL.parent.parent / "feed"))
        import inbox_pass
        roles = json.loads((TOOL.parent.parent / "feed" / "routing" / "inbox-roles.json").read_text())
        return [(l.get("seat"), l.get("reason")) for l in inbox_pass._direct_all(ev, roles) if l]

    def test_gate_b_without_at_reaches_neither_arch1_nor_blinky(self):
        ev = {"kind": "pr_comment", "label": "Gate B run please, deep review", "repo": "example-org/x", "number": 3,
              "t_ct": "2026-10-14T06:00:00-05:00", "id": "c-gateb"}
        got = self._seats(ev)
        self.assertNotIn("arch1", {s for s, _ in got})
        self.assertEqual([r for s, r in got if s == "blinky"], ["comment watch (CoS)"])   # only the every-comment watch, no fallback copy

    def test_at_arch10x_reaches_arch1_only(self):
        base = {"kind": "pr_comment", "label": "please look", "repo": "example-org/x", "number": 3, "t_ct": "2026-10-14T06:00:00-05:00"}
        plain = self._seats(dict(base, id="c-plain"))
        got = self._seats(dict(base, id="c-at", mentions=["arch10x"]))
        self.assertEqual(sorted(set(got) - set(plain)), [("arch1", "explicit @arch10x ask for Arch1 (outside the fleet)")])


class LoginResolve(unittest.TestCase):
    """--check resolves every non-null login on the GitHub users API (mocked fetch: 200 / 404 / network error)."""
    def _mod(self):
        import importlib.machinery, importlib.util
        ld = importlib.machinery.SourceFileLoader("bi", str(TOOL))
        m = importlib.util.module_from_spec(importlib.util.spec_from_loader("bi", ld)); ld.exec_module(m)
        return m

    def test_status_from_mocked_fetch(self):
        import io, urllib.error
        m = self._mod()
        class R:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *a): return False
        seen = []
        def opener(req, timeout):
            seen.append((req.full_url, req.get_header("Authorization")))
            if req.full_url.endswith("/users/ghost"):
                raise urllib.error.HTTPError(req.full_url, 404, "nf", {}, io.BytesIO(b""))
            if req.full_url.endswith("/users/down"):
                raise OSError("network")
            return R()
        os.environ.pop("GITHUB_TOKEN", None)
        self.assertEqual(m.gh_user_status("forge0x1[bot]", opener), "ok")
        self.assertEqual(m.gh_user_status("ghost", opener), "missing")
        self.assertEqual(m.gh_user_status("down", opener), "unverified")
        self.assertTrue(seen[0][0].endswith("/users/forge0x1%5Bbot%5D")); self.assertIsNone(seen[0][1])

    def test_check_fails_on_404_and_names_the_seat(self):
        import http.server, threading
        class H(http.server.BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_GET(self):
                self.send_response(200 if self.path == "/users/forge0x1%5Bbot%5D" else 404); self.end_headers(); self.wfile.write(b"{}")
        srv = http.server.HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            with tempfile.TemporaryDirectory() as d:
                (Path(d) / "inbox-roles.json").write_text(json.dumps({
                    "routing": {"forge": {"login": "forge0x1[bot]", "aliases": []}, "herald": {"login": "herald0x1[bot]", "aliases": []}},
                    "extra_seats": {"forge": {"needles": ["@forge0x1"]}, "herald": {"needles": ["@herald0x1"]}}}))
                os.environ["TEST_GITHUB_API"] = f"http://127.0.0.1:{srv.server_port}"
                r = run("--check", "--table", "--seats", "forge,herald", "--routing-dir", d, "--nodes", str(Path(d) / "none.json"))
        finally:
            os.environ.pop("TEST_GITHUB_API", None); srv.shutdown()
        self.assertEqual(r.returncode, 1)
        self.assertIn("login not found on GitHub (404) for: herald (herald0x1[bot])", r.stderr)
        self.assertIn("forge | @forge0x1 | forge0x1 | ok | OK", r.stdout)
