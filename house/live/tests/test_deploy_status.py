"""Pending deploy classification: terminal statuses close, a later deploy drops a non-tip pending."""
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "feed"))
import deploy_status

R = "example-org/app"


def iso(ago):
    return (datetime.now(timezone.utc) - timedelta(seconds=ago)).replace(microsecond=0).isoformat()


def commit(sha, ago, branch="main"):
    return {"id": f"{R}:commit:{sha}", "t_ct": iso(ago), "kind": "commit", "repo": R, "sha": sha,
            "branches": [branch]}


def pending(sha, ago, eid="pend"):
    return {"id": eid, "t_ct": iso(ago), "kind": "deploy_pending", "repo": R, "sha": sha, "state": "pending"}


class DeployStatus(unittest.TestCase):
    def test_error_failure_and_inactive_close_an_old_pending(self):
        tip = "abcdef1234567890"
        for state in ("error", "failure", "inactive"):
            events = [
                commit(tip, 5000),
                pending(tip, 4000),
                {"id": "st-" + state, "t_ct": iso(1000), "kind": "commit_status", "repo": R, "sha": tip, "state": state},
            ]
            got = deploy_status.classify(events)
            self.assertEqual(got["dropped"], ["pend"], state)
            self.assertEqual(got["stale"], [], state)
            self.assertEqual(got["holds"], [], state)

        events = [
            commit(tip, 5000),
            pending(tip, 4000),
            {"id": "fail", "t_ct": iso(1000), "kind": "deploy_fail", "repo": R, "sha": tip, "state": "error"},
        ]
        got = deploy_status.classify(events)
        self.assertEqual(got["dropped"], ["pend"])
        self.assertEqual(got["stale"], [])
        self.assertEqual(got["holds"], [])

    def test_non_tip_pending_superseded_by_a_later_deploy_is_not_stale(self):
        old, newer, main = "1111111aaa", "2222222bbb", "3333333ccc"
        rows = [
            commit(old, 9000, "develop"),
            commit(newer, 5000, "develop"),
            commit(main, 1000, "main"),
            pending(old, 8000),
        ]
        stuck = deploy_status.classify(rows)
        self.assertEqual(stuck["stale"], ["pend"])
        self.assertEqual(stuck["holds"], [])

        closed = deploy_status.classify(rows + [
            {"id": "dep", "t_ct": iso(100), "kind": "deploy", "repo": R, "sha": main, "state": "success"},
        ])
        self.assertEqual(closed["dropped"], ["pend"])
        self.assertEqual(closed["stale"], [])
        self.assertEqual(closed["holds"], [])

    def test_fresh_tip_pending_without_a_later_status_still_holds(self):
        tip = "abcdef1234567890"
        got = deploy_status.classify([commit(tip, 100), pending(tip, 40)])
        self.assertEqual(got["holds"], ["pend"])
        self.assertEqual(got["stale"], [])
        self.assertEqual(got["dropped"], [])


if __name__ == "__main__":
    unittest.main()
