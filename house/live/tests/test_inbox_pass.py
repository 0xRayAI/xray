"""Seat inboxes (xray PR #5 port): the seed pass delivers the grace window; older history stays silent."""
import json, os, subprocess, sys, tempfile, time, unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
HERE = Path(__file__).resolve().parent
FEED = Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))
CT = ZoneInfo("America/Chicago")


def ct(ago):
    return datetime.fromtimestamp(time.time() - ago, CT).isoformat(timespec="seconds")


class InboxPass(unittest.TestCase):
    def run_pass(self, env, *a):
        return subprocess.run([sys.executable, "-B", str(FEED / "inbox_pass.py"), *a], env=env, capture_output=True, text=True, check=True).stdout.strip()

    def test_seed_then_route(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            R = "example-org/app"
            old = [{"id": f"{R}#1:open", "t_ct": ct(900), "kind": "pr_open", "repo": R, "number": "1", "label": "old pr", "source": "https://github.com/x"}]
            (run / "feed" / "live-events.json").write_text(json.dumps({"events": old}))
            self.assertEqual(self.run_pass(env, "pass"), "0 0")
            self.assertFalse((run / "feed" / "inbox-spool").exists())                   # history never delivered
            sha = "43791b74e3a07c65904a0c3ca15158f6f8494e78"
            new = old + [
                {"id": f"{R}#2:open", "t_ct": ct(60), "kind": "pr_open", "repo": R, "number": "2", "label": "pr 2 opened", "source": "https://github.com/x/2"},
                {"id": f"{R}#2:commit:{sha[:14]}", "t_ct": ct(50), "kind": "pr_commit", "repo": R, "number": "2", "sha": sha, "label": "push", "message": "SECRET body"},
                {"id": f"{R}#3:merged", "t_ct": ct(40), "kind": "merged", "repo": R, "number": "3", "base": "develop", "label": "merged #3"},
                {"id": f"{R}:status:x", "t_ct": ct(30), "kind": "deploy_fail", "repo": R, "sha": sha, "label": "deploy fail"},
                {"id": f"{R}#2:reviewer", "t_ct": ct(20), "kind": "critic_pass", "repo": R, "number": "2", "sha": sha[:7], "label": "reviewer PASS #2"},
                {"id": f"{R}:checkrun:9", "t_ct": ct(10), "kind": "check_run", "repo": R, "sha": sha, "name": "test", "conclusion": "success", "label": "test success"}]
            ev = run / "pulled.json"; ev.write_text(json.dumps({"cursor": "E_1.5", "events": new}))
            self.run_pass(env, "pull", str(ev))
            out = self.run_pass(env, "pass").split()
            self.assertEqual(out[0], "6")
            box = run / "feed" / "inbox-spool"
            rd = lambda s: [json.loads(x) for x in (box / f"{s}.jsonl").read_text().splitlines()]
            heads = {f"pr:{R}#2@{R}#2:open", f"pr:{R}#2@{sha[:12]}"}   # one line per new PR / new head (pr_heads)
            self.assertEqual({l["id"] for l in rd("critic")}, heads)
            self.assertEqual({l["id"] for l in rd("blinky")}, heads)
            forge = rd("forge")   # kit roles tester / operator / builder all map to forge
            self.assertEqual(sorted(l["reason"] for l in forge if l["type"] != "ready"), ["merge to develop", "railway deploy"])
            ready = [l for l in forge if l["type"] == "ready"]; self.assertEqual(ready[0]["number"], 2)
            self.assertEqual(set(os.listdir(box)), {"critic.jsonl", "blinky.jsonl", "forge.jsonl"})   # no sample seat inbox
            self.assertNotIn("SECRET", (box / "critic.jsonl").read_text())
            self.assertEqual(self.run_pass(env, "pass"), "0 0")                       # idempotent
            n = int(self.run_pass(env, "unsent", str(run / "a.json")))
            self.assertEqual(n, sum(len((box / f).read_text().splitlines()) for f in os.listdir(box)))   # every seat goes to the server
            self.run_pass(env, "sent", str(run / "a.json"))
            self.assertEqual(self.run_pass(env, "unsent", str(run / "a.json")), "0")

    def test_mention_added_on_edit_routes_once(self):
        """An edited comment keeps its id (the collector re-reads it on updated_at); a newly added @mention still routes."""
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            R = "example-org/app"
            feed = run / "feed" / "live-events.json"
            seed = {"id": f"{R}#1:open", "t_ct": ct(900), "kind": "pr_open", "repo": R, "number": "1", "label": "old", "source": "https://github.com/x"}
            feed.write_text(json.dumps({"events": [seed]}))
            self.run_pass(env, "pass")
            cm = {"id": f"{R}!7:comment:55", "t_ct": ct(60), "kind": "issue_comment", "repo": R, "number": "7", "from": "blinky",
                  "label": "blinky comment · app issue #7", "source": "https://github.com/x/7", "mentions": ["forge0x1"]}
            feed.write_text(json.dumps({"events": [seed, cm]}))
            self.run_pass(env, "pass")
            box = run / "feed" / "inbox-spool"
            rd = lambda s: [json.loads(x) for x in (box / f"{s}.jsonl").read_text().splitlines()] if (box / f"{s}.jsonl").exists() else []
            self.assertEqual([l["id"] for l in rd("forge")], [cm["id"]])
            self.assertEqual(rd("arch1"), [])
            before = {s: len(rd(s)) for s in ("blinky", "critic", "mill")}
            feed.write_text(json.dumps({"events": [seed, dict(cm, mentions=["forge0x1", "arch10x"])]}))   # edit adds @arch10x
            self.assertEqual(self.run_pass(env, "pass").split()[0], "1")
            self.assertEqual([l["id"] for l in rd("arch1")], [f"{cm['id']}:edit:arch10x"])
            self.assertEqual(len(rd("forge")), 1)                                   # forge was already mentioned: no second line
            self.assertEqual({s: len(rd(s)) for s in before}, before)              # no comment-watch duplicate
            self.assertEqual(self.run_pass(env, "pass"), "0 0")                     # same edit again: nothing
            feed.write_text(json.dumps({"events": [seed, dict(cm, mentions=["arch10x"])]}))   # a mention removed: nothing
            self.assertEqual(self.run_pass(env, "pass"), "0 0")

    def test_pr_open_mention_and_terminal_op_deploy_wake_forge(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            R = "example-org/app"
            feed = run / "feed" / "live-events.json"
            seed = {"id": f"{R}#1:open", "t_ct": ct(900), "kind": "pr_open", "repo": R, "number": 1, "label": "old", "source": "https://github.com/x"}
            feed.write_text(json.dumps({"events": [seed]}))
            self.assertEqual(self.run_pass(env, "pass"), "0 0")
            fresh = [seed,
                     {"id": f"{R}#9:open", "t_ct": ct(30), "kind": "pr_open", "repo": R, "number": 9, "from": "critic",
                      "label": "pr 9", "source": "https://github.com/x/9", "mentions": ["mill"]},
                     {"id": "op:rw:abcd1234:BUILDING", "t_ct": ct(20), "kind": "op_deploy", "status": "BUILDING", "from": "Operator",
                      "repo": R, "number": 0, "label": "deploy building", "service": "burst-live"},
                     {"id": "op:rw:abcd1234:SUCCESS", "t_ct": ct(10), "kind": "op_deploy", "status": "SUCCESS", "from": "Operator",
                      "repo": R, "number": 0, "label": "deploy success", "service": "burst-live"}]
            feed.write_text(json.dumps({"events": fresh}))
            self.run_pass(env, "pass")
            box = run / "feed" / "inbox-spool"
            rd = lambda s: [json.loads(x) for x in (box / f"{s}.jsonl").read_text().splitlines()] if (box / f"{s}.jsonl").exists() else []
            self.assertTrue(any("9" in str(l.get("number")) or "#9" in str(l.get("id")) for l in rd("forge")))
            self.assertFalse(rd("mill"))
            self.assertTrue(any(l.get("id") == "op:rw:abcd1234:SUCCESS" for l in rd("forge")))
            self.assertFalse(any(l.get("id") == "op:rw:abcd1234:BUILDING" for l in rd("forge")))

    def test_seed_delivers_fresh_arch1_mention(self):
        """Empty route state still delivers a fresh @arch10x comment and handoff (#620).

        The seed pass marks older ids seen and writes no line for them. An issue
        comment, a PR comment, and a packet inside the grace are delivered once.
        """
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            R = "0xRayAI/xray"
            old_issue = {"id": f"{R}!608:comment:6402034337", "t_ct": ct(900), "kind": "issue_comment", "repo": R,
                         "number": 608, "from": "forge0x1[bot]", "label": "forge comment · xray issue #608",
                         "source": "https://github.com/0xRayAI/xray/issues/608#issuecomment-6402034337", "mentions": ["arch10x"]}
            old_pr = {"id": f"{R}#614:comment:6413388677", "t_ct": ct(3 * 3600), "kind": "pr_comment", "repo": R,
                      "number": 614, "from": "critic0x[bot]", "label": "critic comment · xray pull #614",
                      "source": "https://github.com/0xRayAI/xray/pull/614#issuecomment-6413388677", "mentions": ["arch10x"]}
            fresh_issue = {"id": f"{R}!620:comment:6413715112", "t_ct": ct(60), "kind": "issue_comment", "repo": R,
                           "number": 620, "from": "forge0x1[bot]", "label": "forge comment · xray issue #620",
                           "source": "https://github.com/0xRayAI/xray/issues/620#issuecomment-6413715112", "mentions": ["arch10x"]}
            fresh_pr = {"id": f"{R}#615:comment:6413389184", "t_ct": ct(30), "kind": "pr_comment", "repo": R,
                        "number": 615, "from": "forge0x1[bot]", "label": "forge comment · xray pull #615",
                        "source": "https://github.com/0xRayAI/xray/pull/615#issuecomment-6413389184", "mentions": ["arch10x"]}
            fresh_handoff = {"id": f"handoff:{R}#549:ready:c6366225661", "t_ct": ct(20), "kind": "packet", "repo": R,
                             "number": 549, "from": "forge0x1[bot]", "label": "handoff ready",
                             "source": "https://github.com/0xRayAI/xray/issues/549", "mentions": ["arch10x"]}
            feed = run / "feed" / "live-events.json"
            feed.write_text(json.dumps({"events": [old_issue, old_pr, fresh_issue, fresh_pr, fresh_handoff]}))
            out = self.run_pass(env, "pass").split()
            self.assertEqual(out[0], "3", out)
            box = run / "feed" / "inbox-spool"
            rd = lambda s: [json.loads(x) for x in (box / f"{s}.jsonl").read_text().splitlines()] if (box / f"{s}.jsonl").exists() else []
            self.assertEqual([l["id"] for l in rd("arch1")], [fresh_issue["id"], fresh_pr["id"], fresh_handoff["id"]])
            blob = "".join(f.read_text() for f in box.glob("*.jsonl"))
            self.assertNotIn(old_issue["id"], blob)
            self.assertNotIn(old_pr["id"], blob)
            self.assertEqual(self.run_pass(env, "pass"), "0 0")


if __name__ == "__main__":
    unittest.main()


class ResetPullSeeds(unittest.TestCase):
    def test_reset_pull_is_history(self):
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            (run / "feed" / "live-events.json").write_text(json.dumps({"events": []}))
            go = lambda *a: subprocess.run([sys.executable, "-B", str(FEED / "inbox_pass.py"), *a], env=env, capture_output=True, text=True, check=True).stdout.strip()
            go("pass")
            R = "example-org/app"
            hist = [{"id": f"{R}#{n}:open", "t_ct": ct(3600 + n), "kind": "pr_open", "repo": R, "number": n, "label": "x"} for n in range(50)]
            (run / "p.json").write_text(json.dumps({"cursor": "E.1", "reset": True, "events": hist}))
            go("pull", str(run / "p.json"))
            self.assertEqual(go("pass").split()[0], "0")                     # server history is never delivered
            (run / "p.json").write_text(json.dumps({"cursor": "E.2", "events": [{"id": f"{R}#99:open", "t_ct": ct(5), "kind": "pr_open", "repo": R, "number": 99, "label": "new"}]}))
            go("pull", str(run / "p.json"))
            self.assertEqual(go("pass").split()[0], "1")
            crit = [json.loads(x) for x in (run / "feed" / "inbox-spool" / "critic.jsonl").read_text().splitlines()]
            self.assertEqual([l["number"] for l in crit], [99])                 # only the real new event


class HistoryNeverRouted(unittest.TestCase):
    def test_clean_volume_backfill_after_seed_is_history(self):
        """Deploy on a clean route dir: the seed pass sees a partial feed, then the collector's next pass adds old ids."""
        with tempfile.TemporaryDirectory() as d:
            run = Path(d); (run / "feed").mkdir(); (run / "fleet").mkdir()
            env = dict(os.environ, MESH_RUN=str(run), LIVE_BOARD="off")
            go = lambda *a: subprocess.run([sys.executable, "-B", str(FEED / "inbox_pass.py"), *a], env=env, capture_output=True, text=True, check=True).stdout.strip()
            R = "example-org/app"
            (run / "feed" / "live-events.json").write_text(json.dumps({"events": [{"id": f"{R}#1:open", "t_ct": ct(900), "kind": "pr_open", "repo": R, "number": 1, "label": "x"}]}))
            self.assertEqual(go("pass"), "0 0")
            old = [{"id": f"{R}#{n}:open", "t_ct": ct(2 * 86400 + n), "kind": "pr_open", "repo": R, "number": n, "label": "@critic old ask"} for n in range(2, 7)]
            fresh = {"id": f"{R}#99:open", "t_ct": ct(5), "kind": "pr_open", "repo": R, "number": 99, "label": "new"}
            (run / "feed" / "live-events.json").write_text(json.dumps({"events": old + [fresh]}))
            self.assertEqual(go("pass").split()[0], "1")
            spool = run / "feed" / "inbox-spool"
            blob = "".join(f.read_text() for f in spool.glob("*.jsonl"))
            self.assertIn(fresh["id"], blob)
            for n in range(2, 7):
                self.assertNotIn(f"{R}#{n}:open", blob)                       # none of the five old ids reach any seat
            self.assertEqual(go("pass"), "0 0")
