"""The pack's seat wake routine template reads STATION.md then NOTES.md first and ends by updating NOTES.md (intent, next cut, no secrets)."""
import os, re, unittest
from pathlib import Path

TEMPLATE = Path(os.environ.get("WAKE_TEMPLATE") or Path(__file__).resolve().parents[3] / "grok-bot" / "templates" / "house" / "fleet" / "WAKE-ROUTINE.md")


def steps(text):
    return [m.group(1) for m in re.finditer(r"^\d+\.\s+(.*)$", text, re.M)]


class WakeTemplate(unittest.TestCase):
    def setUp(self):
        self.steps = steps(TEMPLATE.read_text())
        self.assertGreaterEqual(len(self.steps), 2, TEMPLATE)

    def test_first_step_reads_station_then_notes(self):
        first = self.steps[0]
        self.assertIn(".xray/state/STATION.md", first)
        self.assertIn(".xray/state/NOTES.md", first)
        self.assertLess(first.index("STATION.md"), first.index("NOTES.md"), "STATION.md is read before NOTES.md")
        self.assertRegex(first, r"(?i)\bread")

    def test_last_step_updates_notes_with_intent_next_cut_no_secrets(self):
        last = self.steps[-1]
        self.assertRegex(last, r"(?i)\bupdate\b.*\.xray/state/NOTES\.md")
        for want in ("intent", "next cut", "no secrets"):
            self.assertIn(want, last.lower())


if __name__ == "__main__":
    unittest.main()
