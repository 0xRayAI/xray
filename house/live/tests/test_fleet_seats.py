"""Fleet inbox seats: each seat's explicit ask routes to that seat only; an unrelated comment routes nowhere."""
import json, os, sys, unittest
from pathlib import Path
FEED = Path(os.environ.get("MESH_FEED_DIR", Path(__file__).resolve().parent.parent / "feed"))
sys.path.insert(0, str(FEED))
import inbox_pass, inbox  # noqa: E402,F401  (inbox_pass adds extra_seats routing)

ROLES = json.loads((FEED / "routing" / "inbox-roles.json").read_text())
SEATS = ["arch1", "forge", "critic", "mill", "blinky", "herald", "nibbler", "sound", "magnet"]
ASKS = {"forge": "@forge merge ask #262", "critic": "@critic re-Light please", "mill": "@mill rebase ask #263",
        "blinky": "@blinky board update", "herald": "@herald Dist post", "nibbler": "@nibbler take a look",
        "sound": "@sound check this", "magnet": "@magnet hangar listing", "arch1": "@arch1 deep-review #262"}


def seats(label, kind="issue_comment", **kw):
    ev = {"kind": kind, "label": label, "repo": "example-org/x", "number": 262, "t_ct": "2026-10-13T05:00:00-05:00", "id": label + kind, **kw}
    return sorted({l.get("seat") for l in inbox._direct(ev, ROLES) if l})


class FleetSeats(unittest.TestCase):
    def test_every_seat_has_a_route(self):
        for s in SEATS:
            self.assertIn(s, ROLES["extra_seats"], s)
            self.assertTrue(ROLES["extra_seats"][s], s)

    def test_explicit_ask_routes_to_that_seat_only(self):
        for s, label in ASKS.items():
            self.assertEqual(seats(label), [s], label)

    def test_unrelated_and_bare_names_route_nowhere(self):
        self.assertEqual(seats("unrelated comment"), [])
        self.assertEqual(seats("forge critic mill blinky herald nibbler sound magnet arch1 mentioned in passing"), [])

    def test_forge_gets_merges_into_main_and_bifrost(self):
        self.assertIn("forge", seats("merged", kind="merged", base="main"))
        self.assertIn("forge", seats("merged", kind="merged", base="bifrost/main"))
        self.assertNotIn("forge", seats("merged", kind="merged", base="feature/x"))

    def test_critic_gets_review_requests(self):
        self.assertIn("critic", seats("review wanted", kind="review_requested"))

    def test_aliases(self):
        for name, sid in {"forge": "forge", "critic": "critic", "mill": "mill", "blinky": "blinky", "herald": "herald",
                          "Nibbler": "nibbler", "sound": "sound", "magnet": "magnet", "Arch1": "arch1"}.items():
            self.assertEqual(ROLES["aliases"].get(name), sid, name)

    # N3 (#262 handoff): critic's four checks; each fails if its fix is reverted.
    def test_n3_1_handle_whole_word(self):
        self.assertEqual(seats("@soundboard check this"), [])
        self.assertEqual(seats("@sound check this"), ["sound"])

    def test_n3_2_own_verdict_not_in_own_inbox(self):
        self.assertEqual(seats("@critic re-Light PASS", **{"from": "critic"}), [])
        self.assertEqual(seats("@critic re-Light PASS", **{"from": "forge"}), ["critic"])

    def test_n3_3_aliases_read_for_actor(self):
        self.assertEqual(seats("@blinky board update", **{"from": "Blinky"}), [])
        self.assertEqual(seats("@arch1 deep-review #262", **{"from": "Others", "actor": "Arch1"}), [])

    def test_n3_4_gate_b_whole_phrase(self):
        self.assertEqual(seats("gate bypass for the deploy"), [])
        self.assertEqual(seats("Gate B run please"), ["arch1"])


if __name__ == "__main__":
    unittest.main()
