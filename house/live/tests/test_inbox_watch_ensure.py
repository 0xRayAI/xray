"""inbox-watch-ensure.sh keeps one watcher. inbox-watch-station.sh writes one Watcher line."""
import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

LIVE = Path(__file__).resolve().parent.parent
ENSURE = LIVE / "tools" / "inbox-watch-ensure.sh"
STATION = LIVE / "tools" / "inbox-watch-station.sh"


class Ensure(unittest.TestCase):
    def setUp(self):
        self.pids = []

    def tearDown(self):
        for pid in self.pids:
            try:
                os.kill(pid, 15)
            except OSError:
                pass

    def _sleeper(self, directory):
        script = Path(directory) / "inbox-watch.sh"
        script.write_text("#!/bin/bash\nsleep 30\n")
        script.chmod(0o755)
        proc = subprocess.Popen([str(script)])
        self.pids.append(proc.pid)
        return proc

    def _env(self, directory, **extra):
        env = {
            "PATH": os.environ["PATH"],
            "HOME": directory,
            "INBOX_WATCH_INTERVAL": "60",
            "INBOX_WATCH_STATE": str(Path(directory) / "inbox-watch.state"),
            "INBOX_WATCH_PID": str(Path(directory) / "inbox-watch.pid"),
            "INBOX_WATCH_LOG": str(Path(directory) / "inbox-watch.log"),
        }
        env.update(extra)
        return env

    def test_fresh_pid_is_left_alone(self):
        with tempfile.TemporaryDirectory() as directory:
            proc = self._sleeper(directory)
            state = Path(directory) / "inbox-watch.state"
            state.write_text(
                "pid=%s\nstarted=2026-10-23T12:00:00-0500\nlast_ok=%s\nlive_url=https://bifrost.0xray.dev\nscript=house/live/tools/inbox-watch.sh\n"
                % (proc.pid, time.strftime("%Y-%m-%dT%H:%M:%S%z"))
            )
            (Path(directory) / "inbox-watch.pid").write_text("%s\n" % proc.pid)
            marker = Path(directory) / "replacement.sh"
            marker.write_text("#!/bin/bash\necho replaced >> %s/ran\nsleep 30\n" % directory)
            marker.chmod(0o755)
            result = subprocess.run(
                ["bash", str(ENSURE), "arch1"],
                env=self._env(directory, INBOX_WATCH_BIN=str(marker)),
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, "")
            self.assertFalse((Path(directory) / "ran").exists())
            os.kill(proc.pid, 0)

    def test_dead_pid_starts_one_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / "inbox-watch.sh"
            script.write_text("#!/bin/bash\nsleep 30\n")
            script.chmod(0o755)
            (Path(directory) / "inbox-watch.pid").write_text("999999\n")
            result = subprocess.run(
                ["bash", str(ENSURE), "arch1"],
                env=self._env(directory, INBOX_WATCH_BIN=str(script)),
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("watcher restarted pid", result.stdout)
            pid = int(result.stdout.strip().split()[-1])
            self.pids.append(pid)
            again = subprocess.run(
                ["bash", str(ENSURE), "arch1"],
                env=self._env(directory, INBOX_WATCH_BIN=str(script)),
                capture_output=True,
                text=True,
            )
            self.assertEqual(again.returncode, 0, again.stderr)
            self.assertEqual(again.stdout, "")
            os.kill(pid, 0)

    def test_stale_poll_restarts_once(self):
        with tempfile.TemporaryDirectory() as directory:
            proc = self._sleeper(directory)
            (Path(directory) / "inbox-watch.state").write_text(
                "pid=%s\nstarted=2020-01-01T00:00:00+0000\nlast_ok=2020-01-01T00:00:00+0000\nlive_url=https://bifrost.0xray.dev\nscript=house/live/tools/inbox-watch.sh\n"
                % proc.pid
            )
            (Path(directory) / "inbox-watch.pid").write_text("%s\n" % proc.pid)
            replacement = Path(directory) / "next-inbox-watch.sh"
            replacement.write_text("#!/bin/bash\nsleep 30\n")
            replacement.chmod(0o755)
            result = subprocess.run(
                ["bash", str(ENSURE), "arch1"],
                env=self._env(directory, INBOX_WATCH_BIN=str(replacement)),
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("watcher restarted pid", result.stdout)
            new = int(result.stdout.strip().split()[-1])
            self.pids.append(new)
            self.assertNotEqual(new, proc.pid)
            proc.wait(timeout=3)
            self.assertIsNotNone(proc.returncode)
            os.kill(new, 0)


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
