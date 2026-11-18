"""Reminders. Railway posts one line per seat. The local cron writes station.md."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
RAIL = LIVE / "tools" / "remind-railway.mjs"
LOCAL = LIVE / "tools" / "remind-local.mjs"
NODE = os.environ.get("NODE", "node")


class Remind(unittest.TestCase):
    def test_one_line_per_core_seat_names_only_what_is_due(self):
        with tempfile.TemporaryDirectory() as tmp:
            spec = Path(tmp) / "in.json"
            spec.write_text(json.dumps({
                "seats": ["forge", "critic", "blinky", "arch1"],
                "due": {"arch1": ["station", "station-file"]},
            }))
            out = subprocess.check_output([NODE, str(RAIL), str(spec)], text=True)
        rows = json.loads(out)
        self.assertEqual([row["seat"] for row in rows], ["forge", "critic", "blinky", "arch1"])
        arch = rows[-1]["title"]
        self.assertIn("re-read the station skill and OP-PROC", arch)
        self.assertIn("write station.md before yielding", arch)
        self.assertNotIn("PRIVATE KEY", out)

    def test_local_reminder_writes_station_and_says_when_the_board_is_down(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "station.md"
            subprocess.check_call([
                NODE, str(LOCAL),
                "--seat", "arch1",
                "--out", str(dest),
                "--due", "re-read the station skill and OP-PROC",
                "--board", "down",
            ])
            text = dest.read_text()
        self.assertIn("Seat: arch1", text)
        self.assertIn("The board server is unreachable.", text)
        self.assertIn("re-read the station skill and OP-PROC", text)
        self.assertNotIn("PRIVATE KEY", text)

    def test_the_scripts_do_not_ack(self):
        for name in ("remind-railway.mjs", "remind-local.mjs", "upkeep-board.mjs", "upkeep-seat.mjs"):
            text = (LIVE / "tools" / name).read_text()
            self.assertNotIn("--ack", text)
            self.assertNotIn("console.log", text)
