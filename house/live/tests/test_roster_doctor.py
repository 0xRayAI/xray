"""Active seats need a webhook name and a wake in 24h. Parked seats stay quiet. No URLs."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "feed"))
import roster_doctor  # noqa: E402

FEED = Path(__file__).resolve().parents[1] / "feed"


class RosterDoctorTest(unittest.TestCase):
    def test_roster_marks_parked_and_active(self):
        roster = json.loads((FEED / "fleet-roster.json").read_text())
        modes = roster_doctor.seat_modes(roster)
        self.assertEqual(modes["herald"], "parked")
        self.assertEqual(modes["magnet"], "parked")
        self.assertEqual(modes["sound"], "parked")
        self.assertEqual(modes["forge"], "active")
        self.assertEqual(modes["nibbler"], "active")
        self.assertNotIn("arch1", modes)
        self.assertEqual(modes["mill"], "active")

    def test_active_seat_without_webhook_or_recent_wake_is_flagged(self):
        roster = {"seats": ["forge", "herald"], "parked": ["herald"], "outside": []}
        now = 1_700_000_000
        with self.assertRaises(ValueError):
            roster_doctor.parse_webhook_names("https://example.invalid/hook")
        names = roster_doctor.parse_webhook_names("forge, blinky")
        gaps = roster_doctor.wake_gaps(roster, names, {"forge": now - 25 * 3600}, now)
        self.assertEqual(gaps, [{"seat": "forge", "why": ["no wake in 24h"]}])
        quiet = roster_doctor.wake_gaps(roster, ["forge"], {"forge": now - 60}, now)
        self.assertEqual(quiet, [])
        parked = roster_doctor.wake_gaps(roster, [], {}, now)
        self.assertEqual([item["seat"] for item in parked], ["forge"])


if __name__ == "__main__":
    unittest.main()
