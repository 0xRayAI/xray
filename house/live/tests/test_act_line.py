"""act_line copies a valid cloud-agent pr and drops a bad one."""
import os, sys, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))))
import push_payload  # noqa: E402

BASE = {
    "t_ct": "2026-10-09T14:00:00Z",
    "seat": "Builder",
    "kind": "cloud_agent",
    "action": "launch",
    "agent": "bc-agent01",
}


class ActLinePr(unittest.TestCase):
    def test_keeps_a_dotted_repo_and_strips(self):
        line = push_payload.act_line({**BASE, "pr": "  https://github.com/acme/repo.name/pull/2  "})
        self.assertEqual(line["pr"], "https://github.com/acme/repo.name/pull/2")
        self.assertEqual(line["agent"], "bc-agent01")
        plain = push_payload.act_line({**BASE, "pr": "https://github.com/owner/repo/pull/1"})
        self.assertEqual(plain["pr"], "https://github.com/owner/repo/pull/1")

    def test_drops_a_dot_segment(self):
        self.assertIsNone(push_payload.act_line({**BASE, "pr": "https://github.com/../../pull/1"}))

    def test_omitted_pr_stays_off_the_line(self):
        line = push_payload.act_line(dict(BASE))
        self.assertIsNotNone(line)
        self.assertNotIn("pr", line)

    def test_pr_on_a_turn_is_dropped(self):
        turn = {
            "t_ct": "2026-10-09T14:00:00Z",
            "seat": "Builder",
            "kind": "turn",
            "action": "start",
            "pr": "https://github.com/acme/app/pull/1",
        }
        self.assertIsNone(push_payload.act_line(turn))


if __name__ == "__main__":
    unittest.main()
