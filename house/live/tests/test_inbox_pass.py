"""Seat inboxes (xray PR #5 port): first pass seeds silently; a real new event lands in the right seat file."""
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
