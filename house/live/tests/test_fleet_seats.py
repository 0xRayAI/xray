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


def seats(label, kind="issue_comment", watch=False, **kw):
    """Seats an event routes to; watch=False leaves out the blanket comment-watch line (blinky) so asks are checked alone."""
    ev = {"kind": kind, "label": label, "repo": "example-org/x", "number": 262, "t_ct": "2026-10-13T05:00:00-05:00", "id": label + kind, **kw}
    return sorted({l.get("seat") for l in inbox._direct(ev, ROLES)
                   if l and (watch or not str(l.get("reason") or "").startswith("comment watch"))})


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
            self.assertEqual(inbox_pass.aliases_of(ROLES).get(name), sid, name)

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
        self.assertEqual(seats("Gate B run please"), [])          # Arch1 is outside the fleet: bare keywords never reach him
        self.assertEqual(seats("@arch10x Gate B run please"), ["arch1"])

    def test_pr_open_and_new_head_reach_critic_and_blinky_without_mentions(self):
        for kind in ("pr_open", "pr_update"):
            self.assertLessEqual({"blinky", "critic"}, set(seats("xray #270 opened", kind=kind, sha="abc123def4567")), kind)
        mine = seats("xray #270 opened", kind="pr_open", sha="abc123def4567", **{"from": "critic"})
        self.assertIn("blinky", mine); self.assertNotIn("critic", mine)

    def test_pr_head_lines_dedupe_by_repo_number_sha(self):
        ev = lambda i, sha: {"kind": "pr_update", "label": "push", "repo": "example-org/x", "number": 270, "sha": sha,
                             "t_ct": "2026-10-13T05:00:00-05:00", "id": i}
        ids = lambda e: {l["id"] for l in inbox._direct(e, ROLES) if l["seat"] == "critic"}
        self.assertEqual(ids(ev("a", "abc123def4567")), ids(ev("b", "abc123def4567")))
        self.assertNotEqual(ids(ev("a", "abc123def4567")), ids(ev("c", "fff123def4567")))

    def test_comment_on_merged_pr_reaches_author_seat_and_blinky_without_mention(self):
        got = seats("someone comment · xray #266", watch=True, kind="pr_comment", to="forge", pr_merged=True, **{"from": "Others"})
        self.assertEqual(got, ["blinky", "forge"])
        lines = [l for l in inbox._direct({"kind": "pr_comment", "label": "x comment · xray #266", "repo": "o/x", "number": 266,
                 "t_ct": "2026-10-13T05:00:00-05:00", "id": "c1", "to": "forge", "pr_merged": True}, ROLES)]
        self.assertTrue(all("merged PR" in l["reason"] for l in lines), lines)
        self.assertEqual(seats("x review comment · xray #266", watch=True, kind="review_comment", to="critic"), ["blinky", "critic"])

    def test_mill_targeted_events_land_in_mill_inbox(self):
        for label, kind in [("@mill please take #287", "issue_comment"), ("implement ask · xray #290", "pr_comment"),
                            ("dev ask: CI job for house/live", "issue_open"), ("mill wave 4 · xray #291", "issue_comment")]:
            self.assertIn("mill", seats(label, kind=kind), label)
        self.assertNotIn("mill", seats("unrelated comment", kind="issue_comment"))

    def test_issue_comment_reaches_issue_author_seat(self):
        self.assertEqual(seats("x comment · xray issue #9", watch=True, kind="issue_comment", to="forge"), ["blinky", "forge"])
        lines = inbox._direct({"kind": "issue_comment", "label": "x comment · xray issue #9", "repo": "o/x", "number": 9,
                               "t_ct": "2026-10-13T05:00:00-05:00", "id": "c9", "to": "forge"}, ROLES)
        self.assertIn("comment on your issue", [l["reason"] for l in lines if l["seat"] == "forge"])

    def test_issue_comment_reaches_blinky_and_body_mentions_route(self):
        self.assertEqual(seats("x comment · xray issue #9", watch=True, kind="issue_comment"), ["blinky"])
        self.assertEqual(seats("x comment · xray issue #9", watch=True, kind="issue_comment", mentions=["mill"]), ["blinky", "mill"])
        self.assertIn("forge", seats("xray #9 opened", kind="issue_open", mentions=["forge"]))

    def test_own_comment_not_routed_to_self_and_one_line_per_seat(self):
        got = [l["seat"] for l in inbox._direct({"kind": "pr_comment", "label": "c", "repo": "o/x", "number": 1, "id": "c2",
               "t_ct": "2026-10-13T05:00:00-05:00", "to": "forge", "from": "forge", "mentions": ["blinky"]}, ROLES)]
        self.assertEqual(sorted(got), ["blinky"])



