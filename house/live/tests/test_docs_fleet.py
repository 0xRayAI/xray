import os, unittest
D = os.path.join(os.path.dirname(__file__), "..", "docs")
SECTIONS = ["## inbox-roles.json", "## routing/inbox.py kit defaults", "## fleet-nodes.json", "## fleet-roster.json",
            "## site.json", "## Avatars and fleet map images", "## Seat keys and SEAT_KEYS", "## Emoji marks", "## Arch1", "### Suit and hooks", "### Inbox watcher"]
TERMS = ["routes", "mirror_seat", "watcher_seats", "mentions", "fallback", "LIVE_NODE_MAP", "edit it in place",
         "draw-seat-emoji/SKILL.md", "xray-cloud-hook.sh", "run-grok-hook.mjs", "fails **open**",
         "Do not overwrite the product AGENTS.md", "Do not commit `.xray/`, `.grok/`, `.cursor/`, `dist`, `.mcp.json`",
         "Do not put AGENTS.md in `.gitignore`", "Never copy the arch10x1 GitHub App key", "`0xray pulse` says `WORN <current release>`",
         "`0xray validate`", "current release", "#suit-and-hooks"]
class FleetSetupDoc(unittest.TestCase):
    def test_sections(self):
        t = open(os.path.join(D, "fleet-setup.md")).read()
        for s in SECTIONS + TERMS: self.assertIn(s, t)
        self.assertNotIn("usmail", t.replace("~/.config/usmail-github-app/private-key.pem", ""))
        self.assertIn("fleet-setup.md#suit-and-hooks", open(os.path.join(D, "inbox.md")).read())
    def test_skill_and_links(self):
        root = os.path.join(D, "..", "..", "..")
        self.assertTrue(os.path.isfile(os.path.join(root, "grok-bot/skills/draw-seat-emoji/SKILL.md")))
        for f in ("../SETUP.md", "inbox.md"): self.assertIn("fleet-setup.md", open(os.path.join(D, f)).read())
