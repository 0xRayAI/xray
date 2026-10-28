"""A red head with no open event still gets one card. A green head names the line to ack."""
import os
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))))
import ci_inbox  # noqa: E402

R = "example-org/app"
SHA = "b" * 40
SHA2 = "c" * 40


def ev(eid, kind, **extra):
    row = {"id": eid, "t_ct": extra.pop("t_ct", "2026-10-28T10:00:00-05:00"), "kind": kind, "repo": R}
    row.update(extra)
    return row


class CiInbox(unittest.TestCase):
    def test_missing_pull_gets_one_card(self):
        events = [
            ev("push", "pr_commit", number=9, sha=SHA, t_ct="2026-10-28T10:01:00-05:00"),
            ev("suite", "check_suite", sha=SHA, app="github-actions", conclusion="failure",
               t_ct="2026-10-28T10:02:00-05:00"),
        ]
        cards = ci_inbox.missing_cards(events, set())
        self.assertEqual([c["key"] for c in cards], [f"{R}#9"])
        self.assertEqual(cards[0]["kind"], "pr")
        self.assertEqual(ci_inbox.missing_cards(events, {f"{R}#9"}), [])

    def test_green_head_acks_the_open_line(self):
        fail = [
            ev("open", "pr_open", number=9, sha=SHA),
            ev("suite", "check_suite", sha=SHA, conclusion="failure", t_ct="2026-10-28T10:02:00-05:00"),
        ]
        line = {"id": f"ci_fail:{R}#9:{SHA}", "type": "ci_fail", "repo": R, "number": 9, "sha": SHA}
        self.assertEqual(ci_inbox.ack_ids([line], fail), [])
        green = fail + [
            ev("push2", "pr_commit", number=9, sha=SHA2, t_ct="2026-10-28T10:03:00-05:00"),
            ev("ok", "check_suite", sha=SHA2, conclusion="success", t_ct="2026-10-28T10:04:00-05:00"),
        ]
        self.assertEqual(ci_inbox.ack_ids([line], green), [line["id"]])


if __name__ == "__main__":
    unittest.main()
