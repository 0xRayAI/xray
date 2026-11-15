"""A live card with no R gets one packet comment and then the existing assignee write."""
import json
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

    def test_a_read_only_client_does_not_post(self):
        class Read:
            token = "assign-token"

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {}
        col.repo = "0xRayAI/xray"
        col.ev = {}
        col._assign_left = 10
        col._assign_miss = False
        item = card(body="Board-Owner: forge\n")
        col.maybe_fill_raci(Read(), item)
        self.assertNotIn("packet", item)
        self.assertNotIn("raci_reason", item)
        self.assertEqual(col._assign_left, 10)

    def test_role_seat_when_the_card_has_no_owner(self):
        lab = card(labels=[{"name": "lab"}])
        self.assertEqual(live_collect.default_raci(lab, NODES), {"R": "forge", "A": "forge"})

    def test_third_forge_card_goes_to_mill_and_a_full_plane_queues(self):
        held = {}
        first = live_collect.default_raci(card(number=1, body="Board-Owner: forge\n"), NODES, held=held)
        second = live_collect.default_raci(card(number=2, body="Board-Owner: forge\n"), NODES, held=held)
        third = live_collect.default_raci(card(number=3, body="Board-Owner: forge\n"), NODES, held=held)
        self.assertEqual(first, {"R": "forge", "A": "forge"})
        self.assertEqual(second, {"R": "forge", "A": "forge"})
        self.assertEqual(third, {"R": "mill", "A": "forge"})
        full = {"forge": 2, "mill": 2, "arch1": 2}
        queued = live_collect.default_raci(card(number=4, body="Board-Owner: forge\n"), NODES, held=full)
        self.assertEqual(queued, {"queued": True, "reason": "at the cap"})
        down = json.loads(json.dumps(live_collect.load_routing()))
        down["routing"]["arch1"]["up"] = False
        almost = {"forge": 2, "mill": 2}
        still = live_collect.default_raci(card(number=5, body="Board-Owner: forge\n"), NODES, roles=down, held=almost)
        self.assertEqual(still, {"queued": True, "reason": "at the cap"})

    def test_a_card_that_already_has_r_gets_a(self):
        partial = card(body="## Packet\nraci: R=forge\n")
        self.assertEqual(live_collect.default_raci(partial, NODES), {"R": "forge", "A": "forge"})

    def test_open_walk_fills_a_quiet_card_and_stamps_the_event(self):
        calls = []

        class Writer:
            token = "read-token"
            assign_token = "ghs_test"

            def write_json(self, path, payload):
                calls.append((path, payload))
                return 201

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {"cards:issues": True, "assign:issues": True}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {"0xRayAI/xray!1093:open": {"kind": "issue_open", "number": 1093, "packet": {"goal": "keep"}}}
        col._assign_left = 10
        col._assign_miss = False
        item = card(number=1093, body="Board-Owner: forge\n", assignees=[{"login": "kept"}])

        def paged(c, path, params, key, stop=None, essential=True, max_pages=400):
            col._paged_status = "done"
            yield item

        col.paged = paged
        col.fill_open_raci(Writer())
        self.assertEqual(calls[0][0], "/repos/0xRayAI/xray/issues/1093/comments")
        self.assertIn("R=forge A=forge", calls[0][1]["body"])
        self.assertEqual(col.ev["0xRayAI/xray!1093:open"]["packet"]["raci"], "R=forge A=forge")
        self.assertEqual(col.ev["0xRayAI/xray!1093:open"]["packet"]["goal"], "keep")
        self.assertTrue(col.st["bf"].get("raci:open"))
        parked = card(number=1105, body="Board-Owner: forge\n", labels=[{"name": "parked"}])

        def parked_only(c, path, params, key, stop=None, essential=True, max_pages=400):
            col._paged_status = "done"
            yield parked

        col.st["bf"].pop("raci:open")
        col.paged = parked_only
        before = len(calls)
        col.fill_open_raci(Writer())
        self.assertEqual(len(calls), before)
        self.assertTrue(col.st["bf"].get("raci:open"))

    def test_open_walk_stays_open_when_the_budget_is_spent(self):
        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {}
        col._assign_left = 0
        col._assign_miss = False

        def paged(c, path, params, key, stop=None, essential=True, max_pages=400):
            col._paged_status = "done"
            yield card(number=1110, body="Board-Owner: forge\n")

        col.paged = paged

        class Writer:
            token = "read-token"
            assign_token = "ghs_test"

            def write_json(self, path, payload):
                raise AssertionError("budget spent")

        col.fill_open_raci(Writer())
        self.assertNotIn("raci:open", col.st["bf"])

    def test_second_pass_is_a_304_and_writes_nothing(self):
        item = card(number=1093, body="Board-Owner: forge\n", assignees=[{"login": "kept"}])
        writes = []
        lists = []

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [], None, None
                lists.append(etag)
                if etag:
                    return 304, None, etag, None
                return 200, [item], "W/open", None

            def write_json(self, path, payload):
                writes.append(payload)
                return 201

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {"0xRayAI/xray!1093:open": {
            "kind": "issue_open", "repo": "0xRayAI/xray", "number": 1093,
            "pr_state": "open", "packet": {"goal": "keep"}}}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertEqual(len(writes), 1)
        self.assertEqual(lists, [None])
        self.assertEqual(col.st["etags"].get("raci-open"), "W/open")
        self.assertTrue(col.st["bf"].get("raci:open"))
        col._assign_left = 10
        col.fill_open_raci(Client())
        self.assertEqual(len(writes), 1)
        self.assertEqual(lists, [None, "W/open"])

    def test_a_card_at_the_cap_still_latches(self):
        item = card(number=1105, body="Board-Owner: sound\n", assignees=[{"login": "kept"}])
        lists = []

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [], None, None
                lists.append(etag)
                if etag:
                    return 304, None, etag, None
                return 200, [item], "W/cap", None

            def write_json(self, path, payload):
                raise AssertionError(payload)

        def held(n):
            return {"kind": "issue_open", "repo": "0xRayAI/xray", "number": n, "pr_state": "open",
                    "packet": {"raci": "R=sound A=blinky"}}

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {f"0xRayAI/xray!{n}:open": held(n) for n in (1, 2)}
        col.ev["0xRayAI/xray!1105:open"] = {"kind": "issue_open", "repo": "0xRayAI/xray", "number": 1105, "packet": {}}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertEqual(lists, [None])
        self.assertTrue(col.st["bf"].get("raci:open"))
        self.assertEqual(col.ev["0xRayAI/xray!1105:open"]["raci_reason"], "at the cap")
        col._assign_left = 10
        col.fill_open_raci(Client())
        self.assertEqual(lists, [None, "W/cap"])

    def test_an_existing_packet_comment_is_not_posted_again(self):
        item = card(number=1110, body="Board-Owner: forge\n", assignees=[{"login": "kept"}])
        writes = []

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [{"body": "## Packet\nraci: R=forge A=forge\n",
                                  "user": {"login": "forge0x1[bot]"}}], None, None
                return 200, [item], "W/open", None

            def write_json(self, path, payload):
                writes.append(payload)
                return 201

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {"0xRayAI/xray!1110:open": {"kind": "issue_open", "number": 1110, "packet": {}}}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertEqual(writes, [])
        self.assertEqual(col.ev["0xRayAI/xray!1110:open"]["packet"]["raci"], "R=forge A=forge")
        self.assertIn("0xRayAI/xray#1110", col.st["raci_tried"])

    def test_a_persons_raci_line_does_not_suppress_the_fill(self):
        item = card(number=1082, body="Board-Owner: forge\n", assignees=[{"login": "kept"}])
        writes = []

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [{"body": "raci: R=near A=near\n", "user": {"login": "blaze"}}], None, None
                return 200, [item], "W/open", None

            def write_json(self, path, payload):
                writes.append(payload)
                return 201

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {"0xRayAI/xray!1082:open": {"kind": "issue_open", "number": 1082, "packet": {}}}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertEqual(len(writes), 1)
        self.assertIn("R=forge A=forge", writes[0]["body"])

    def test_a_dead_assign_token_does_not_latch(self):
        item = card(number=1090, body="Board-Owner: forge\n", assignees=[{"login": "kept"}])

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [], None, None
                return 200, [item], "W/dead", None

            def write_json(self, path, payload):
                return 401

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {}, "etags": {}}
        col.repo = "0xRayAI/xray"
        col.ev = {"0xRayAI/xray!1090:open": {"kind": "issue_open", "number": 1090, "packet": {}}}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertTrue(col._assign_auth_dead)
        self.assertNotIn("raci:open", col.st["bf"])
        self.assertNotIn("raci-open", col.st["etags"])

    def test_a_changed_list_stores_the_new_tag(self):
        item = card(number=1093, body="no packet\n", state="closed")
        lists = []

        class Client:
            token = "read-token"
            assign_token = "ghs_test"

            def rest(self, path, params=None, etag=None, essential=True):
                if str(path).endswith("/comments"):
                    return 200, [], None, None
                lists.append(etag)
                if etag == "W/1":
                    return 200, [item], "W/2", None
                if etag == "W/2":
                    return 304, None, "W/2", None
                return 200, [item], "W/1", None

            def write_json(self, path, payload):
                raise AssertionError(payload)

        col = live_collect.RepoCollector.__new__(live_collect.RepoCollector)
        col.st = {"bf": {"raci:open": True}, "etags": {"raci-open": "W/1"}}
        col.repo = "0xRayAI/xray"
        col.ev = {}
        col._assign_left = 10
        col._assign_miss = False
        col.fill_open_raci(Client())
        self.assertEqual(lists, ["W/1"])
        self.assertEqual(col.st["etags"]["raci-open"], "W/2")
        col.fill_open_raci(Client())
        self.assertEqual(lists, ["W/1", "W/2"])
        self.assertEqual(col.st["etags"]["raci-open"], "W/2")


if __name__ == "__main__":
    unittest.main()
