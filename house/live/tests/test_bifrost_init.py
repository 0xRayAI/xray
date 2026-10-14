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

    def test_existing_rules_kept(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "inbox-roles.json").write_text(json.dumps({"extra_seats": {"forge": {"kinds": ["ci_fail"], "needles": ["merge ask"]}}}))
            self.assertEqual(run("--seats", "forge", "--routing-dir", d, "--yes").returncode, 0)
            f = json.loads((Path(d) / "inbox-roles.json").read_text())["extra_seats"]["forge"]
            self.assertEqual((f["kinds"], f["needles"]), (["ci_fail"], ["@forge", "merge ask"]))

    def test_bad_seat_name_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertNotEqual(run("--seats", "Bad Seat!", "--routing-dir", d, "--yes").returncode, 0)

    def test_our_routing_routes_every_roster_seat(self):
        self.assertEqual(run("--check").returncode, 0)


if __name__ == "__main__":
    unittest.main()
