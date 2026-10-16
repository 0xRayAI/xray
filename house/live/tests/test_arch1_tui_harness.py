"""arch1-tui-harness.sh --list names the public xray harness set. No network."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "tools" / "arch1-tui-harness.sh"

EXPECTED = [
    "opencode|scripts/test/test-opencode-e2e.mjs|",
    "openclaw|scripts/test/test-openclaw-e2e.mjs|",
    "hermes|scripts/test/test-hermes-e2e.mjs|",
    "grok|scripts/test/test-grok-cli-e2e.mjs|",
    "plugins|scripts/test/validate-plugins-e2e.cjs|",
    "repertoire|scripts/test/test-repertoire-organ-isolated.mjs|",
    "framework|scripts/test/test-unified-framework.mjs|",
    "suit-all|vendor/@0xray/repertoire/scripts/confirm-suit-all.mjs|--install",
    "opencode-suit|vendor/@0xray/repertoire/scripts/verify-opencode-suit.mjs|",
    "openclaw-suit|vendor/@0xray/repertoire/scripts/verify-openclaw-suit.mjs|",
    "hermes-suit|vendor/@0xray/repertoire/scripts/verify-hermes-suit.mjs|",
    "grok-suit|vendor/@0xray/repertoire/scripts/verify-grok-suit.mjs|",
    "grok-harness|vendor/@0xray/repertoire/scripts/confirm-suit-harness.mjs|",
    "cursor|scripts/node/wear-cursor-hooks.cjs|",
    "cursor|scripts/node/unwear-cursor-hooks.cjs|",
]


class Arch1TuiHarness(unittest.TestCase):
    def test_list_names_every_cjs_and_mjs_harness(self):
        done = subprocess.run(["bash", str(SCRIPT), "--list"], capture_output=True, text=True, check=True)
        lines = [line for line in done.stdout.splitlines() if "|" in line and not line.startswith("runtime|")]
        self.assertEqual(lines, EXPECTED)
        self.assertIn("https://github.com/0xRayAI/xray.git", done.stdout)
        self.assertNotIn("test-cursor-e2e.mjs", done.stdout)
        urls = [part for part in done.stdout.split() if "github.com/" in part]
        self.assertTrue(urls)
        self.assertTrue(all(part.startswith("https://github.com/0xRayAI/xray") for part in urls))

    def test_script_clones_only_the_public_xray_repo(self):
        text = SCRIPT.read_text()
        self.assertIn("https://github.com/0xRayAI/xray.git", text)
        self.assertIn("refusing checkout", text)
        remotes = [part for part in text.split() if "github.com/" in part.strip("\"'`)")]
        self.assertTrue(remotes)
        self.assertTrue(all("github.com/0xRayAI/xray" in part for part in remotes))
        self.assertNotIn("ghp_", text)
        self.assertNotIn("ghs_", text)
        self.assertIn("env -i", text)
        self.assertIn("--ignore-scripts", text)
        self.assertNotIn("credentials are unset", text)

    def _source_env(self, root: Path) -> dict:
        env = os.environ.copy()
        env["ARCH1_HARNESS_WORK"] = str(root / "work")
        env["ARCH1_HARNESS_LOG"] = str(root / "harness.log")
        (root / "work").mkdir()
        return env

    def _bash(self, body: str, env: dict) -> subprocess.CompletedProcess:
        return subprocess.run(["bash", "-c", body], capture_output=True, text=True, env=env)

    def test_clean_env_does_not_pass_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            env = self._source_env(root)
            env["BIFROST_KEY"] = "bifrost-secret-value"
            env["CURSOR_API_KEY"] = "cursor-secret-value"
            env["GH_TOKEN"] = "gh-secret-value"
            env["CI"] = "true"
            body = f'''
            source "{SCRIPT}"
            clean_env bash -c 'printf "B=%s\\nC=%s\\nG=%s\\nI=%s\\nP=%s\\n" "$BIFROST_KEY" "$CURSOR_API_KEY" "$GH_TOKEN" "$CI" "$PATH"'
            '''
            done = self._bash(body, env)
            self.assertEqual(done.returncode, 0, done.stderr)
            lines = dict(line.split("=", 1) for line in done.stdout.splitlines() if "=" in line)
            self.assertEqual(lines["B"], "")
            self.assertEqual(lines["C"], "")
            self.assertEqual(lines["G"], "")
            self.assertEqual(lines["I"], "")
            self.assertTrue(lines["P"])
            self.assertNotIn("bifrost-secret-value", done.stdout)
            self.assertNotIn("cursor-secret-value", done.stdout)
            self.assertNotIn("gh-secret-value", done.stdout)

    def test_replace_checkout_pins_sha_and_drops_the_stale_tree(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            origin = root / "origin"
            dest = root / "dest"
            origin.mkdir()
            git = ["git", "-C", str(origin)]
            subprocess.check_call(["git", "init", "-q", "-b", "main", str(origin)])
            subprocess.check_call(git + ["config", "user.email", "harness@example.com"])
            subprocess.check_call(git + ["config", "user.name", "Harness"])
            (origin / "a.txt").write_text("A\n")
            subprocess.check_call(git + ["add", "a.txt"])
            subprocess.check_call(git + ["commit", "-qm", "A"])
            sha_a = subprocess.check_output(git + ["rev-parse", "HEAD"], text=True).strip()
            (origin / "a.txt").write_text("B\n")
            (origin / "b.txt").write_text("B\n")
            subprocess.check_call(git + ["add", "a.txt", "b.txt"])
            subprocess.check_call(git + ["commit", "-qm", "B"])
            dest.mkdir()
            (dest / "stale.txt").write_text("stale\n")
            env = self._source_env(root)
            body = f'''
            source "{SCRIPT}"
            replace_checkout "{dest}" "{origin}" "{sha_a}"
            '''
            done = self._bash(body, env)
            self.assertEqual(done.returncode, 0, done.stderr)
            head = subprocess.check_output(["git", "-C", str(dest), "rev-parse", "HEAD"], text=True).strip()
            self.assertEqual(head, sha_a)
            self.assertFalse((dest / "stale.txt").exists())
            self.assertFalse((dest / "b.txt").exists())
            self.assertEqual((dest / "a.txt").read_text(), "A\n")

    def test_exit_result_is_nonzero_when_any_harness_is_red(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            env = self._source_env(root)
            failed = self._bash(f'source "{SCRIPT}"\nexit_result 1\n', env)
            self.assertEqual(failed.returncode, 1, failed.stderr)
            self.assertIn("result: fail 1", (root / "harness.log").read_text())
            (root / "harness.log").write_text("")
            passed = self._bash(f'source "{SCRIPT}"\nexit_result 0\n', env)
            self.assertEqual(passed.returncode, 0, passed.stderr)
            self.assertIn("result: pass", (root / "harness.log").read_text())

    def test_failed_install_rolls_back_the_old_package(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            opencode = home / ".opencode" / "bin" / "opencode"
            opencode.parent.mkdir(parents=True)
            opencode.write_text("#!/bin/sh\necho old\n")
            opencode.chmod(0o755)
            local_bin = home / ".local" / "bin" / "opencode"
            local_bin.parent.mkdir(parents=True)
            local_bin.write_text("#!/bin/sh\necho old\n")
            local_bin.chmod(0o755)
            rep = root / "repertoire"
            old_modules = root / "old-modules" / "0xray"
            old_modules.mkdir(parents=True)
            rep.mkdir()
            (rep / "node_modules").symlink_to(old_modules.parent)
            env = self._source_env(root)
            env["HOME"] = str(home)
            body = f'''
            source "{SCRIPT}"
            export HOME="{home}"
            fail_install opencode 1
            fail_suit_prep "{rep}" "npm install failed"
            exit_result
            '''
            done = self._bash(body, env)
            self.assertEqual(done.returncode, 1, done.stderr)
            self.assertFalse(opencode.exists())
            self.assertFalse(local_bin.exists())
            self.assertFalse((home / ".opencode").exists())
            self.assertFalse((rep / "node_modules").exists())
            self.assertTrue(old_modules.exists())
            self.assertIn("install opencode: failed exit 1", (root / "harness.log").read_text())
