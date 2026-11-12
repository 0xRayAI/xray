"""rollback.sh names deploymentRollback and refuses a bad id. It does not call railway down."""
import subprocess
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "app" / "rollback.sh"


class RollbackScript(unittest.TestCase):
    def test_the_script_does_not_run_down_or_redeploy(self):
        text = SCRIPT.read_text()
        self.assertIn("deploymentRollback", text)
        for line in text.splitlines():
            code = line.split("#", 1)[0]
            self.assertNotIn("railway down", code)
            self.assertNotIn("redeploy", code)

    def test_a_short_id_is_refused(self):
        ran = subprocess.run([str(SCRIPT), "e8ce27fb"], capture_output=True, text=True)
        self.assertEqual(ran.returncode, 2)
        self.assertIn("usage:", ran.stderr)


if __name__ == "__main__":
    unittest.main()
