"""One cursor folder: $HOME/.burst/cursors. No search of the other two. A split file exits 2."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

STRAY_NAMES = (
    "zzsplit.txt",
    "zzsplit.txt.migrated",
    "zzsplit.txt.tmp",
    "zzsplit.claims.json",
    "zzsplit.claims.json.migrated",
    "zzsplit.lock",
    "zzsplit.lock.migrated",
    "zzmill.txt",
    "zzmill.txt.migrated",
    "zzmill.claims.json",
    "zzmill.claims.json.migrated",
    "zzmill.lock",
    "zzmill.lock.migrated",
    "zzonly.txt",
    "zzonly.txt.migrated",
)

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
        self._drop_strays()

    def tearDown(self):
        self._drop_strays()
        self.tmp.cleanup()

    def _drop_strays(self):
        for folder in (Path("/workspace/.cursors"), Path("/home/box/burst-run/cursors")):
            for name in STRAY_NAMES:
                self._drop(folder / name)
            self._drop_empty(folder)

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

    def invoke(self, *args, cursors=None, cwd=None):
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
        return self.invoke("--remember", "--pr", PR, "--sha", SHA, "--kind", KIND, **kw)

    def repeat(self, **kw):
        return self.invoke("--repeat", "--pr", PR, "--sha", SHA, "--kind", KIND, **kw)

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

    def plant(self, folder, name, text, ns):
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / name
        path.write_text(text)
        os.utime(path, ns=(ns, ns))
        return path

    def migrate(self):
        env = os.environ.copy()
        env["HOME"] = str(self.home)
        env["LIVE_URL"] = "http://127.0.0.1:9"
        env["SEAT_KEYS_DIR"] = str(self.keys)
        env.pop("LIVE_CURSORS", None)
        return subprocess.run([str(TOOL), "--migrate-cursors"], env=env, capture_output=True, text=True)

    def test_migrate_unions_keys_and_keeps_the_newest_sidecars(self):
        home = self.home / ".burst" / "cursors"
        work = Path("/workspace/.cursors")
        old = "0xrayai/xray#1|aaaaaaa|ready"
        shared = "0xrayai/xray#2|bbbbbbb|ready"
        newer = "0xrayai/xray#3|ccccccc|ready"
        self.plant(home, f"{SEAT}.txt", old + "\n" + shared + "\n", 1_000_000_000)
        self.plant(work, f"{SEAT}.txt", shared + "\n" + newer + "\n", 2_000_000_000)
        self.plant(home, f"{SEAT}.claims.json", '{"from":"home"}\n', 1_000_000_000)
        self.plant(work, f"{SEAT}.claims.json", '{"from":"work"}\n', 3_000_000_000)
        self.plant(home, f"{SEAT}.lock", "lock-home", 4_000_000_000)
        self.plant(work, f"{SEAT}.lock", "lock-work", 1_500_000_000)
        self.plant(home, "zzmill.txt", "0xrayai/xray#4|ddddddd|ready\n", 1_000_000_000)
        self.plant(work, "zzmill.txt", "0xrayai/xray#5|eeeeeee|ready\n", 2_000_000_000)
        self.plant(home, "zzonly.txt", "only-key\n", 1_000_000_000)
        r = self.migrate()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn(f"migrated {SEAT} 3 keys", r.stdout)
        self.assertIn("migrated zzmill 2 keys", r.stdout)
        self.assertNotIn("zzonly", r.stdout)
        merged = (home / f"{SEAT}.txt").read_text().splitlines()
        self.assertEqual(merged, [old, shared, newer])
        self.assertEqual(merged.count(shared), 1)
        self.assertEqual((home / f"{SEAT}.claims.json").read_text(), '{"from":"work"}\n')
        self.assertEqual((home / f"{SEAT}.lock").read_text(), "lock-home")
        self.assertFalse((work / f"{SEAT}.txt").exists())
        self.assertEqual((work / f"{SEAT}.txt.migrated").read_text().splitlines(), [shared, newer])
        self.assertTrue((home / f"{SEAT}.txt.migrated").is_file())
        self.assertEqual((home / f"{SEAT}.claims.json.migrated").read_text(), '{"from":"home"}\n')
        self.assertEqual((work / f"{SEAT}.claims.json.migrated").read_text(), '{"from":"work"}\n')
        self.assertEqual((home / f"{SEAT}.lock.migrated").read_text(), "lock-home")
        self.assertEqual((work / f"{SEAT}.lock.migrated").read_text(), "lock-work")
        self.assertEqual((home / "zzmill.txt").read_text().splitlines(), [
            "0xrayai/xray#4|ddddddd|ready",
            "0xrayai/xray#5|eeeeeee|ready",
        ])
        self.assertFalse((work / "zzmill.txt").exists())
        self.assertEqual((home / "zzonly.txt").read_text(), "only-key\n")
        self.assertFalse((home / "zzonly.txt.migrated").exists())
        again = self.migrate()
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertNotIn("migrated", again.stdout)
        self.assertEqual((home / f"{SEAT}.txt").read_text().splitlines(), merged)
        for number, sha in (("1", "aaaaaaa"), ("3", "ccccccc")):
            seen = self.invoke("--repeat", "--pr", f"0xRayAI/xray#{number}", "--sha", sha, "--kind", "ready")
            self.assertEqual(seen.returncode, 0, seen.stderr)
            self.assertIn("repeat", seen.stdout)
        missing = self.invoke("--repeat", "--pr", "0xRayAI/xray#9", "--sha", "fffffff", "--kind", "ready")
        self.assertEqual(missing.returncode, 1, missing.stderr)

    def test_migrate_refuses_to_replace_an_existing_migrated_file(self):
        home = self.home / ".burst" / "cursors"
        work = Path("/workspace/.cursors")
        self.plant(home, f"{SEAT}.txt", "0xrayai/xray#1|aaaaaaa|ready\n", 1_000_000_000)
        self.plant(work, f"{SEAT}.txt", "0xrayai/xray#2|bbbbbbb|ready\n", 2_000_000_000)
        self.plant(work, f"{SEAT}.txt.migrated", "already\n", 1)
        r = self.migrate()
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("already exists", r.stderr)
        self.assertEqual((home / f"{SEAT}.txt").read_text(), "0xrayai/xray#1|aaaaaaa|ready\n")
        self.assertEqual((work / f"{SEAT}.txt").read_text(), "0xrayai/xray#2|bbbbbbb|ready\n")
        self.assertEqual((work / f"{SEAT}.txt.migrated").read_text(), "already\n")

    def test_other_explicit_dir_stays_isolated(self):
        other = self.home / "board-cursors"
        r = self.remember(cursors=str(other))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((other / f"{SEAT}.txt").is_file())
        self.assertFalse(self.fixed_file().exists())


if __name__ == "__main__":
    unittest.main()
