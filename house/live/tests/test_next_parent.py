"""A merged child names the next open item on its parent."""
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "feed"))
import inbox_pass  # noqa: E402
import live_collect  # noqa: E402
import live_flow  # noqa: E402
import next_parent  # noqa: E402

PARENT = """#731 load-shed\n#772 doorbell\nR=Arch1\n"""
BUNDLE = "#753\n#764\n#766\n#731\nR=Arch1\n"
BUG = "#768\n#731\nR=Arch1\n"


class NextParent(unittest.TestCase):
    def test_closed_child_names_the_next_open_issue(self):
        door = next_parent.parent_door({768: PARENT}, {731})
        self.assertEqual(door, {"parent": 768, "next": 772, "seat": "arch1"})

    def test_a_closed_number_in_the_story_is_skipped_when_only_open_issues_count(self):
        body = "#753 merged\n#2 closed\n#731 still open\nR=Arch1\n"
        door = next_parent.parent_door({768: body}, set(), {731})
        self.assertEqual(door["next"], 731)
        self.assertEqual(door["seat"], "arch1")

    def test_refs_come_from_the_pull_body(self):
        self.assertEqual(next_parent.ref_numbers("Refs #731. Refs #768."), [731, 768])

    def test_merged_event_posts_one_ready_line(self):
        event = {
            "id": "0xRayAI/xray#773:merged",
            "t_ct": "2026-10-30T16:00:00-05:00",
            "kind": "merged",
            "repo": "0xRayAI/xray",
            "number": 773,
            "label": "merged xray #773",
            "source": "https://github.com/0xRayAI/xray/pull/773",
            "from": "GitHub",
            "parent": 768,
            "next_issue": 772,
            "door_seat": "arch1",
        }
        lines = inbox_pass._direct_all(event, {})
        door = [line for line in lines if line.get("seat") == "arch1" and line.get("kind") == "ready"]
        self.assertEqual(len(door), 1)
        self.assertEqual(door[0]["title"], "next on #768: #772")
        self.assertEqual(door[0]["type"], "packet")
        self.assertTrue(door[0]["id"].endswith(":door"))
        self.assertNotIn("body", door[0])

    def test_a_cross_link_names_the_bundle_child(self):
        """#772 points at #768. The doorbell is the bundle's next open child, #731."""
        door = next_parent.parent_door(
            {772: BUG, 768: BUNDLE},
            {753, 764, 766},
            {768, 731},
        )
        self.assertEqual(door, {"parent": 768, "next": 731, "seat": "arch1"})

    def test_stored_door_survives_the_feed_and_lands_in_the_inbox(self):
        """#775 stored a next row the hop pass turned into Others, so the feed never
        carried it. deliver() then dropped the ready line because kind is not a spool field.
        A stale id must not block the :door row, and its clock is the post time."""
        repo = "0xRayAI/xray"
        old = "2026-10-30T10:00:00Z"
        with tempfile.TemporaryDirectory() as tmp:
            col = live_collect.RepoCollector(
                repo, Path(tmp), type("FF", (), {"CT": ZoneInfo("America/Chicago")})(), lambda *_a: None)
            col.put(f"{repo}#776:merged", old, "GitHub", "GitHub", "merged",
                    "merged xray #776", "https://github.com/0xRayAI/xray/pull/776", 776)
            stale = f"{repo}#776:next:768"
            col.put(stale, old, "GitHub", "GitHub", "next_parent",
                    "next on #772: #768", "https://github.com/0xRayAI/xray/pull/776", 768,
                    parent=772, next_issue=768, door_seat="arch1")
            col._backfill_parent_doors(_DoorClient())
            doors = [e for e in col.ev.values() if e.get("kind") == "next_parent"]
            self.assertEqual([e["id"] for e in doors], [f"{repo}#776:next:731:door"])
            door = doors[0]
            self.assertEqual(door["parent"], 768)
            self.assertEqual(door["next_issue"], 731)
            self.assertNotIn(stale, col.ev)
            posted = datetime.fromisoformat(door["t_ct"])
            self.assertLess(abs((datetime.now(posted.tzinfo) - posted).total_seconds()), 120)
            self.assertNotEqual(posted, datetime.fromisoformat(old.replace("Z", "+00:00")))
            copied = [dict(door)]
            live_flow.Flow({}, lambda _login: "Others").apply(copied)
            live_flow.Flow({}, lambda _login: "Others").apply(copied)
            kept = live_collect.fleet_only(copied)
            self.assertEqual(len(kept), 1)
            self.assertNotIn("Others", (kept[0].get("from"), kept[0].get("to"), *(kept[0].get("hops") or [])))
            spool = Path(tmp) / "spool"
            feed = Path(tmp) / "feed.json"
            state = Path(tmp) / "state.json"
            cache = Path(tmp) / "cache.json"
            feed.write_text(json.dumps({"events": kept}))
            state.write_text(json.dumps({"seeded": True, "seeded_at": 1, "seen": {stale: 1}}))
            prev = {name: getattr(inbox_pass, name) for name in ("FEED", "STATE", "CACHE", "INBOX", "ACTIVITY")}
            os.environ["LIVE_BOARD"] = "off"
            try:
                inbox_pass.FEED, inbox_pass.STATE, inbox_pass.CACHE = feed, state, cache
                inbox_pass.INBOX, inbox_pass.ACTIVITY = spool, Path(tmp) / "missing-activity.jsonl"
                inbox_pass.cmd_pass(now=datetime.now(timezone.utc).timestamp())
            finally:
                for name, value in prev.items():
                    setattr(inbox_pass, name, value)
            rows = [json.loads(line) for line in (spool / "arch1.jsonl").read_text().splitlines()]
            hit = [row for row in rows if str(row.get("id") or "").endswith(":door")]
            self.assertEqual(len(hit), 1)
            self.assertEqual(hit[0]["title"], "next on #768: #731")
            self.assertEqual(hit[0]["kind"], "ready")
            self.assertEqual(hit[0]["seat"], "arch1")
            self.assertNotIn("body", hit[0])


class _DoorClient:
    token = "t"
    _issues = {
        772: {"state": "open", "body": BUG},
        768: {"state": "open", "body": BUNDLE},
        753: {"state": "closed", "body": ""},
        764: {"state": "closed", "body": ""},
        766: {"state": "closed", "body": ""},
        731: {"state": "open", "body": "R=Arch1\n"},
    }

    def rest(self, path, params=None, etag=None, essential=False):
        if str(path).endswith("/pulls/776"):
            return 200, {"body": "Refs #772\nRefs #768\n", "html_url": "https://github.com/0xRayAI/xray/pull/776"}, None, None
        number = int(str(path).rstrip("/").split("/")[-1])
        return 200, self._issues[number], None, None


if __name__ == "__main__":
    unittest.main()
