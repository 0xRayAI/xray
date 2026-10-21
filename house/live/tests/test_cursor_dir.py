"""One cursor folder: $HOME/.burst/cursors. No search of the other two. A split file exits 2."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "live-inbox"
SHA = "abc1234"
PR = "0xRayAI/xray#539"
KIND = "ready"
SEAT = "zzsplit"
WORKSPACE = Path("/workspace/.cursors") / f"{SEAT}.txt"
BOX = Path("/home/box/burst-run/cursors") / f"{SEAT}.txt"


class CursorDir(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.home = Path(self.tmp.name)
        self.keys = self.home / "keys"
        self.keys.mkdir()
        (self.keys / f"{SEAT}.key").write_text("k\n")
        self._drop(WORKSPACE)
        self._drop(BOX)

    def tearDown(self):
        self._drop(WORKSPACE)
        self._drop(BOX)
        self._drop_empty(WORKSPACE.parent)
        self._drop_empty(BOX.parent)
        self.tmp.cleanup()

    def _drop(self, path):
        try:
            path.unlink()
        except FileNotFoundError:
            pass

    def _drop_empty(self, folder):
        try:
            folder.rmdir()
        except OSError:
            pass

    def run(self, *args, cursors=None, cwd=None):
        env = os.environ.copy()
        env["HOME"] = str(self.home)
        env["LIVE_URL"] = "http://127.0.0.1:9"
        env["SEAT_KEYS_DIR"] = str(self.keys)
        env.pop("LIVE_CURSORS", None)
        if cursors is not None:
            env["LIVE_CURSORS"] = cursors
        return subprocess.run(
            [str(TOOL), SEAT, *args],
            env=env,
            cwd=cwd or "/workspace",
            capture_output=True,
            text=True,
        )

    def remember(self, **kw):
        return self.run("--remember", "--pr", PR, "--sha", SHA, "--kind", KIND, **kw)

    def repeat(self, **kw):
        return self.run("--repeat", "--pr", PR, "--sha", SHA, "--kind", KIND, **kw)

    def fixed_file(self):
        return self.home / ".burst" / "cursors" / f"{SEAT}.txt"

    def test_unset_writes_only_the_fixed_folder(self):
        r = self.remember()
        self.assertEqual(r.returncode, 0, r.stderr)
        path = self.fixed_file()
        self.assertTrue(path.is_file(), path)
        self.assertIn(f"0xrayai/xray#539|{SHA}|{KIND}", path.read_text())
        self.assertFalse(WORKSPACE.exists())
        self.assertFalse(BOX.exists())
        again = self.repeat()
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn("repeat", again.stdout)

    def test_workspace_file_alone_is_not_a_repeat(self):
        WORKSPACE.parent.mkdir(parents=True, exist_ok=True)
        WORKSPACE.write_text(f"0xrayai/xray#539|{SHA}|{KIND}\n")
        r = self.repeat()
        self.assertEqual(r.returncode, 1, r.stderr)
        self.assertIn("new", r.stdout)
        self.assertFalse(self.fixed_file().exists())

    def test_split_home_and_workspace_exits_2(self):
        folder = self.fixed_file().parent
        folder.mkdir(parents=True)
        self.fixed_file().write_text("kept\n")
        WORKSPACE.parent.mkdir(parents=True, exist_ok=True)
        WORKSPACE.write_text("kept\n")
        r = self.repeat()
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn("more than one folder", r.stderr)
        self.assertIn(str(WORKSPACE), r.stderr)
        self.assertIn(str(self.fixed_file()), r.stderr)

    def test_split_with_box_file_exits_2(self):
        try:
            BOX.parent.mkdir(parents=True, exist_ok=True)
            BOX.write_text("kept\n")
        except OSError as err:
            self.skipTest(f"cannot plant the box cursor file: {err}")
        folder = self.fixed_file().parent
        folder.mkdir(parents=True)
        self.fixed_file().write_text("kept\n")
        r = self.repeat()
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn(str(BOX), r.stderr)
        self.assertIn(str(self.fixed_file()), r.stderr)

    def test_live_cursors_workspace_is_refused(self):
        r = self.remember(cursors="/workspace/.cursors")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("not the cursor folder", r.stderr)
        self.assertIn(str(self.home / ".burst" / "cursors"), r.stderr)
        self.assertFalse(self.fixed_file().exists())

    def test_relative_workspace_cursors_is_refused(self):
        r = self.remember(cursors=".cursors", cwd="/workspace")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("not the cursor folder", r.stderr)

    def test_live_cursors_box_is_refused(self):
        r = self.remember(cursors="/home/box/burst-run/cursors")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("not the cursor folder", r.stderr)
        self.assertIn(str(self.home / ".burst" / "cursors"), r.stderr)

    def test_explicit_fixed_folder_still_works(self):
        fixed = str(self.home / ".burst" / "cursors")
        r = self.remember(cursors=fixed)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue(self.fixed_file().is_file())

    def test_other_explicit_dir_stays_isolated(self):
        other = self.home / "board-cursors"
        r = self.remember(cursors=str(other))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((other / f"{SEAT}.txt").is_file())
        self.assertFalse(self.fixed_file().exists())


if __name__ == "__main__":
    unittest.main()
