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
class NonEmptyReadIsWork(unittest.TestCase):
    def test_phrase(self):
        root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
        for f in ("house/live/docs/inbox.md", "house/live/SETUP.md", "grok-bot/OP-PROC.md", "house/OP-PROC.md"):
            self.assertIn("a non-empty read is the work", open(os.path.join(root, f)).read().lower(), f)
class HandoffDocs(unittest.TestCase):
    def test_stale_board_source_is_gone_and_handoff_is_written_down(self):
        root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
        def text(rel):
            return open(os.path.join(root, rel)).read()
        setup, faq, deploy = text("house/live/SETUP.md"), text("house/live/docs/faq.md"), text("house/burst/DEPLOY.md")
        inbox, board = text("house/live/docs/inbox.md"), text("house/live/docs/board.md")
        op, lex = text("grok-bot/OP-PROC.md"), text("grok-bot/LEXICON.md")
        mesh = text("house/live/feed/live_mesh.py")
        for name, body in (("setup", setup), ("faq", faq), ("deploy", deploy), ("mesh", mesh)):
            self.assertNotIn("BOARD_BOX_STALE", body, name)
            self.assertNotIn("box board wins", body.lower(), name)
        self.assertNotIn("box pusher only", deploy.lower())
        self.assertIn("--handoff", inbox)
        self.assertIn("handoff missing", inbox)
        self.assertIn("not your handoff", setup)
        for body in (inbox, op, lex, board):
            self.assertIn("handoff missing", body)
        self.assertIn("**room post**", lex)
        self.assertIn("live_pass", op)
        self.assertIn("ci_fail", op)
        self.assertIn("Reviewer PASS", board)
        self.assertIn("pr_draft", board)
        self.assertIn("72 hours", board)
        self.assertIn("fleet seat", op.lower())
class CommentNeedle(unittest.TestCase):
    def test_comment_must_mention(self):
        root = os.path.join(os.path.dirname(__file__), "..", "..", "..")
        for f in ("house/OP-PROC.md", "house/live/docs/inbox.md"):
            t = open(os.path.join(root, f)).read()
            for s in ("must @-mention the next seat", "never its body", '"may merge" are not a merge ask'): self.assertIn(s, t, f)
