"""station-nudge: weekday window, routing seats, and a failure log with no key."""
import importlib.util
import os
import plistlib
import unittest
from datetime import datetime
from importlib.machinery import SourceFileLoader
from pathlib import Path
from zoneinfo import ZoneInfo

LIVE = Path(__file__).resolve().parent.parent
SCRIPT = LIVE / "bin" / "station-nudge"
PLIST = LIVE / "bin" / "com.burst.station-nudge.plist"
loader = SourceFileLoader("station_nudge", str(SCRIPT))
spec = importlib.util.spec_from_loader("station_nudge", loader)
mod = importlib.util.module_from_spec(spec)
loader.exec_module(mod)
CHICAGO = ZoneInfo("America/Chicago")


def at(text):
    return datetime.fromisoformat(text).astimezone(CHICAGO)


class StationNudge(unittest.TestCase):
    def test_window(self):
        self.assertTrue(mod.window_open(at("2026-10-26T07:30:00-05:00")))
        self.assertTrue(mod.window_open(at("2026-10-26T13:00:00-05:00")))
        self.assertTrue(mod.window_open(at("2026-10-26T17:59:00-05:00")))
        self.assertFalse(mod.window_open(at("2026-10-26T07:29:00-05:00")))
        self.assertFalse(mod.window_open(at("2026-10-26T18:00:00-05:00")))
        self.assertFalse(mod.window_open(at("2026-10-25T13:00:00-05:00")))

    def test_arch1_only_when_routed(self):
        self.assertEqual(mod.target_seats(None), ["forge", "critic", "blinky"])
        roles = {"routing": {"forge": {}, "critic": {}, "blinky": {}, "herald": {}}}
        self.assertEqual(mod.target_seats(roles), ["forge", "critic", "blinky"])
        roles["routing"]["arch1"] = {"outside": True}
        self.assertEqual(mod.target_seats(roles), ["forge", "critic", "blinky", "arch1"])

    def test_dry_run_stays_quiet_and_does_not_post(self):
        called = []

        def runner(*args, **kwargs):
            called.append(args)
            raise AssertionError("posted")

        env = {"STATION_NOW": "2026-10-25T13:00:00-05:00", "BIFROST_ROUTING_DIR": "/no/such/routing"}
        self.assertEqual(mod.main(["--dry-run"], env, runner), 0)
        self.assertEqual(called, [])
        open_env = {"STATION_NOW": "2026-10-26T13:00:00-05:00", "BIFROST_ROUTING_DIR": "/no/such/routing"}
        self.assertEqual(mod.main(["--dry-run"], open_env, runner), 0)

    def test_failure_log_names_the_seat_and_not_the_key(self):
        secret = "seat-key-do-not-print"

        class Result:
            returncode = 1
            stdout = ""
            stderr = "Bearer " + secret

        def runner(*args, **kwargs):
            return Result()

        env = {
            "STATION_NOW": "2026-10-26T13:00:00-05:00",
            "BIFROST_ROUTING_DIR": "/no/such/routing",
            "SEAT_KEYS_DIR": "/tmp/" + secret,
        }
        err = []
        out = []
        real_err, real_out = mod.sys.stderr, mod.sys.stdout

        class Pipe:
            def __init__(self, bucket):
                self.bucket = bucket

            def write(self, text):
                self.bucket.append(text)
                return len(text)

        mod.sys.stderr = Pipe(err)
        mod.sys.stdout = Pipe(out)
        try:
            code = mod.main([], env, runner)
        finally:
            mod.sys.stderr = real_err
            mod.sys.stdout = real_out
        self.assertEqual(code, 1)
        text = "".join(err) + "".join(out)
        self.assertIn("station nudge: forge post failed", text)
        self.assertNotIn(secret, text)

    def test_plist_is_a_template(self):
        self.assertTrue(os.access(SCRIPT, os.X_OK))
        raw = PLIST.read_text(encoding="utf-8")
        self.assertIn("Do not", raw)
        self.assertIn("403", raw)
        parsed = plistlib.loads(PLIST.read_bytes())
        self.assertTrue(parsed["ProgramArguments"][0].endswith("house/live/bin/station-nudge"))
        self.assertNotIn("KeepAlive", parsed)
        slots = parsed["StartCalendarInterval"]
        self.assertEqual(len(slots), 55)
        seen = {(slot["Weekday"], slot["Hour"], slot["Minute"]) for slot in slots}
        self.assertEqual(seen, {(day, hour, 30) for day in range(1, 6) for hour in range(7, 18)})


if __name__ == "__main__":
    unittest.main()
