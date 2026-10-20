"""#281 activity gaps: cloud-agent launcher attribution (one 20 min idle window, GitHub id signal), prompt sender kept."""
import json, os, sys, tempfile, time, unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(os.environ.get("MESH_FEED_DIR", HERE.parent / "feed"))))
import live_fleet  # noqa: E402
import push_payload  # noqa: E402
CT = ZoneInfo("America/Chicago")


def ct(ago_s):
    return datetime.fromtimestamp(time.time() - ago_s, CT).isoformat(timespec="seconds")


class Act281(unittest.TestCase):
    def fleet(self, cloud=(), remote=()):
        d = tempfile.TemporaryDirectory(); self.addCleanup(d.cleanup)
        root = Path(d.name); (root / "fleet").mkdir(); (root / "feed").mkdir()
        (root / "fleet" / "cloud-agents.jsonl").write_text("".join(json.dumps(x) + "\n" for x in cloud))
        (root / "fleet" / "remote-activity.jsonl").write_text("".join(json.dumps(x) + "\n" for x in remote))
        f = live_fleet.Fleet(root / "feed" / "fleet-state.json", CT)
        f.seeded.update({"cloud", "activity"})   # not a first read: emit
        f.scan_cloud(); f.scan_activity()
        return f

    def launch(self, ago, agent="bc-abc12345", action="launch"):
        return {"t_ct": ct(ago), "by": "Operator", "action": action, "agent": agent, "repo": "o/r", "tag": "t"}

    def test_launcher_working_within_idle_window(self):
        w = self.fleet([self.launch(10 * 60)]).working_state([])
        self.assertEqual(w.get("Operator", {}).get("agent"), "bc-abc12345")

    def test_launcher_stays_active_while_the_agent_runs(self):
        f = self.fleet([self.launch(25 * 60)])
        w = f.working_state([])
        self.assertEqual(w.get("Operator", {}).get("agent"), "bc-abc12345")
        self.assertIn("CloudAgents", w)
        st = f.fleet_state([], time.time())
        self.assertTrue(st["seats"]["Operator"]["active"])
        self.assertEqual(st["seats"]["Operator"]["working_via"], "cloud")

    def test_launcher_idle_after_six_hours(self):
        f = self.fleet([self.launch(7 * 3600)])
        w = f.working_state([])
        self.assertNotIn("Operator", w)
        self.assertNotIn("CloudAgents", w)
        st = f.fleet_state([], time.time())
        self.assertFalse(st["seats"]["Operator"]["active"])
        self.assertFalse(st["cloud"]["active"])
        self.assertEqual(st["cloud"]["open_agents"], [])

    def test_finished_ends_at_once(self):
        w = self.fleet([self.launch(5 * 60), self.launch(60, action="finished")]).working_state([])
        self.assertNotIn("Operator", w)

    def test_older_line_never_reopens(self):
        w = self.fleet([self.launch(60, action="finished"), self.launch(5 * 60)]).working_state([])
        self.assertNotIn("Operator", w)

    def test_github_event_naming_agent_extends_window(self):
        f = self.fleet([self.launch(25 * 60)])
        ev = {"id": "o/r#9:open", "t_ct": ct(120), "from": "GitHub", "kind": "pr_open", "label": "r #9 opened · cursor/bc-abc12345"}
        self.assertEqual(f.working_state([ev]).get("Operator", {}).get("agent"), "bc-abc12345")

    def test_cloud_pr_is_stripped_and_kept_only_on_a_full_match(self):
        good = "https://github.com/acme/app/pull/15"
        owner40 = "a" + ("-b" * 19) + "c"
        bad = "https://github.com/" + owner40 + "/app/pull/1"
        f = self.fleet(
            [
                {**self.launch(40), "pr": "  " + good + "  "},
                {**self.launch(30, agent="bc-bbb22222"), "pr": bad},
                {**self.launch(20, agent="bc-ccc33333"), "pr": "https://github.com/../../pull/1"},
                {**self.launch(10, agent="bc-ddd44444"), "pr": 15},
                self.launch(5, agent="bc-eee55555"),
            ],
            remote=[{
                "t_ct": ct(15), "seat": "Builder", "kind": "cloud_agent", "action": "launch",
                "agent": "bc-fff66666", "pr": good,
            }],
        )

        def pr_of(agent):
            for event in f.events.values():
                if event.get("agent") == agent:
                    return event.get("pr")
            self.fail("no event for " + agent)

        self.assertEqual(pr_of("bc-abc12345"), good)
        self.assertIsNone(pr_of("bc-bbb22222"))
        self.assertIsNone(pr_of("bc-ccc33333"))
        self.assertIsNone(pr_of("bc-ddd44444"))
        self.assertIsNone(pr_of("bc-eee55555"))
        self.assertEqual(pr_of("bc-fff66666"), good)

    def test_operator_cloud_line_is_not_dropped(self):
        f = self.fleet(remote=[{
            "t_ct": ct(30), "seat": "Operator", "kind": "cloud_agent", "action": "launch", "agent": "bc-forge0001",
        }])
        st = f.fleet_state([], time.time())
        self.assertIn("bc-forge0001", st["cloud"]["open_agents"])
        self.assertTrue(st["seats"]["Operator"]["active"])
        self.assertEqual(st["seats"]["Operator"]["working_via"], "cloud")
        self.assertEqual(st["cloud"]["active"], True)

    def test_prompt_keeps_sender(self):
        f = self.fleet(remote=[{"t_ct": ct(30), "seat": "Builder", "kind": "prompt", "action": "received", "from": "Coord"},
                               {"t_ct": ct(20), "seat": "Builder", "kind": "prompt", "action": "sent", "to": "Reviewer"}])
        got = sorted((e["from"], e["to"], e.get("actor")) for e in f.events.values() if e["kind"] == "prompt_message")
        self.assertEqual(got, [("Builder", "Reviewer", "Builder"), ("Coord", "Builder", "Coord")])

    def test_pull_keeps_from_on_prompt_only(self):
        ok = push_payload.act_line({"t_ct": ct(0), "seat": "Builder", "kind": "prompt", "action": "received", "from": "Coord"})
        self.assertEqual(ok["from"], "Coord")
        self.assertIsNone(push_payload.act_line({"t_ct": ct(0), "seat": "Builder", "kind": "turn", "action": "start", "from": "Coord"}))

    def test_act_line_keeps_prompt_id_and_note_for_a_separate_list(self):
        raw = {"t_ct": ct(0), "seat": "Builder", "kind": "prompt", "action": "received",
               "from": "Ada", "id": "ada.9", "note": "fixed summary", "seq": 4}
        ok = push_payload.act_line(raw)
        self.assertEqual(ok["id"], "ada.9")
        self.assertEqual(ok["note"], "fixed summary")
        self.assertNotIn("seq", ok)
        dropped = push_payload.act_line({**raw, "id": "has space", "note": "bad\nnote"})
        self.assertIsNotNone(dropped)
        self.assertNotIn("id", dropped)
        self.assertNotIn("note", dropped)
        turn = push_payload.act_line({"t_ct": ct(0), "seat": "Builder", "kind": "turn", "action": "start", "id": "ada.9", "note": "fixed summary"})
        self.assertIsNotNone(turn)
        self.assertNotIn("id", turn)
        self.assertNotIn("note", turn)
        f = self.fleet(remote=[ok])
        rows = live_fleet.activity_prompts(f.path)
        self.assertEqual(rows, [{"id": "ada.9", "t_ct": ok["t_ct"], "kind": "prompt", "from": "Ada", "note": "fixed summary"}])
        msgs = [e for e in f.events.values() if e["kind"] == "prompt_message"]
        self.assertEqual(len(msgs), 1)
        self.assertNotEqual(msgs[0]["id"], "ada.9")
        self.assertEqual(msgs[0].get("activity_id"), "ada.9")
        self.assertEqual(msgs[0].get("note"), "fixed summary")


if __name__ == "__main__":
    unittest.main()
