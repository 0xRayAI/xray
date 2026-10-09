"""Lab-run and GitHub-check working signals."""
import json
import os
import tempfile
import time
import unittest
from pathlib import Path

import working as w


class FileMtime(unittest.TestCase):
    def test_file_mtime_within_150s_lights_and_skips_heavy_dirs(self):
        root = Path(tempfile.mkdtemp())
        keep = root / "runs"
        keep.mkdir()
        (keep / "out.txt").write_text("x")
        now = time.time()
        os.utime(keep / "out.txt", (now - 10, now - 10))
        nested = keep / "node_modules"
        nested.mkdir()
        stale = nested / "pkg.js"
        stale.write_text("y")
        os.utime(stale, (now - 1, now - 1))
        git = keep / ".git"
        git.mkdir()
        (git / "index").write_text("z")
        os.utime(keep, (now - 5000, now - 5000))  # folder mtime is not the signal
        watch = w.RunWatch()
        until = watch.scan([{"seat": "lab", "runs": [str(keep)], "folders": [str(keep)]}], now, cpu_seconds={})
        self.assertIn("lab", until)
        self.assertAlmostEqual(until["lab"], (now - 10) + w.RUN_MTIME_S, places=0)
        self.assertEqual(set(until), {"lab"})

    def test_old_file_does_not_light(self):
        root = Path(tempfile.mkdtemp())
        (root / "old.txt").write_text("x")
        now = time.time()
        os.utime(root / "old.txt", (now - 500, now - 500))
        watch = w.RunWatch()
        self.assertEqual(watch.scan([{"seat": "lab", "runs": [str(root)]}], now, cpu_seconds={}), {})

    def test_result_is_one_time_and_source_does_not_open_argv(self):
        src = Path(w.__file__).read_text()
        for banned in ("cmdline", "environ", "/proc/"):
            self.assertNotIn(f'"{banned}"', src)
            self.assertNotIn(f"'{banned}'", src)
        watch = w.RunWatch()
        until = watch.scan([{"seat": "qa", "runs": []}], time.time(), cpu_seconds={"qa": 1.5})
        self.assertEqual(list(until), ["qa"])
        self.assertIsInstance(until["qa"], float)


class Cpu(unittest.TestCase):
    def test_cpu_hold_after_one_second_and_baseline_is_not_a_light(self):
        proc = Path(tempfile.mkdtemp())
        pid = proc / "42"
        pid.mkdir()
        lab = Path(tempfile.mkdtemp())
        cwd = pid / "cwd"
        cwd.symlink_to(lab)
        stat = pid / "stat"
        stat.write_text("42 (python) R 0 0 0 0 0 0 0 0 0 0 0 0\n")
        watch = w.RunWatch()
        labs = [{"seat": "lab", "runs": [], "folders": [str(lab)]}]
        now = 1_000_000.0
        self.assertEqual(watch.scan(labs, now, proc_root=proc, clk=100), {})
        stat.write_text("42 (python) R 0 0 0 0 0 0 0 0 0 0 150 0\n")
        until = watch.scan(labs, now + 5, proc_root=proc, clk=100)
        self.assertAlmostEqual(until["lab"], now + 5 + w.CPU_HOLD_S)
        later = watch.scan(labs, now + 5 + 30, cpu_seconds={})
        self.assertAlmostEqual(later["lab"], now + 5 + w.CPU_HOLD_S)
        gone = watch.scan(labs, now + 5 + w.CPU_HOLD_S + 1, cpu_seconds={})
        self.assertNotIn("lab", gone)


