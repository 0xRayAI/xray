"""Turn end with a bc- id posts a cloud line. The doctor flags a 24h miss."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "feed"))
import cloud_line  # noqa: E402


class CloudLineTest(unittest.TestCase):
    def test_turn_end_with_bc_posts_finished(self):
        body = cloud_line.cloud_body("end", "bc-abc123 board", "2026-11-15T14:00:00-06:00")
        self.assertEqual(body["kind"], "cloud_agent")
        self.assertEqual(body["action"], "finished")
        self.assertEqual(body["agent"], "bc-abc123")
        self.assertIsNone(cloud_line.cloud_body("start", "bc-abc123", "t"))
        self.assertIsNone(cloud_line.cloud_body("end", "wake", "t"))

    def test_doctor_flags_a_bc_turn_with_no_cloud_line_in_24h(self):
        now = 1_700_000_000
        lines = [
            {"kind": "turn", "action": "end", "seat": "forge", "tag": "bc-abc123 xray#1", "t": now - 3600},
            {"kind": "turn", "action": "end", "seat": "critic", "tag": "wake", "t": now - 60},
            {"kind": "turn", "action": "end", "seat": "near", "tag": "bc-near1", "t": now - 120},
            {"kind": "cloud_agent", "action": "finished", "seat": "near", "agent": "bc-near1", "t": now - 100},
            {"kind": "turn", "action": "end", "seat": "old", "tag": "bc-old1", "t": now - 25 * 3600},
        ]
        gaps = cloud_line.cloud_gaps(lines, now)
        self.assertEqual(gaps, [{"seat": "forge", "agent": "bc-abc123"}])


if __name__ == "__main__":
    unittest.main()
