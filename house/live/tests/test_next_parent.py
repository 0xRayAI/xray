"""A merged child names the next open item on its parent."""
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "feed"))
import inbox_pass  # noqa: E402
import next_parent  # noqa: E402

PARENT = """#731 load-shed\n#772 doorbell\nR=Arch1\n"""


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
        self.assertNotIn("body", door[0])


if __name__ == "__main__":
    unittest.main()