class Checks(unittest.TestCase):
    def test_busy_check_newer_than_merge_within_30_min(self):
        now = 1_700_000_000.0
        t = "2023-11-14T22:13:20Z"  # not used; pass explicit iso from now
        started = datetime_iso(now - 60)
        merged = datetime_iso(now - 3600)
        note = w.note_check("mill", merged, "in_progress", None, started, None)
        self.assertIsNotNone(note)
        self.assertNotIn("name", note)
        out = w.check_working([note], now)
        self.assertAlmostEqual(out["mill"], (now - 60) + w.CHECK_WINDOW_S, places=0)

    def test_check_older_than_merge_or_window_is_dark(self):
        now = 1_700_000_000.0
        old = datetime_iso(now - 40 * 60)
        merged_after = datetime_iso(now - 30)
        self.assertEqual(w.check_working([
            w.note_check("mill", merged_after, "in_progress", None, datetime_iso(now - 120), None),
            w.note_check("forge", None, "completed", "failure", old, old),
            w.note_check("GitHub", None, "queued", None, datetime_iso(now - 10), None),
        ], now), {})

    def test_success_is_not_working(self):
        self.assertIsNone(w.note_check("mill", None, "completed", "success", "2026-10-09T14:00:00Z", "2026-10-09T14:00:00Z"))

    def test_host_token_derives_checks_from_actions_and_statuses(self):
        notes = w.notes_from_host_ci("mill", None, [
            {"status": "in_progress", "conclusion": None, "run_started_at": "2026-10-09T14:00:00Z", "name": "CI"},
            {"status": "completed", "conclusion": "success", "run_started_at": "2026-10-09T13:00:00Z"},
        ], [
            {"status": "queued", "started_at": "2026-10-09T14:01:00Z", "name": "test"},
        ], {"state": "failure", "statuses": [{"state": "failure", "updated_at": "2026-10-09T14:02:00Z", "context": "ci"}]})
        self.assertEqual(len(notes), 3)
        self.assertTrue(all("name" not in n and "context" not in n for n in notes))
        self.assertTrue(all(n["author"] == "mill" for n in notes))


def datetime_iso(ts):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts))


def iso_offset(ts):
    return time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime(ts))


class SeatActivity(unittest.TestCase):
    def test_open_start_lights_until_60_min(self):
        now = 1_700_000_000.0
        out = w.activity_working([{
            "t_ct": iso_offset(now - 120), "seat": "builder",
            "kind": "subagent", "action": "start", "tag": "review",
        }], now)
        self.assertEqual(set(out), {"builder"})
        self.assertAlmostEqual(out["builder"], now - 120 + w.ACTIVITY_HOLD_S)

    def test_a_later_end_for_the_same_tag_goes_dark(self):
        now = 1_700_000_000.0
        self.assertEqual(w.activity_working([
            {"t_ct": iso_offset(now - 200), "seat": "builder", "kind": "turn", "action": "start", "tag": "issue-1"},
            {"t_ct": iso_offset(now - 50), "seat": "builder", "kind": "turn", "action": "end", "tag": "issue-1"},
        ], now), {})

    def test_another_tag_stays_open_and_a_prompt_is_ignored(self):
        now = 1_700_000_000.0
        out = w.activity_working([
            {"t_ct": iso_offset(now - 61 * 60), "seat": "builder", "kind": "watcher", "action": "start", "tag": "old"},
            {"t_ct": iso_offset(now - 30), "seat": "builder", "kind": "subagent", "action": "start", "tag": "review"},
            {"t_ct": iso_offset(now - 10), "seat": "builder", "kind": "turn", "action": "end", "tag": "other"},
            {"t_ct": iso_offset(now - 5), "seat": "builder", "kind": "turn", "action": "start", "tag": "issue-1", "message": "secret prompt"},
        ], now)
        self.assertEqual(set(out), {"builder"})
        self.assertAlmostEqual(out["builder"], now - 30 + w.ACTIVITY_HOLD_S)
        self.assertNotIn("secret", str(out))

    def test_a_bad_jsonl_line_is_skipped(self):
        root = Path(tempfile.mkdtemp())
        path = root / "activity.jsonl"
        now = 1_700_000_000.0
        path.write_text(
            "not-json\n"
            + json.dumps({"t_ct": iso_offset(now - 15), "seat": "lab", "kind": "watcher", "action": "start", "tag": "repos"})
            + "\n",
            encoding="utf-8")
        out = w.activity_working_file(path, now)
        self.assertEqual(set(out), {"lab"})


if __name__ == "__main__":
    unittest.main()