class FleetRoster(unittest.TestCase):
    """burst-live roster is committed (fleet-roster.json + fleet-nodes.json, shipped by deploy.sh), never a hand-set var."""
    ROSTER = ["blinky", "critic", "forge", "mill", "herald", "magnet", "nibbler", "sound", "arch1"]

    def test_roster_is_the_nine_seats_and_blaze_is_not_one(self):
        import live_fleet
        seats, fold, board = live_fleet.load_seat_config(str(FEED / "fleet-roster.json"))
        self.assertEqual(sorted(board), sorted(self.ROSTER))
        self.assertEqual(sorted(seats), sorted(self.ROSTER))
        self.assertEqual(len(board), 9)
        self.assertNotIn("Blaze0x1", seats + board)

    def test_node_map_targets_roster_seats_only(self):
        nodes = json.loads((FEED / "fleet-nodes.json").read_text())
        self.assertTrue(set(nodes.values()) <= set(self.ROSTER) | {"CI", "Blaze"}, nodes)   # Blaze = the owner (htafolla), not a seat
        self.assertNotIn("Blaze0x1", nodes.values())
        self.assertEqual(nodes["forge0x1[bot]"], "forge"); self.assertEqual(nodes["arch10x[bot]"], "arch1")
        self.assertEqual((nodes["critic0x[bot]"], nodes["htafolla"]), ("critic", "Blaze"))
        self.assertNotIn("minime0x[bot]", nodes)   # workflow-run bot, not arch1: credits github unless a Seat: trailer says otherwise

    def test_deploy_ships_the_roster(self):
        sh = (FEED.parent / "app" / "assemble-collector.sh").read_text()   # deploy.sh assembles through it (#292)
        self.assertIn("fleet-roster.json", sh); self.assertIn("fleet-nodes.json", sh)



class Guardrails275(unittest.TestCase):
    """#275: pulses never route; unowned / arch1-only actionable events reach blinky; no self or double wakes."""
    def ev(self, kind, label="x", **kw):
        return {"kind": kind, "label": label, "repo": "example-org/x", "number": 275, "t_ct": "2026-10-13T09:00:00-05:00",
                "id": f"{kind}:{label}", **kw}

    def routed(self, e):
        return sorted({l["seat"] for l in inbox._direct(e, ROLES) if l})

    def test_pulses_never_route(self):
        for k in ("prompt_message", "prompt", "turn", "subagent", "watcher", "cloud_agent", "cloud_launch"):
            self.assertEqual(self.routed(self.ev(k, "@forge @blinky merge ask", **{"from": "Lead", "to": "forge"})), [], k)

    def test_unowned_review_goes_to_coordinator(self):
        self.assertEqual(self.routed(self.ev("review", "looks fine")), ["blinky"])

    def test_push_and_ci_unowned_stay_quiet(self):
        self.assertEqual(self.routed(self.ev("ci_pass", "green")), [])

    def test_arch1_lines_are_not_copied_to_coordinator(self):
        roles = {k: v for k, v in ROLES.items() if k != "comment_watch"}   # so blinky could only come from the fallback
        lines = inbox._direct(self.ev("issue_comment", "@arch10x deep-review"), roles)
        self.assertEqual(sorted(l["seat"] for l in lines), ["arch1"])

    def test_no_self_wake_by_bot_login(self):
        self.assertNotIn("forge", self.routed(self.ev("pr_comment", "@forge merge ask", actor="forge0x1[bot]")))
        os.environ["SEAT_BOTS"] = json.dumps({"mill": ["mill-bot"]})
        try:
            self.assertNotIn("mill", self.routed(self.ev("pr_comment", "@mill rebase ask", actor="mill-bot")))
        finally:
            del os.environ["SEAT_BOTS"]

    def test_no_double_wake_when_seat_watches(self):
        os.environ["SEAT_WATCHERS"] = json.dumps({"critic": {"repos": ["example-org/x"], "kinds": ["pr_comment"]}})
        try:
            self.assertNotIn("critic", self.routed(self.ev("pr_comment", "@critic re-Light")))
            self.assertIn("critic", self.routed(self.ev("issue_comment", "@critic re-Light")))
        finally:
            del os.environ["SEAT_WATCHERS"]

    def test_empty_watcher_entry_skips_nothing(self):
        for entry in ({}, {"repos": [], "kinds": []}):
            os.environ["SEAT_WATCHERS"] = json.dumps({"critic": entry})
            try:
                self.assertIn("critic", self.routed(self.ev("pr_comment", "@critic re-Light")), entry)
            finally:
                del os.environ["SEAT_WATCHERS"]

    def test_lead_prompt_is_a_pulse(self):
        self.assertEqual(self.routed(self.ev("prompt_message", "@critic re-Light", **{"from": "Lead"})), [])

    def test_bot_logins_cached_until_seat_bots_changes(self):
        a = inbox_pass.bot_logins()
        self.assertIs(a, inbox_pass.bot_logins())
        os.environ["SEAT_BOTS"] = json.dumps({"mill": "mill-bot"})
        try:
            b = inbox_pass.bot_logins()
            self.assertIsNot(a, b)
            self.assertEqual(b.get("mill-bot"), "mill")
        finally:
            del os.environ["SEAT_BOTS"]
        self.assertNotIn("mill-bot", inbox_pass.bot_logins())


if __name__ == "__main__":
    unittest.main()
