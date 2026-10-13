"""Routing lands on our 9 seats only (lap 2 P1: issue #281 routed to the kit's sample 'triager', an inbox nobody reads).
(a) every seat reference in feed/routing/inbox-roles.json is one of our 9 (fleet-roster.json); kit role rules map to ours
(b) a GitHub issue-opened event lands in blinky's inbox  (c) pr-opened and new-head events land in critic's inbox
(d) a line routed to an unknown seat falls back to blinky."""
import json, os, sys, tempfile, unittest
from datetime import datetime, timezone
from pathlib import Path

FEED = Path(__file__).resolve().parent.parent / "feed"
sys.path.insert(0, str(FEED))
os.environ.setdefault("MESH_RUN", tempfile.mkdtemp())
import inbox_pass  # noqa: E402  (patches routing/inbox.py: our seats, kit role -> seat)
inbox = inbox_pass.inbox

OURS = set(json.loads((FEED / "fleet-roster.json").read_text())["seats"])
ROLES = json.loads((FEED / "routing" / "inbox-roles.json").read_text())
KIT_ROLES = {"reviewer", "builder", "tester", "operator", "coord"}
R = "0xRayAI/xray"


def ev(kind, n, **kw):
    return {"id": f"{R}#{n}:{kind}:{kw.get('sha', '')}", "t_ct": datetime.now(timezone.utc).isoformat(), "kind": kind,
            "repo": R, "number": n, "label": f"{kind} #{n}", "source": f"https://github.com/{R}/issues/{n}", **kw}


def deliver(events, roles=ROLES):
    with tempfile.TemporaryDirectory() as d:
        inbox.deliver(events, directory=Path(d), roles=roles, activity=[])
        return {p.stem: [json.loads(x) for x in p.read_text().splitlines()] for p in Path(d).glob("*.jsonl")}


class EverySeatIsOurs(unittest.TestCase):
    def test_roster_is_our_nine(self):
        self.assertEqual(OURS, {"blinky", "critic", "forge", "mill", "arch1", "herald", "magnet", "nibbler", "sound"})

    def test_every_seat_reference(self):
        refs = [("mirror_seat", ROLES["mirror_seat"]), ("fallback.seat", ROLES["fallback"]["seat"])]
        refs += [("watcher_seats", s) for s in ROLES.get("watcher_seats") or []]
        refs += [("fallback.from", s) for s in ROLES["fallback"].get("from") or []]
        refs += [("aliases." + k, v) for k, v in ROLES["aliases"].items()]
        refs += [("extra_seats", k) for k in ROLES["extra_seats"]]
        refs += [("pr_heads", k) for k in ROLES["pr_heads"]["seats"]]
        refs += [("comment_watch", k) for k in ROLES["comment_watch"]["seats"]]
        self.assertEqual(set(ROLES["seats"]), KIT_ROLES)   # role rules keyed by kit role, each mapped to one of ours or off
        for role, rule in ROLES["seats"].items():
            if not rule.get("off"):
                refs.append(("seats." + role + ".seat", rule.get("seat")))
        bad = [(where, s) for where, s in refs if s not in OURS]
        self.assertEqual(bad, [], "seat references outside our 9")

    def test_server_and_key_defaults_name_no_sample_seat(self):
        src = (FEED.parent / "app" / "server.mjs").read_text()
        ids = src[src.index("const SEAT_IDS = ["):].split("];", 1)[0]
        keys = [l for l in (FEED / "seat_keys.sh").read_text().splitlines() if l.startswith("DEFAULT_SEATS=")][0]
        for sample in ("reviewer", "tester", "'qa'", "coord", "operator", "triager", "growth", "seat-c", "chatbot", "seo-", "qa-one"):
            self.assertNotIn(sample, ids); self.assertNotIn(sample.strip("'"), keys.split("#")[0])


class RealEventsLand(unittest.TestCase):
    def test_issue_opened_to_blinky(self):
        got = deliver([ev("issue_open", 281)])
        self.assertIn("blinky", got); self.assertEqual(got["blinky"][0]["number"], 281)
        self.assertTrue(set(got) <= OURS, got.keys())

    def test_pr_open_and_new_head_to_critic(self):
        got = deliver([ev("pr_open", 280), ev("pr_update", 280, sha="6addc51c0000aaaa")])
        self.assertEqual(len(got["critic"]), 2); self.assertEqual(len(got["blinky"]), 2)   # blinky heads-up, as #266
        self.assertTrue(set(got) <= OURS, got.keys())

    def test_deploy_and_ci_fail_to_forge(self):
        got = deliver([ev("deploy_fail", 0), ev("ci_fail", 280, sha="abc")])
        self.assertEqual(len(got.get("forge", [])), 2); self.assertTrue(set(got) <= OURS, got.keys())

    def test_unknown_seat_falls_back_to_blinky(self):
        roles = {"extra_seats": {"ghost": {"kinds": ["review_requested"], "reason": "x"}}, "fallback": {"seat": "blinky", "from": ["arch1"]}}
        got = deliver([ev("review_requested", 7)], roles)
        self.assertEqual(list(got), ["blinky"])


if __name__ == "__main__":
    unittest.main()
