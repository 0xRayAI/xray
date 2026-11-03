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

    def test_queued_summary_does_not_open_ci_fail(self):
        """A still-running required check is not red. A completed failure is. Then green adds nothing."""
        opened = [ev("open", "pr_open", number=9, sha=SHA)]
        seat = lambda repo, number: "forge"
        queued = ev("sum", "workflow_run", number=9, sha=SHA, status="queued", conclusion="", name="CI Summary")
        running = ev("run", "check_run", number=9, sha=SHA, status="in_progress", conclusion="failure", name="CI Summary")
        pending = ev("wait", "check_suite", number=9, sha=SHA, status="pending", conclusion="cancelled", name="CI Summary")
        self.assertEqual(ci_inbox.ci_fail_lines(opened + [queued], [queued], seat), [])
        self.assertEqual(ci_inbox.ci_fail_lines(opened + [running], [running], seat), [])
        self.assertEqual(ci_inbox.ci_fail_lines(opened + [pending], [pending], seat), [])
        self.assertNotEqual(ci_inbox.sha_color(opened + [queued, running]).get((R, SHA)), "red")
        done = ev("bad", "workflow_run", number=9, sha=SHA, status="completed", conclusion="failure", name="CI Summary")
        lines = ci_inbox.ci_fail_lines(opened + [queued, done], [done], seat)
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["id"], f"ci_fail:{R}#9:{SHA}")
        green = ev("ok", "workflow_run", number=9, sha=SHA, status="completed", conclusion="success", name="CI Summary",
                   t_ct="2026-10-28T10:05:00-05:00")
        self.assertEqual(ci_inbox.ci_fail_lines(opened + [queued, green], [green], seat), [])
        self.assertEqual(ci_inbox.sha_color(opened + [queued, green]).get((R, SHA)), "green")

    def test_green_after_a_red_head_rings_critic(self):
        red = ev("bad", "ci_fail", number=9, sha=SHA, t_ct="2026-10-28T10:02:00-05:00")
        green = ev("ok", "ci_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:05:00-05:00")
        lines = ci_inbox.critic_return_lines([red, green], [green])
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["seat"], "critic")
        self.assertEqual(lines[0]["kind"], "ci_pass")
        self.assertEqual(lines[0]["type"], "ci_pass")
        self.assertEqual(lines[0]["sha"], SHA2)
        self.assertEqual(lines[0]["id"], f"wake:critic:{R.lower()}#{9}:{SHA2}")

    def test_a_plain_green_head_does_not_ring_critic(self):
        green = ev("ok", "ci_pass", number=9, sha=SHA2)
        self.assertEqual(ci_inbox.critic_return_lines([green], [green]), [])

    def test_a_pass_on_the_green_sha_does_not_ring_critic(self):
        red = ev("bad", "ci_fail", number=9, sha=SHA, t_ct="2026-10-28T10:02:00-05:00")
        passed = ev("rev", "critic_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:04:00-05:00")
        green = ev("ok", "ci_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:05:00-05:00")
        self.assertEqual(ci_inbox.critic_return_lines([red, passed, green], [green]), [])

    def test_packet_next_owner_critic_rings_on_green(self):
        opened = ev("open", "pr_open", number=9, sha=SHA, packet={"next owner": "critic"})
        green = ev("ok", "ci_pass", number=9, sha=SHA, t_ct="2026-10-28T10:05:00-05:00")
        lines = ci_inbox.critic_return_lines([opened, green], [green])
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["sha"], SHA)

    def test_a_failed_verify_comment_rings_the_new_green_head(self):
        note = ev("tip", "pr_comment", number=9, sha=SHA, title="failed verify", t_ct="2026-10-28T10:03:00-05:00")
        green = ev("ok", "ci_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:05:00-05:00")
        lines = ci_inbox.critic_return_lines([note, green], [green])
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["kind"], "ci_pass")
        self.assertEqual(lines[0]["seat"], "critic")
        self.assertEqual(lines[0]["sha"], SHA2)
        passed = ev("rev", "critic_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:06:00-05:00")
        later = ev("ok2", "ci_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:07:00-05:00")
        self.assertEqual(ci_inbox.critic_return_lines([note, green, passed, later], [later]), [])

    def test_a_pass_on_the_old_sha_rings_the_new_green_head(self):
        opened = ev("open", "pr_open", number=9, sha=SHA)
        passed = ev("rev", "critic_pass", number=9, sha=SHA, t_ct="2026-10-28T10:03:00-05:00")
        green = ev("ok", "ci_pass", number=9, sha=SHA2, t_ct="2026-10-28T10:05:00-05:00")
        lines = ci_inbox.critic_return_lines([opened, passed, green], [green])
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["sha"], SHA2)


if __name__ == "__main__":
    unittest.main()
