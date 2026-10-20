"""Board model (cards / packets / beats) + packet parser: Lead 1:53 PM spec."""
import json, os, sys, tempfile, time, unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))))
CT = ZoneInfo("America/Chicago")
R = "example-org/app"


def ct(ago):
    return datetime.fromtimestamp(time.time() - ago, CT).isoformat(timespec="seconds")


class Packet(unittest.TestCase):
    def test_block_and_single_line(self):
        import live_packet as p
        body = ("x\n## Packet\n- Goal: fix it, see https://evil.example/x and https://github.com/u/r/pull/1\n"
                "- **Acceptance**: tests green; ping bob@example.com\n- Next owner: Reviewer\n- Path: " + "a" * 400 + "\n## Notes\nGoal: no")
        d = p.parse(body)
        self.assertEqual(d["next owner"], "Reviewer")
        self.assertNotIn("evil", d["goal"]); self.assertIn("https://github.com/u/r/pull/1", d["goal"])
        self.assertIn("[email]", d["acceptance"]); self.assertLessEqual(len(d["path"]), 200)
        self.assertEqual(p.parse("Packet: goal: ship | acceptance: green | next owner: Builder; escalate: Lead"),
                         {"goal": "ship", "acceptance": "green", "next owner": "Builder", "escalate": "Lead"})
        self.assertEqual(p.parse("no packet here"), {})
        card = Path(__file__).resolve().parents[3] / "grok-bot" / "ops" / "cards" / "CLOUD-AGENT-WORKING-PACKET.md"
        fields = p.parse(card.read_text())
        self.assertLessEqual(len(fields["acceptance"]), 200)
        self.assertLessEqual(len(fields["evidence"]), 200)
        self.assertIn("second running row", fields["acceptance"])
        self.assertIn("idle clock stays off", fields["acceptance"])
        self.assertIn("error and aborted", fields["acceptance"])
        self.assertIn("WORKING_CLOUD_S", fields["evidence"])
        self.assertEqual(p.parse("[docs](https://notion.so/x) text\n## Packet\n- Goal: [d](https://notion.so/y) z"), {"goal": "d z"})

    def test_pr_packet_subsections_keep_scope_acceptance_and_next_owner(self):
        """PR 477's ## Packet ends at ### Scope unless subsections stay inside the block."""
        import live_packet as p
        body = (
            "## Packet\n\n"
            "Taken from packet #471 (`grok-bot/ops/packets/PACKET-CARD-REQUIRED.md`).\n\n"
            "### Scope\n\n"
            "Every packet has a card on the Bifrost wave board, and a cloud agent does not run without one.\n\n"
            "### Acceptance\n\n"
            "One card per id. A commit branches list plus sha, and a pr_open with that sha and base, "
            "rewrites the holding key. The launch still refuses a missing card id.\n\n"
            "### Next owner\n\n"
            "reviewer\n\n"
            "### Files\n\n"
            "- `house/live/app/server.mjs` — postSeatLines calls ensurePacketCard.\n\n"
            "## Notes\n\n"
            "- acceptance: not this\n"
        )
        fields = p.parse(body)
        self.assertEqual(fields["goal"], "Every packet has a card on the Bifrost wave board, and a cloud agent does not run without one.")
        self.assertIn("One card per id", fields["acceptance"])
        self.assertEqual(fields["next owner"], "reviewer")
        self.assertNotIn("not this", fields["acceptance"])
        self.assertNotIn("server.mjs", fields["goal"])
        self.assertNotIn("files", fields)

    def test_kanban_packet_is_packet_ok(self):
        import live_packet as p
        body = (Path(__file__).resolve().parents[3] / "grok-bot" / "ops" / "packets" / "PACKET-KANBAN.md").read_text()
        fields = p.parse(body)
        self.assertTrue(fields.get("acceptance"))
        self.assertTrue(fields.get("next owner"))
        missing = [f for f in ("acceptance", "next owner") if not fields.get(f)]
        self.assertEqual(missing, [])

    def test_kanban_exit_is_a_card_endpoint(self):
        body = (Path(__file__).resolve().parents[3] / "grok-bot" / "ops" / "packets" / "PACKET-KANBAN.md").read_text()
        self.assertIn("POST /cards/exit", body)
        self.assertIn("card_exit` is not added", body)
        self.assertIn("does not call `POST /activity`", body)
        self.assertIn("80", body)
        for key in ("repo", "number", "owner", "next", "acceptance", "evidence", "blockers"):
            self.assertIn(key, body)
        self.assertIn("`body`, `text`, or `message`", body)

    def test_kanban_exit_is_inside_the_wake_trap(self):
        body = (Path(__file__).resolve().parents[3] / "grok-bot" / "ops" / "packets" / "PACKET-KANBAN.md").read_text()
        self.assertIn("grok-bot/templates/house/fleet/WAKE-ROUTINE.md", body)
        self.assertIn("`--exit`, then `--turn end --tag wake`, then `--release`", body)
        self.assertIn("exits 0 and posts nothing", body)
        self.assertIn("does not run `--exit`", body)


