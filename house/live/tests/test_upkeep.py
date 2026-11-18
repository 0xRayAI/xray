"""Upkeep findings. A missing prompt, drift, or a dead cron is one card. No ack. No keys."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
BOARD = LIVE / "tools" / "upkeep-board.mjs"
SEAT = LIVE / "tools" / "upkeep-seat.mjs"
NODE = os.environ.get("NODE", "node")


def run(script, payload):
    with tempfile.TemporaryDirectory() as tmp:
        spec = Path(tmp) / "in.json"
        spec.write_text(json.dumps(payload))
        out = subprocess.check_output([NODE, str(script), str(spec)], text=True)
    return json.loads(out)


class Upkeep(unittest.TestCase):
    def test_a_missing_report_is_one_dead_cron(self):
        found = run(BOARD, {"now": 1_000_000_000_000})
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["kind"], "dead-cron")

    def test_drift_is_one_finding(self):
        found = run(BOARD, {
            "now": 1_000_000_000_000,
            "report": {
                "generated_at": "2001-09-09T01:46:40.000Z",
                "drift": [{"seat": "forge", "what": "version drift"}],
            },
        })
        self.assertEqual([row["kind"] for row in found], ["drift"])
        self.assertEqual(found[0]["seat"], "forge")

    def test_an_owner_message_without_a_prompt_is_one_finding(self):
        found = run(BOARD, {
            "now": 1_000_000_000_000,
            "report": {"generated_at": "2001-09-09T01:46:40.000Z", "prompts": []},
            "ownerMessages": [{"id": "owner-1", "seat": "arch1"}],
        })
        self.assertEqual([row["kind"] for row in found], ["missing-prompt"])

    def test_a_copied_watcher_is_not_ok_and_the_rule_is_linked(self):
        text = SEAT.read_text()
        self.assertIn("grok-bot/OP-PROC.md#inbox-watcher", text)
        self.assertNotIn("3 minutes", text)
        report = run(SEAT, {
            "seats": ["arch1"],
            "now": "2026-10-28T16:00:00.000Z",
            "layouts": {
                "arch1": {
                    "bins": ["live-inbox"],
                    "liveInbox": "/Users/blaze/dev/xray/house/live/tools/live-inbox",
                    "version": "4.1.4",
                    "mainVersion": "4.1.4",
                    "skills": True,
                    "watcher": {
                        "pid": "9",
                        "last_ok": "2026-10-28T16:00:00.000Z",
                        "script": "/tmp/.burst/bin/inbox-watch.sh",
                    },
                },
            },
        })
        self.assertEqual(report["watcher"][0]["ok"], False)
        self.assertEqual(report["drift"], [])
        joined = json.dumps(report)
        self.assertNotIn("BEGIN ", joined)
        self.assertNotIn("PRIVATE KEY", joined)
