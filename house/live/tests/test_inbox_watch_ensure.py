"""inbox-watch-ensure.sh stays out of the TUI. inbox-watch-station.sh writes one Watcher line."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
ROOT = LIVE.parents[1]
ENSURE = LIVE / "tools" / "inbox-watch-ensure.sh"
STATION = LIVE / "tools" / "inbox-watch-station.sh"


class Ensure(unittest.TestCase):
    def test_names_the_local_tui_and_starts_nothing(self):
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / "inbox-watch.sh"
            script.write_text("#!/bin/bash\ntouch %s/ran\n" % directory)
            script.chmod(0o755)
            result = subprocess.run(
                ["bash", str(ENSURE), "arch1"],
                env={
                    "PATH": os.environ["PATH"],
                    "HOME": directory,
                    "INBOX_WATCH_BIN": str(script),
                },
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn("run in the local TUI", result.stdout)
            self.assertIn(str(script), result.stdout)
            self.assertIn("arch1", result.stdout)
            self.assertFalse((Path(directory) / "ran").exists())

    def test_bad_seat_is_usage(self):
        result = subprocess.run(
            ["bash", str(ENSURE), "nope seat"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("usage:", result.stderr)

    def test_procedure_enables_the_local_tui(self):
        proc = (ROOT / "grok-bot" / "OP-PROC.md").read_text()
        self.assertIn("local TUI", proc)
        self.assertIn("Suit boot enables", proc)
        self.assertIn("inbox-watch-ensure.sh` does not start a process", proc)
        lexicon = (ROOT / "grok-bot" / "LEXICON.md").read_text()
        self.assertIn("run in the local TUI", lexicon)


class StationLine(unittest.TestCase):
    def test_replaces_only_the_watcher_line(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "inbox-watch.state"
            station = Path(directory) / "STATION.md"
            state.write_text(
                "pid=42\nstarted=2026-10-23T11:39:57-0500\nlast_ok=2026-10-23T12:01:00-0500\nlive_url=https://bifrost.0xray.dev\nscript=house/live/tools/inbox-watch.sh\n"
            )
            station.write_text(
                "Intent: hold\nNotes: present\nWatcher: pid 1 since old LIVE_URL http://old last ok old\nPlane: domain\n"
            )
            env = {
                "PATH": os.environ["PATH"],
                "HOME": directory,
                "INBOX_WATCH_STATE": str(state),
                "INBOX_WATCH_STATION": str(station),
            }
            result = subprocess.run(["bash", str(STATION)], env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            text = station.read_text()
            self.assertIn("Intent: hold\n", text)
            self.assertIn("Plane: domain\n", text)
            self.assertEqual(text.count("Watcher:"), 1)
            self.assertIn(
                "Watcher: pid 42 since 2026-10-23T11:39:57-0500 LIVE_URL https://bifrost.0xray.dev last ok 2026-10-23T12:01:00-0500\n",
                text,
            )


if __name__ == "__main__":
    unittest.main()