class AttachHeld(unittest.TestCase):
    def test_commit_pr_commit_and_pr_open_leave_one_card(self):
        """A main commit listed first must not win. pr_commit names the head sha."""
        import importlib
        import live_board
        main_sha = "a" * 40
        sha = "b" * 40
        held = [{"key": "packet:line-9", "born": "packet", "repo": "acme/app", "number": 0,
                 "state": "live", "title": "hold", "owner": "forge", "last_beat_t": 1}]
        evs = [
            {"id": "a", "t_ct": ct(40), "kind": "commit", "repo": "acme/app", "sha": main_sha,
             "branches": ["main"], "from": "forge"},
            {"id": "c", "t_ct": ct(30), "kind": "commit", "repo": "acme/app", "sha": sha,
             "branches": ["cursor/hold"], "from": "forge"},
            {"id": "p", "t_ct": ct(30), "kind": "pr_commit", "repo": "acme/app", "sha": sha, "number": 9, "from": "forge"},
            {"id": "o", "t_ct": ct(20), "kind": "pr_open", "repo": "Acme/App", "number": 9, "base": "main",
             "sha": sha, "source": "https://github.com/acme/app/pull/9", "from": "forge", "title": "held", "pr_state": "open"},
        ]
        with tempfile.TemporaryDirectory() as root:
            live = Path(root) / "live"
            live.mkdir()
            (live / "cards.json").write_text(json.dumps({"cards": held}))
            with mock.patch.dict(os.environ, {"MESH_RUN": root, "LIVE_HELD_CARDS": ""}):
                board = importlib.reload(live_board)

                def one(cards):
                    keys = [c["key"] for c in cards]
                    self.assertEqual(keys.count("acme/app#9"), 1, keys)
                    self.assertNotIn("packet:line-9", keys)
                    self.assertEqual(len(keys), len(set(keys)))
                    card = next(c for c in cards if c["key"] == "acme/app#9")
                    self.assertEqual(card.get("alias"), "packet:line-9")
                    self.assertEqual(card.get("branch"), "cursor/hold")

                one(board.run(evs, write=False, held=held)["cards"])
                one(board.run(evs, write=False)["cards"])


