"""The xray tree points at the bifrost repo and does not delete house/live."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHA = "e972d8d45cc962b1064aec76195c428beab65910"


class BifrostPointer(unittest.TestCase):
    def test_pointer_names_the_tip_and_health(self):
        text = (ROOT / "house/live/POINTER.md").read_text()
        self.assertIn("0xRayAI/bifrost", text)
        self.assertIn(SHA, text)
        self.assertIn("/healthz", text)
        self.assertIn("Do not delete", text)
        plate = (ROOT / "docs-site/docs/plates/bifrost.md").read_text()
        self.assertIn(SHA, plate)
        self.assertIn("/healthz", plate)
        self.assertIn("house/live/POINTER.md", plate)
        self.assertIn("until forge connects burst-live", plate)


if __name__ == "__main__":
    unittest.main()
