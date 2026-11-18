"""The live GitHub document is a window. The day archive holds the rest."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "feed"))
import feed_cap  # noqa: E402


class WindowNote(unittest.TestCase):
    def test_note_names_the_document_window(self):
        notes = [
            "Bifrost fleet, full GitHub history (backfilled from repo creation, then incremental): PRs.",
            "Window: full history (first event 2026-06-05T17:13:45-05:00).",
        ]
        events = [
            {"id": "a", "t_ct": "2026-10-26T13:32:02-05:00"},
            {"id": "b", "t_ct": "2026-10-27T17:53:46-05:00"},
        ]
        out = feed_cap.window_note(notes, events)
        self.assertIn("newest window", out[0])
        self.assertNotIn("full GitHub history", out[0])
        self.assertTrue(out[1].startswith("Window: newest 2 events"))
        self.assertIn("2026-10-26T13:32:02-05:00", out[1])
        self.assertIn("history archive", out[1])
        self.assertNotIn("2026-06-05", " ".join(out))

    def test_cap_then_note_drops_the_old_first_event(self):
        events = [{"id": str(i), "t_ct": f"2026-10-0{i}T00:00:00-05:00"} for i in range(1, 5)]
        kept = feed_cap.window_events(events, 2)
        self.assertEqual([e["id"] for e in kept], ["3", "4"])
        note = feed_cap.window_note(["Window: full history (first event 2026-06-05T00:00:00-05:00)."], kept)
        self.assertIn("newest 2 events", note[0])
        self.assertIn("2026-10-03T00:00:00-05:00", note[0])
        self.assertNotIn("2026-06-05", note[0])


if __name__ == "__main__":
    unittest.main()