class Model(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory(); root = Path(self.d.name)
        env = mock.patch.dict(os.environ); env.start(); self.addCleanup(env.stop)   # isolate: later suites inherit os.environ
        os.environ.update(MESH_RUN=str(root), INBOX_CACHE=str(root / "none.json"), LIVE_INBOX=str(root / "inbox"),
                          LIVE_BOARD=str(root / "BOARD.md"), LIVE_BOARD_STATIC=str(root / "static.md"))
        (root / "static.md").write_text("## Waiting on Lead\n- **Prod promotion.** only on Lead's word, mail a@b.com\n")
        import importlib, live_board
        self.w = importlib.reload(live_board); self.root = root

    def tearDown(self):
        self.d.cleanup()

    def ev(self, n, kind, ago, **kw):
        if kind == "pr_open":
            kw.setdefault("pr_state", "open")
        return {"id": f"{R}#{n}:{kind}:{ago}", "t_ct": ct(ago), "kind": kind, "repo": R, "number": n, "from": "Builder", "source": f"https://github.com/{R}/pull/{n}", **kw}

    def test_new_pr_and_issue_are_board_items(self):
        evs = [self.ev(40, "pr_open", 60, title="new pr"), self.ev(41, "issue_open", 60, title="new issue", pr_state="open")]
        keys = {c["key"]: c for c in self.w.model(evs)["cards"] if c.get("repo") == R}
        self.assertEqual({keys[f"{R.lower()}#40"]["kind"], keys[f"{R.lower()}#41"]["kind"]}, {"pr", "issue"})
        self.assertTrue(all(c["state"] == "live" for c in keys.values()))

    def test_comment_on_merged_or_closed_card_is_a_beat_and_keeps_it_on_the_board(self):
        evs = [self.ev(42, "pr_open", 200000, title="old merged"), self.ev(42, "merged", 190000),
               self.ev(42, "review_comment", 3600, **{"from": "Reviewer"}),
               self.ev(43, "pr_open", 200000, title="old closed", pr_state="closed"), self.ev(43, "pr_close", 190000),
               self.ev(43, "pr_comment", 3600, **{"from": "Reviewer"})]
        cards = {c["number"]: c for c in self.w.model(evs)["cards"] if c.get("repo") == R}
        self.assertEqual(set(cards), {42, 43}, "late comments keep closed cards visible")
        self.assertIn("comment after merge", [b["what"] for b in cards[42]["beats"]])
        self.assertIn("comment after close", [b["what"] for b in cards[43]["beats"]])
        self.assertEqual({cards[42]["state"], cards[43]["state"]}, {"closed"})

    def test_cards_stages_packets_stall_md(self):
        sha = "abcdef1234567"
        evs = [self.ev(1, "pr_open", 5000, title="fix a", packet={"goal": "g", "acceptance": "tests", "next owner": "Reviewer"}),
               self.ev(1, "pr_commit", 4000, sha=sha),
               {"id": "cr1", "t_ct": ct(3900), "kind": "check_run", "repo": R, "sha": sha, "conclusion": "failure", "source": "https://github.com/ci/1"},
               self.ev(2, "pr_open", 600, title="fix b"),                                       # no packet
               self.ev(2, "critic_pass", 300),
               {"id": "w1", "t_ct": ct(100), "kind": "watcher", "repo": R, "number": 2, "start_ct": ct(100), "end_ct": ct(100)},
               self.ev(3, "pr_open", 9000, title="done one"), self.ev(3, "merged", 8000, merge_sha="f00ba12"),
               self.ev(3, "lab_retest_pass", 7000), self.ev(3, "pr_commit", 6000, sha="1111111")]   # after close: ignored
        m = self.w.model(evs)
        c = {x["key"]: x for x in m["cards"]}
        a, b, d = c[f"{R}#1".lower()], c[f"{R}#2".lower()], c[f"{R}#3".lower()]
        self.assertEqual((a["stage"], a["state"], a["packet_ok"]), ("fix", "live", True))
        self.assertTrue(a["stall"])                                                              # 65 min, no beat
        self.assertEqual(a["packet"]["evidence"], "https://github.com/ci/1")                    # from the latest beat
        self.assertEqual((b["stage"], b["packet_ok"], b["missing"], b["packet"]["next owner"]), ("merge", False, ["acceptance"], "Builder"))   # PASS + green CI: Builder merges
        self.assertEqual([x["what"] for x in b["beats"]], ["opened", "Reviewer PASS"])            # idle watcher: no beat
        self.assertFalse(b["stall"])
        self.assertEqual((d["stage"], d["state"]), ("done", "closed"))
        self.assertEqual([x["what"] for x in d["beats"]], ["opened", "merged", "retest PASS"])  # stops when closed
        pin = [x for x in m["cards"] if x.get("pinned")][0]
        self.assertEqual(pin["title"], "Prod promotion"); self.assertNotIn("@", json.dumps(m))
        self.assertEqual(self.w.stall_lines(m), 1); self.assertEqual(self.w.stall_lines(m), 0)  # once per stall
        line = json.loads((self.root / "inbox" / "coord.jsonl").read_text())
        self.assertEqual((line["seat"], line["type"], line["number"]), ("coord", "stall", 1))
        self.assertTrue(self.w.write_md(m, force=True)); self.assertFalse(self.w.write_md(m))  # once a minute
        md = (self.root / "BOARD.md").read_text()
        self.assertIn("## Pinned", md); self.assertIn("STALL 60m+", md); self.assertIn("no packet", md)

    def test_prompt_stamp_is_the_first_beat_once(self):
        prompt = {"id": "ada.9", "t_ct": ct(120), "kind": "prompt", "from": "Ada", "note": "fixed summary"}
        body = "Prompt: ada.9\n\ngoal: ship\n"
        opened = self.ev(70, "issue_open", 60, title="from prompt", body=body, pr_state="open")
        second = self.ev(71, "pr_open", 30, title="second", body=body)
        cards = {c["number"]: c for c in self.w.model([opened, second], prompts=[prompt])["cards"] if c.get("repo") == R}
        self.assertEqual([b["what"] for b in cards[70]["beats"]][:2], ["owner prompt", "opened"])
        self.assertEqual(cards[70]["beats"][0]["id"], "ada.9")
        self.assertEqual(cards[70]["beats"][0]["note"], "fixed summary")
        self.assertEqual(cards[70]["beats"][0]["t"], int(self.w._t(prompt) * 1000))
        self.assertNotEqual(cards[70]["beats"][0]["t"], cards[70]["beats"][1]["t"])
        self.assertEqual([b["what"] for b in cards[71]["beats"]], ["opened"])
        hidden = [c for c in self.w.model([prompt, opened])["cards"] if c.get("number") == 70][0]
        beat = [b for b in hidden["beats"] if b["what"] == "owner prompt"][0]
        opened_beat = [b for b in hidden["beats"] if b["what"] == "opened"][0]
        self.assertNotIn("note", beat)
        self.assertEqual(beat["t"], opened_beat["t"])
        plain = [c for c in self.w.model([self.ev(72, "issue_open", 20, title="plain", pr_state="open")])["cards"] if c.get("number") == 72][0]
        self.assertEqual([b["what"] for b in plain["beats"]], ["opened"])

    def test_owner_comment_is_a_beat_other_comments_are_not(self):
        evs = [self.ev(8, "pr_open", 9000, title="x"), self.ev(8, "merged", 8000),
               dict(self.ev(8, "pr_comment", 600), **{"from": "Operator"}),          # e.g. ops-app's nudge comment
               dict(self.ev(8, "pr_comment", 300), **{"from": "Builder"})]
        c = [c for c in self.w.model(evs)["cards"] if c.get("number") == 8][0]
        # any comment after the merge is now a beat too (Bifrost: comments on merged PRs reach the board)
        self.assertEqual([b["what"] for b in c["beats"]], ["opened", "merged", "comment after merge", "owner comment"])

    def merged_card(self, n=20, *more):
        return [self.ev(n, "pr_open", 9000, title="m"), self.ev(n, "merged", 8000), *more]

    def card(self, evs, n=20):
        return [c for c in self.w.model(evs)["cards"] if c.get("number") == n][0]

    def test_merge_closes_the_card(self):
        c = self.card(self.merged_card())
        self.assertEqual((c["stage"], c["state"]), ("done", "closed"))
        self.assertNotIn("nudge_to", c)
        self.assertEqual(c["owner"], "Builder")

    def test_done_on_pass_or_fail_tick(self):
        for v in ("pass", "fail"):
            c = self.card(self.merged_card(20, self.ev(20, f"lab_retest_{v}", 600)))
            self.assertEqual((c["stage"], c["state"]), ("done", "closed"), v)
            self.assertNotIn("nudge_to", c)

    def test_done_when_later_merged_pr_fixes_it(self):
        evs = self.merged_card(20) + [self.ev(21, "pr_open", 900, title="fix", fixes=[20]), self.ev(21, "merged", 600)]
        c = self.card(evs)
        self.assertEqual((c["stage"], c["state"], c["resolved"]), ("done", "closed", "fixed by #21"))
        evs = self.merged_card(20) + [self.ev(21, "pr_open", 900, title="fix", fixes=[20])]          # fixing PR not merged; the merged card is already done
        self.assertEqual(self.card(evs)["stage"], "done")

    def test_done_when_owner_says_resolved(self):
        c = self.card(self.merged_card(20, dict(self.ev(20, "pr_comment", 300), resolved=True)))
        self.assertEqual((c["stage"], c["state"], c["beats"][-1]["what"]), ("done", "closed", "owner: resolved"))
        c = self.card(self.merged_card(20, dict(self.ev(20, "pr_comment", 300), **{"from": "Others", "resolved": True})))
        self.assertEqual((c["stage"], c["state"]), ("done", "closed"))                             # merge already closed it
        plain = [self.ev(22, "pr_open", 9000, title="u"), dict(self.ev(22, "pr_comment", 300), **{"from": "Others", "resolved": True})]
        self.assertNotEqual(self.card(plain, 22)["stage"], "done")                                 # only the owner
        own = [self.ev(23, "pr_open", 9000, title="u"), dict(self.ev(23, "pr_comment", 300), resolved=True)]
        self.assertEqual((self.card(own, 23)["stage"], self.card(own, 23)["state"]), ("done", "closed"))

    def test_start_after_parks_until_that_time_and_a_later_comment_keeps_it(self):
        import live_collect as uc
        self.assertEqual(uc.comment_start_after("Start after: 2030-01-02T08:00-06:00\nmore"), "2030-01-02T08:00-06:00")
        self.assertIsNone(uc.comment_start_after("Start after: tomorrow"))
        self.assertIsNone(uc.comment_start_after("see note\nStart after: 2030-01-02T08:00-06:00"))
        base = [self.ev(44, "pr_open", 9000, title="dated"), self.ev(44, "pr_commit", 8000)]
        future = datetime.fromtimestamp(time.time() + 2 * 86400, CT).isoformat(timespec="minutes")
        dated = dict(self.ev(44, "pr_comment", 100), start_after=future)
        c = self.card(base + [dated], 44)
        self.assertEqual((c["state"], c["stall"], c["start_after"]), ("parked", False, future))
        later = dict(self.ev(44, "pr_comment", 50), **{"from": "Builder"})
        c = self.card(base + [dated, later], 44)
        self.assertEqual((c["start_after"], c["state"]), (future, "parked"))
        past = "2020-01-02T08:00-06:00"
        old = dict(self.ev(44, "pr_comment", 90), start_after=past)
        c = self.card(base + [old], 44)
        self.assertEqual((c["start_after"], c["state"]), (past, "live"))
        closed = self.card(self.merged_card(45, dict(self.ev(45, "pr_comment", 300), start_after=future)), 45)
        self.assertEqual(closed["state"], "closed")

    def test_stranger_start_after_is_ignored_and_the_horizon_is_capped(self):
        base = [self.ev(46, "pr_open", 9000, title="gate"), self.ev(46, "pr_commit", 8000)]
        soon = datetime.fromtimestamp(time.time() + 2 * 86400, CT).isoformat(timespec="minutes")
        stranger = dict(self.ev(46, "pr_comment", 100), **{"from": "Others", "start_after": soon})
        c = self.card(base + [stranger], 46)
        self.assertNotIn("start_after", c)
        self.assertEqual(c["state"], "live")
        far = "2030-01-02T08:00-06:00"
        owner_far = dict(self.ev(46, "pr_comment", 90), start_after=far)
        c = self.card(base + [owner_far], 46)
        self.assertNotIn("start_after", c)
        self.assertEqual(c["state"], "live")
        fleet = dict(self.ev(46, "pr_comment", 80), **{"from": "forge", "start_after": soon})
        c = self.card(base + [fleet], 46)
        self.assertEqual((c["start_after"], c["state"]), (soon, "parked"))
        own = dict(self.ev(46, "pr_comment", 70), start_after=soon)
        c = self.card(base + [own, stranger], 46)
        self.assertEqual((c["start_after"], c["state"]), (soon, "parked"))

    def test_parked_comment_parks_until_a_newer_beat(self):
        import live_collect as uc
        for body in ("Parked: waiting on Lead", "  parked: x", "PARKED: y"):
            self.assertTrue(uc.PARKED_COMMENT_RE.match(body), body)
        self.assertFalse(uc.PARKED_COMMENT_RE.match("not Parked: yet"))
        base = [self.ev(30, "pr_open", 9000, title="p"), self.ev(30, "pr_commit", 8000)]
        park = dict(self.ev(30, "pr_comment", 5000), **{"from": "Coord", "parked": True})
        c = self.card(base + [park], 30)
        self.assertEqual((c["state"], c["stall"], c["beats"][-1]["what"]), ("parked", False, "parked"))
        for later in (self.ev(30, "pr_commit", 100), self.ev(30, "ci_pass", 100, conclusion="success"),
                      self.ev(30, "critic_pass", 100),
                      dict(self.ev(30, "pr_comment", 100), **{"from": "Reviewer"})):   # Others is hidden by default (fleet-only)
            self.assertEqual(self.card(base + [park, later], 30)["state"], "live", later["kind"])
        self.assertEqual(self.card(base + [park, self.ev(30, "merged", 100)], 30)["state"], "closed")
        self.assertEqual(self.card(base + [self.ev(30, "pr_commit", 6000), park], 30)["state"], "parked")   # older beat: stays parked
        merged = self.merged_card(31, dict(self.ev(31, "pr_comment", 300), **{"from": "Coord", "parked": True}))
        c = self.card(merged, 31); self.assertEqual(c["state"], "closed"); self.assertNotIn("nudge_to", c)

    def test_critic_pass_at_head_next_owner_builder_not_chaos(self):
        import live_collect as uc
        self.assertIn("reviewer-app[bot]", uc.CRITIC_LOGINS)
        self.assertTrue(uc.CRITIC_RE.match("**Reviewer: PASS: ready for lab test** @ 425dc03 (still a draft)"))
        op = dict(self.ev(40, "pr_open", 9000, title="d", draft=True), packet={"next owner": "Tester"})
        push = dict(self.ev(40, "pr_commit", 8000), sha="425dc03d41a8")
        ci = self.ev(40, "ci_pass", 7000, conclusion="success")
        crit = dict(self.ev(40, "critic_pass", 6000), sha="425dc03")
        c = self.card([op, push, ci, crit], 40)
        self.assertEqual((c["stage"], c["nudge_to"], c["packet"]["next owner"]), ("merge", "builder", "Builder"))
        self.assertEqual(c["reviewer"]["at_head"], True); self.assertEqual(c["head"], "425dc03")
        cb = [b for b in c["beats"] if b.get("kind") == "reviewer verdict"][0]
        self.assertEqual((cb["what"], cb["sha"]), ("Reviewer PASS", "425dc03"))
        newer = dict(self.ev(40, "pr_commit", 5000), sha="bbbbbbb1")             # pushed after the PASS: not at head
        c = self.card([op, push, ci, crit, newer], 40)
        self.assertFalse(c["reviewer"]["at_head"]); self.assertEqual(c["nudge_to"], "builder")   # never Tester before merge
        self.assertNotEqual(c["packet"]["next owner"], "Builder")
        c = self.card([op, push, ci, crit, self.ev(40, "merged", 4000)], 40)    # merge closes; a later retest needs a new issue
        self.assertEqual((c["stage"], c["state"]), ("done", "closed"))
        self.assertNotIn("nudge_to", c)

    def test_git_author_named_mill_is_not_a_seat(self):
        import live_collect as uc
        self.assertIsNone(uc.commit_login({"author": {"name": "mill", "user": None}}))
        self.assertIsNone(uc.rest_author_login({"author": None, "commit": {"author": {"name": "mill"}}}))
        self.assertIsNone(uc.commit_login({"author": {"name": "Someone", "user": None}}))
        issue = self.ev(294, "issue_open", 5000, title="board", **{"from": "forge"})
        alone = {c["number"]: c for c in self.w.model([issue])["cards"] if not c.get("pinned")}
        self.assertEqual(alone[294]["owner"], "forge")
        commit = dict(self.ev(303, "pr_commit", 800, message="land the wave #294"), **{"from": "forge", "credit": "forge", "author": "forge"})
        later = self.ev(294, "issue_comment", 100, **{"from": "forge"})
        cards = {c["number"]: c for c in self.w.model([
            issue, self.ev(303, "pr_open", 2000, title="pr", **{"from": "forge"}), commit, later,
        ])["cards"] if not c.get("pinned")}
        self.assertEqual(cards[294]["owner"], "forge")
        self.assertEqual(cards[303]["owner"], "forge")

    def test_shipped_closes_list_closes_those_cards_and_refs_stay_open(self):
        import live_collect as uc
        body = "Closes #287 #288 #289 #290 #291 #294 #295 #296 #297 #298 #299 #300\n\nRefs #292 #301 #302"
        fixes = uc.card_fields({"number": 303, "title": "ship", "state": "closed", "labels": [], "body": body})["fixes"]
        self.assertEqual(fixes, [287, 288, 289, 290, 291, 294, 295, 296, 297, 298, 299, 300])
        self.assertEqual(uc.card_fields({"number": 21, "body": "Fixes #20, supersedes #19; see #21"})["fixes"], [19, 20])
        class FF:
            CT = CT
        now = datetime.now(timezone.utc).replace(microsecond=0)
        def z(delta):
            return (now + delta).strftime("%Y-%m-%dT%H:%M:%SZ")
        class C:
            token = "t"
            def rest(self, path, params=None, etag=None, essential=False):
                if str(path).endswith("/commits") or str(path).endswith("/reviews"):
                    return 200, [], None, None
                return 200, [{
                    "number": 303, "user": {"login": "forge0x1[bot]"}, "updated_at": z(timedelta(hours=-24)),
                    "created_at": z(timedelta(days=-2)), "html_url": f"https://github.com/{R}/pull/303",
                    "title": "ship", "head": {"sha": "abc"}, "base": {"ref": "main"}, "state": "closed",
                    "merged_at": z(timedelta(hours=-26)), "draft": False, "body": body, "labels": [],
                }], "etag", None
        rc = uc.RepoCollector(R, self.root, FF(), lambda *a: None)
        rc.st["cur"]["pulls"] = z(timedelta(hours=-1))
        rc.st["bf"]["prs:done"] = True
        rc.st["etags"]["pulls"] = "old"
        with mock.patch.dict(uc.NODE_LC, {"forge0x1[bot]": "forge"}):
            rc.poll_pulls(C())
        self.assertEqual(rc.ev[f"{R}#303:open"]["fixes"], fixes)
        self.assertIn("303", rc.st["enrich"])
        self.assertTrue(rc.st["bf"].get("author:seat"))
        issues = [self.ev(n, "issue_open", 9000, title=f"i{n}", pr_state="open", **{"from": "forge"}) for n in (294, 300, 301, 302)]
        pr = self.ev(303, "pr_open", 4000, title="ship", pr_state="closed", fixes=fixes, **{"from": "forge"})
        cards = {c["number"]: c for c in self.w.model(issues + [pr, self.ev(303, "merged", 1000)])["cards"] if not c.get("pinned")}
        self.assertEqual(cards[294]["state"], "closed")
        self.assertEqual(cards[300]["state"], "closed")
        self.assertEqual(cards[301]["state"], "live")
        self.assertEqual(cards[302]["state"], "live")

    def test_collector_flags(self):
        import re, live_collect as uc
        self.assertEqual(uc.card_fields({"number": 21, "body": "Fixes #20, supersedes #19; see #21"})["fixes"], [19, 20])
        self.assertTrue(uc.RESOLVED_RE.search("Nothing on #200 is waiting on Builder."))
        self.assertFalse(uc.RESOLVED_RE.search("still working on it"))

    def test_unknown_state_quiet_card_hidden(self):
        e = self.ev(7, "pr_open", 200000, title="pre-capture"); e.pop("pr_state")
        self.assertEqual([c for c in self.w.model([e])["cards"] if not c.get("pinned")], [])

    def test_hold_label_comment_and_no_nudge(self):
        import live_packet as p
        os.environ.pop("NO_NUDGE_REPOS", None)
        os.environ.pop("GITHUB_HOLD_LABEL", None)
        self.assertEqual(p.no_nudge_patterns(), [])
        self.assertFalse(p.repo_no_nudge(R))
        self.assertEqual(p.parse_hold("Held: waiting on a decision\nuntil: Monday"), {"reason": "waiting on a decision", "until": "Monday"})
        held = self.card([self.ev(50, "pr_open", 1000, title="h", labels=["on-hold"])], 50)
        self.assertEqual(held["state"], "held")
        self.assertFalse(held["stall"]); self.assertNotIn("nudge_to", held)
        comment = dict(self.ev(52, "pr_comment", 100), **{"from": "Builder", "hold": {"reason": "waiting", "until": "monday"}})
        c = self.card([self.ev(52, "pr_open", 1000, title="h2"), comment], 52)
        self.assertEqual((c["state"], c["hold"]["reason"], c["hold"]["by"]), ("held", "waiting", "Builder"))
        parked = dict(self.ev(51, "pr_comment", 100), **{"from": "Builder", "parked": True})
        self.assertEqual(self.card([self.ev(51, "pr_open", 1000, title="p", labels=["on-hold"]), parked], 51)["state"], "parked")
        os.environ["NO_NUDGE_REPOS"] = "example-org/*"
        try:
            quiet = self.card([self.ev(53, "pr_open", 5000, title="q")], 53)
            self.assertFalse(quiet["stall"]); self.assertNotIn("nudge_to", quiet)
        finally:
            os.environ.pop("NO_NUDGE_REPOS", None)

    def test_closed_drops_after_24h(self):
        evs = [self.ev(5, "pr_open", 200000, title="old"), self.ev(5, "merged", 190000), self.ev(5, "lab_retest_pass", 180000)]
        self.assertEqual([c for c in self.w.model(evs)["cards"] if not c.get("pinned")], [])

    def test_review_approved_or_changes_requested_is_a_reviewer_beat(self):
        ok = self.card([self.ev(60, "pr_open", 4000, title="r"), self.ev(60, "review", 3000, state="APPROVED"),
                        self.ev(60, "ci_pass", 2000, conclusion="success")], 60)
        self.assertEqual(ok["stage"], "merge")
        self.assertEqual(ok["reviewer"]["verdict"], "PASS")
        self.assertEqual([b["what"] for b in ok["beats"] if b["what"].startswith("Reviewer")], ["Reviewer PASS"])
        bad = self.card([self.ev(61, "pr_open", 4000, title="r"), self.ev(61, "review", 3000, state="CHANGES_REQUESTED")], 61)
        self.assertEqual(bad["stage"], "fix")
        self.assertIn("Reviewer FAIL", [b["what"] for b in bad["beats"]])
        self.assertIsNone(self.w.beat_of({"kind": "review", "state": "COMMENTED"}))

    def test_a_push_stays_on_the_card_and_merged_by_is_the_merger(self):
        self.assertEqual(self.w.beat_of({"kind": "pr_commit"}), "pushed")
        self.assertEqual(self.w.beat_of({"kind": "pr_force_push"}), "pushed")
        self.assertEqual(self.w.beat_of({"kind": "pr_update"}), "pushed")
        evs = [self.ev(70, "pr_open", 9000, title="push")]
        evs.append(self.ev(70, "pr_commit", 8000, sha="abc1234abcdef"))
        evs.append(self.ev(70, "review", 7000, state="APPROVED", sha="abc1234"))
        evs.append(self.ev(70, "ci_fail", 6000, conclusion="failure"))
        evs.append(self.ev(70, "ci_fail", 5000, conclusion="failure"))
        evs.append(self.ev(70, "ci_pass", 4000, conclusion="success"))
        evs.append(self.ev(70, "merged", 3000, merged_by="critic0x[bot]"))
        c = self.card(evs, 70)
        self.assertIn("pushed", [b["what"] for b in c["beats"]])
        self.assertLessEqual(len(c["beats"]), 5)
        self.assertEqual(c["merged_by"], "critic0x[bot]")
        bare = self.card([self.ev(71, "pr_open", 9000, title="m"), self.ev(71, "merged", 1000)], 71)
        self.assertNotIn("merged_by", bare)

    def test_reopen_clears_closed_and_stop(self):
        evs = [self.ev(62, "pr_open", 5000, title="back"), self.ev(62, "pr_close", 4000),
               self.ev(62, "pr_reopen", 3000), self.ev(62, "pr_commit", 2000, sha="abc1234")]
        c = self.card(evs, 62)
        self.assertEqual(c["state"], "live")
        self.assertIn("pushed", [b["what"] for b in c["beats"]])
        issue = [self.ev(63, "issue_open", 5000, title="i", pr_state="open"), self.ev(63, "issue_close", 4000),
                 self.ev(63, "issue_reopen", 1000)]
        self.assertEqual(self.card(issue, 63)["state"], "live")

    def test_fleet_seat_comment_is_a_beat_stranger_is_not(self):
        base = [self.ev(64, "pr_open", 4000, title="talk")]
        fleet = self.card(base + [dict(self.ev(64, "pr_comment", 1000), **{"from": "critic"})], 64)
        self.assertIn("comment", [b["what"] for b in fleet["beats"]])
        stranger = self.card(base + [dict(self.ev(64, "pr_comment", 1000), **{"from": "Others"})], 64)
        self.assertNotIn("comment", [b["what"] for b in stranger["beats"]])

    def test_pr_ready_opens_and_pr_draft_parks_immediately(self):
        ready = self.card([self.ev(65, "pr_open", 8000, title="d", draft=True), self.ev(65, "pr_draft", 7000),
                           self.ev(65, "pr_ready", 100)], 65)
        self.assertEqual(ready["state"], "live")
        self.assertIn("opened", [b["what"] for b in ready["beats"]])
        parked = self.card([self.ev(66, "pr_open", 4000, title="d"), self.ev(66, "pr_commit", 100),
                            self.ev(66, "pr_draft", 50)], 66)
        self.assertEqual(parked["state"], "parked")

    def test_live_pr_parks_after_72h_with_no_beat(self):
        stale = self.card([self.ev(67, "pr_open", 73 * 3600, title="quiet")], 67)
        self.assertEqual(stale["state"], "parked")
        fresh = self.card([self.ev(68, "pr_open", 3600, title="fresh")], 68)
        self.assertEqual(fresh["state"], "live")

    def test_reopened_issue_is_live_not_parked(self):
        opened = self.ev(80, "issue_open", 3 * 86400, title="back", pr_state="open")
        closed = self.ev(80, "issue_close", 2 * 86400)
        reopened = self.ev(80, "issue_reopen", 30)
        c = self.card([opened, closed, reopened], 80)
        self.assertEqual(c["state"], "live")
        self.assertIn("reopened", [b["what"] for b in c["beats"]])
        self.assertEqual(self.w.beat_of({"kind": "pr_reopen"}), "reopened")


if __name__ == "__main__":
    unittest.main()


class CollectorCapture(unittest.TestCase):
    def test_card_fields_keep_packet_not_body(self):
        import live_collect as uc
        f = uc.card_fields({"title": "t", "state": "open", "labels": [{"name": "S2"}], "body": "secret prose\n## Packet\n- Goal: g\n- Next owner: Reviewer"})
        self.assertEqual(f["packet"], {"goal": "g", "next owner": "Reviewer"})
        self.assertNotIn("secret", json.dumps(f))
        stamped = uc.card_fields({"title": "t", "state": "open", "body": "Prompt: ada.9\nsecret prose"})
        self.assertEqual(stamped["prompt"], "ada.9")
        self.assertNotIn("body", stamped)
        self.assertNotIn("secret", json.dumps(stamped))


class ShipBeats(unittest.TestCase):
    def test_deploy_is_a_ship_beat_and_ci_stays(self):
        import live_board as w
        self.assertEqual(w.beat_of({"kind": "deploy"}), "ship")
        self.assertEqual(w.beat_of({"kind": "deploy_fail"}), "ship fail")
        self.assertEqual(w.beat_of({"kind": "op_deploy", "status": "SUCCESS"}), "ship")
        self.assertEqual(w.beat_of({"kind": "op_deploy", "status": "CRASHED"}), "ship fail")
        self.assertEqual(w.beat_of({"kind": "op_deploy", "status": "FAILED"}), "ship fail")
        self.assertIsNone(w.beat_of({"kind": "op_deploy", "status": "BUILDING"}))
        self.assertIsNone(w.beat_of({"kind": "op_deploy", "status": "DEPLOYING"}))
        self.assertEqual(w.beat_of({"kind": "ci_fail", "conclusion": "failure"}), "CI failure")
        self.assertEqual(w.beat_of({"kind": "check_run", "conclusion": "success"}), "CI success")


class Stats(unittest.TestCase):
    def test_counts_24h_and_open(self):
        import live_board as w
        e = lambda n, k, ago, **kw: {"id": f"{n}:{k}", "t_ct": ct(ago), "kind": k, "repo": R, "number": n, **kw}
        evs = [e(1, "issue_open", 3600, pr_state="open"), e(2, "issue_open", 90000, pr_state="open"), e(2, "issue_close", 600),
               e(3, "issue_open", 200000, pr_state="open"),
               e(10, "pr_open", 100, pr_state="open"), e(11, "pr_open", 5000, pr_state="closed"), e(11, "merged", 4000),
               e(12, "pr_open", 9000, pr_state="closed"), e(12, "pr_close", 8000), e(13, "pr_open", 300000, pr_state="open"),
               e(14, "pr_open", 300000)]                                    # pre-capture: state unknown, not counted open
        self.assertEqual(w.stats(evs), {"issues_opened_24h": 1, "issues_closed_24h": 1, "prs_opened_24h": 3, "prs_merged_24h": 1,
                                        "prs_closed_unmerged_24h": 1, "issues_open": 2, "prs_open": 2, "open_total": 4,
                                        "issues_opened_24h_ids": [f"{R}#1"],
                                        "issues_closed_24h_ids": [f"{R}#2"],
                                        "prs_opened_24h_ids": [f"{R}#10", f"{R}#11", f"{R}#12"],
                                        "prs_merged_24h_ids": [f"{R}#11"],
                                        "prs_closed_unmerged_24h_ids": [f"{R}#12"],
                                        "open_total_ids": [f"{R}#1", f"{R}#3", f"{R}#10", f"{R}#13"],
                                        "owner_prompts_24h": 0, "owner_prompts_24h_ids": [], "owner_prompts_24h_bytes": 0})

    def test_24h_count_equals_len_ids(self):
        import live_board as w
        e = lambda n, k, ago, **kw: {"id": f"{n}:{k}", "t_ct": ct(ago), "kind": k, "repo": R, "number": n, **kw}
        evs = [e(1, "issue_open", 3600, pr_state="open"), e(2, "issue_open", 90000, pr_state="open"), e(2, "issue_close", 600),
               e(3, "issue_open", 200000, pr_state="open"),
               e(10, "pr_open", 100, pr_state="open"), e(11, "pr_open", 5000, pr_state="closed"), e(11, "merged", 4000),
               e(12, "pr_open", 9000, pr_state="closed"), e(12, "pr_close", 8000), e(13, "pr_open", 300000, pr_state="open"),
               e(14, "pr_open", 300000)]
        got = w.stats(evs)
        for key in ("issues_opened_24h", "issues_closed_24h", "prs_opened_24h", "prs_merged_24h", "prs_closed_unmerged_24h", "open_total"):
            self.assertEqual(got[key], len(got[key + "_ids"]))

    def test_pr_close_with_merged_at_counts_as_merged(self):
        import live_board as w
        e = lambda n, k, ago, **kw: {"id": f"{n}:{k}", "t_ct": ct(ago), "kind": k, "repo": R, "number": n, **kw}
        evs = [e(20, "pr_open", 1000, pr_state="closed"), e(20, "pr_close", 800, merged_at="2026-10-20T06:00:00-05:00")]
        got = w.stats(evs)
        self.assertEqual(got["prs_merged_24h_ids"], [f"{R}#20"])
        self.assertEqual(got["prs_closed_unmerged_24h"], 0)
        self.assertEqual(got["prs_closed_unmerged_24h_ids"], [])

    def test_owner_prompts_count_ids_and_bytes(self):
        import live_board as w
        ada = {"id": "ada.1", "t_ct": ct(100), "kind": "prompt", "from": "Ada", "action": "sent", "note": "fixed summary"}
        ada2 = {"id": "ada.2", "t_ct": ct(50), "kind": "prompt", "from": "Ada", "action": "sent"}
        old = {"id": "ada.old", "t_ct": ct(90000), "kind": "prompt", "from": "Ada", "action": "sent"}
        other = {"id": "mill.1", "t_ct": ct(40), "kind": "prompt", "from": "mill", "action": "sent"}
        house = tempfile.TemporaryDirectory()
        path = Path(house.name) / "HOUSE.md"
        path.write_text("## Owner\nname: Ada\n", encoding="utf-8")
        os.environ["HOUSE"] = str(path)
        try:
            got = w.stats([ada, old, other, ada2])
            apart = w.stats([], prompts=[ada, ada2])
        finally:
            os.environ.pop("HOUSE", None)
            house.cleanup()
        self.assertEqual(got["owner_prompts_24h"], 2)
        self.assertEqual(got["owner_prompts_24h_ids"], ["ada.1", "ada.2"])
        self.assertEqual(got["owner_prompts_24h_bytes"], w.archived_bytes(ada) + w.archived_bytes(ada2))
        self.assertNotIn("fixed summary", " ".join(got["owner_prompts_24h_ids"]))
        self.assertEqual(apart["owner_prompts_24h_ids"], ["ada.1", "ada.2"])

    def test_owner_name_reads_env_then_file_then_house(self):
        import live_board as w
        os.environ.pop("LIVE_OWNER", None)
        os.environ.pop("LIVE_OWNER_FILE", None)
        os.environ.pop("HOUSE", None)
        house = tempfile.TemporaryDirectory()
        named = tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8")
        try:
            Path(house.name, "HOUSE.md").write_text("## Owner\nname: Ada\n", encoding="utf-8")
            os.environ["HOUSE"] = str(Path(house.name, "HOUSE.md"))
            self.assertEqual(w.owner_name(), "Ada")
            named.write("Nia\n")
            named.close()
            os.environ["LIVE_OWNER_FILE"] = named.name
            self.assertEqual(w.owner_name(), "Nia")
            os.environ["LIVE_OWNER"] = "Ada"
            self.assertEqual(w.owner_name(), "Ada")
            os.environ["LIVE_OWNER"] = "not a name!"
            self.assertEqual(w.owner_name(), "Nia")
        finally:
            os.environ.pop("LIVE_OWNER", None)
            os.environ.pop("LIVE_OWNER_FILE", None)
            os.environ.pop("HOUSE", None)
            house.cleanup()
            Path(named.name).unlink(missing_ok=True)


class BeatSentence(unittest.TestCase):
    def test_reopen_is_named_in_the_beat_sentence(self):
        board = Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed")) / "live_board.py"
        beat = next(ln for ln in board.read_text().splitlines() if ln.startswith("BEAT"))
        self.assertIn("reopen", beat)
        proc = HERE.parents[2] / "grok-bot" / "OP-PROC.md"
        line = next(ln for ln in proc.read_text().splitlines() if ln.startswith("- **Beat:**"))
        self.assertIn("a reopen", line.split("CI stays", 1)[0])
