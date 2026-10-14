"""Board model (cards / packets / beats) + packet parser: Lead 1:53 PM spec."""
import json, os, sys, tempfile, time, unittest
from datetime import datetime
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
        self.assertEqual(p.parse("[docs](https://notion.so/x) text\n## Packet\n- Goal: [d](https://notion.so/y) z"), {"goal": "d z"})


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

    def test_mill_owns_a_card_forge_opened(self):
        import live_collect as uc
        self.assertEqual(uc.commit_login({"author": {"name": "mill", "user": None}}), "git:mill")
        self.assertEqual(uc.rest_author_login({"author": None, "commit": {"author": {"name": "mill"}}}), "git:mill")
        self.assertEqual((uc.node("git:mill"), uc.credit("git:mill")), ("mill", "mill"))
        self.assertIsNone(uc.commit_login({"author": {"name": "Someone", "user": None}}))
        issue = self.ev(294, "issue_open", 5000, title="board", **{"from": "forge"})
        alone = {c["number"]: c for c in self.w.model([issue])["cards"] if not c.get("pinned")}
        self.assertEqual(alone[294]["owner"], "forge")
        commit = dict(self.ev(303, "pr_commit", 800, message="land the wave #294"), **{"from": "mill", "credit": "mill", "author": "mill"})
        later = self.ev(294, "issue_comment", 100, **{"from": "forge"})
        cards = {c["number"]: c for c in self.w.model([
            issue, self.ev(303, "pr_open", 2000, title="pr", **{"from": "forge"}), commit, later,
        ])["cards"] if not c.get("pinned")}
        self.assertEqual(cards[294]["owner"], "mill")
        self.assertEqual(cards[303]["owner"], "mill")

    def test_shipped_closes_list_closes_those_cards_and_refs_stay_open(self):
        import live_collect as uc
        body = "Closes #287 #288 #289 #290 #291 #294 #295 #296 #297 #298 #299 #300\n\nRefs #292 #301 #302"
        fixes = uc.card_fields({"number": 303, "title": "ship", "state": "closed", "labels": [], "body": body})["fixes"]
        self.assertEqual(fixes, [287, 288, 289, 290, 291, 294, 295, 296, 297, 298, 299, 300])
        self.assertEqual(uc.card_fields({"number": 21, "body": "Fixes #20, supersedes #19; see #21"})["fixes"], [19, 20])
        class FF:
            CT = CT
        class C:
            token = "t"
            def rest(self, path, params=None, etag=None, essential=False):
                if str(path).endswith("/commits") or str(path).endswith("/reviews"):
                    return 200, [], None, None
                return 200, [{
                    "number": 303, "user": {"login": "forge0x1[bot]"}, "updated_at": "2026-10-14T17:00:00Z",
                    "created_at": "2026-10-14T12:00:00Z", "html_url": f"https://github.com/{R}/pull/303",
                    "title": "ship", "head": {"sha": "abc"}, "base": {"ref": "main"}, "state": "closed",
                    "merged_at": "2026-10-14T16:00:00Z", "draft": False, "body": body, "labels": [],
                }], "etag", None
        rc = uc.RepoCollector(R, self.root, FF(), lambda *a: None)
        rc.st["cur"]["pulls"] = "2026-10-14T18:00:00Z"
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


if __name__ == "__main__":
    unittest.main()


class CollectorCapture(unittest.TestCase):
    def test_card_fields_keep_packet_not_body(self):
        import live_collect as uc
        f = uc.card_fields({"title": "t", "state": "open", "labels": [{"name": "S2"}], "body": "secret prose\n## Packet\n- Goal: g\n- Next owner: Reviewer"})
        self.assertEqual(f["packet"], {"goal": "g", "next owner": "Reviewer"})
        self.assertNotIn("secret", json.dumps(f))


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
                                        "prs_closed_unmerged_24h": 1, "issues_open": 2, "prs_open": 2, "open_total": 4})
