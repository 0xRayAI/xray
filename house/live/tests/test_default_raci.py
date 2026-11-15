"""A live card with no R gets one packet comment and then the existing assignee write."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "feed"))
import live_collect  # noqa: E402

NODES = {"forge0x1[bot]": "forge", "arch10x[bot]": "arch1"}


def card(**over):
    item = {"state": "open", "number": 1113, "assignees": [], "body": "no packet yet\n"}
    item.update(over)
    return item


class DefaultRaci(unittest.TestCase):
    def test_owner_sets_r_and_the_plane_sets_a(self):
        eng = card(body="Board-Owner: forge\n")
        self.assertEqual(live_collect.default_raci(eng, NODES), {"R": "forge", "A": "forge"})
        dist = card(body="Board-Owner: sound\n")
        self.assertEqual(live_collect.default_raci(dist, NODES), {"R": "sound", "A": "blinky"})
        core = card(body="Board-Owner: blinky\n")
        self.assertEqual(live_collect.default_raci(core, NODES), {"R": "blinky", "A": "blinky"})
        opened = card(user={"login": "forge0x1[bot]"})
        self.assertEqual(live_collect.default_raci(opened, NODES), {"R": "forge", "A": "forge"})

    def test_parked_pinned_closed_and_filled_cards_are_skipped(self):
        self.assertIsNone(live_collect.default_raci(card(state="closed"), NODES))
        self.assertIsNone(live_collect.default_raci(card(draft=True), NODES))
        self.assertIsNone(live_collect.default_raci(card(pinned=True), NODES))
        self.assertIsNone(live_collect.default_raci(card(labels=[{"name": "parked"}]), NODES))
        filled = card(body="## Packet\nraci: R=near A=critic\n")
        self.assertIsNone(live_collect.default_raci(filled, NODES))

    def test_one_comment_per_card_then_the_assignee_inside_the_budget(self):
        calls = []

        class Writer:
            token = "assign-token"

            def __init__(self, code=201):
                self.code = code

            def write_json(self, path, payload):
                calls.append((path, payload))
                return self.code

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {}
        col.repo = "0xRayAI/xray"
        col._assign_left = 10
        col._assign_miss = False
        saved = dict(live_collect.NODE)
        live_collect.NODE.clear()
        live_collect.NODE.update(NODES)
        try:
            item = card(body="Board-Owner: forge\n")
            col.maybe_fill_raci(Writer(), item)
            self.assertEqual(col._assign_left, 9)
            self.assertEqual(calls[0][0], "/repos/0xRayAI/xray/issues/1113/comments")
            self.assertEqual(calls[0][1]["body"], "## Packet\nraci: R=forge A=forge\n")
            self.assertEqual(item["packet"]["raci"], "R=forge A=forge")
            col.maybe_fill_raci(Writer(), item)
            self.assertEqual(len(calls), 1)
            self.assertEqual(col.st["raci_tried"], ["0xRayAI/xray#1113"])
            col.maybe_assign(Writer(), item)
            self.assertEqual(calls[1][0], "/repos/0xRayAI/xray/issues/1113/assignees")
            self.assertEqual(calls[1][1], {"assignees": ["forge0x1[bot]"]})
            self.assertEqual(col._assign_left, 8)
            tight = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
            tight.st = {}
            tight.repo = "0xRayAI/xray"
            tight._assign_left = 1
            tight._assign_miss = False
            other = card(number=1114, body="Board-Owner: sound\n")
            before = len(calls)
            tight.maybe_fill_raci(Writer(), other)
            tight.maybe_assign(Writer(), other)
            self.assertEqual(len(calls), before + 1)
            self.assertEqual(tight._assign_left, 0)
            self.assertIn("R=sound A=blinky", calls[-1][1]["body"])
        finally:
            live_collect.NODE.clear()
            live_collect.NODE.update(saved)


if __name__ == "__main__":
    unittest.main()
