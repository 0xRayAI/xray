"""bifrost init (#294): writes routing for any fleet, placeholders only, fails on an unrouted seat."""
import json, subprocess, sys, tempfile, unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "bifrost-init"


def run(*args, stdin=None):
    return subprocess.run([sys.executable, str(TOOL), *args], input=stdin, capture_output=True, text=True)


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
            self._fleet(d, ["@arch1"])
            r = run("--check", "--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json"))
            self.assertEqual(r.returncode, 1)
            self.assertIn("nickname-only route (no @login mention) for: arch1", r.stderr)

    def test_login_route_passes_and_table_prints(self):
        with tempfile.TemporaryDirectory() as d:
            self._fleet(d, ["@arch1", "@arch10x"])
            r = run("--check", "--table", "--seats", "arch1", "--routing-dir", d, "--nodes", str(Path(d) / "nodes.json"))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("arch1 | @arch1,@arch10x | arch10x | OK", r.stdout)

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
        self.assertIn("@arch1", roles["extra_seats"]["arch1"]["needles"])
        ev = {"kind": "issue_comment", "label": "please look", "mentions": ["arch10x[bot]"], "repo": "example-org/x",
              "number": 7, "t_ct": "2026-10-14T06:00:00-05:00", "id": "c-arch10x"}
        self.assertIn("arch1", {l.get("seat") for l in inbox_pass._direct_all(ev, roles) if l})
        ev2 = dict(ev, mentions=["arch10x"], id="c-arch10x-2")
        self.assertIn("arch1", {l.get("seat") for l in inbox_pass._direct_all(ev2, roles) if l})


class RoutingMap(unittest.TestCase):
    def test_init_writes_the_map_entry_with_login_and_aliases(self):
        with tempfile.TemporaryDirectory() as d:
            r = run("--seats", "forge,arch1", "--logins", "forge=forge0x1[bot],arch1=arch10x", "--routing-dir", d,
                    "--nodes", str(Path(d) / "none.json"), "--yes")
            self.assertEqual(r.returncode, 0, r.stderr)
            roles = json.loads((Path(d) / "inbox-roles.json").read_text())
            self.assertEqual(roles["routing"]["forge"], {"login": "forge0x1[bot]", "aliases": ["forge", "Forge"]})
            self.assertEqual(roles["routing"]["arch1"]["login"], "arch10x")
            self.assertIn("@forge0x1", roles["extra_seats"]["forge"]["needles"])
            self.assertIn("@arch10x", roles["extra_seats"]["arch1"]["needles"])

    def test_committed_map_lists_each_seat_once(self):
        roles = json.loads((TOOL.parent.parent / "feed" / "routing" / "inbox-roles.json").read_text())
        self.assertNotIn("aliases", roles)   # nicknames live on the map entry, not in a second list
        self.assertEqual(roles["routing"]["arch1"]["login"], "arch10x")
        self.assertEqual(roles["routing"]["forge"]["login"], "forge0x1[bot]")
        owner = {}
        for seat, e in roles["routing"].items():
            for a in e["aliases"]:
                self.assertEqual(owner.setdefault(a.lower(), seat), seat, a)   # a nickname belongs to one seat
