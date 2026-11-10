"""Two wakes of one seat: the second read is empty and its turn start does not post."""
import json, os, subprocess, tempfile, threading, time, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent / "tools" / "live-inbox"
LINE = {
    "id": "crit-1", "repo": "0xRayAI/xray", "number": 399, "sha": "abc1234dead",
    "kind": "critic_fail", "type": "packet", "title": "critic comment",
}
HANDOFF = {
    "id": "hand-1", "repo": "0xRayAI/xray", "number": 399, "sha": "abc1234dead",
    "kind": "ready", "type": "packet", "title": "blinky handoff",
}


class Inbox(BaseHTTPRequestHandler):
    lines = []
    posts = []

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        body = json.dumps({"lines": type(self).lines}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        type(self).posts.append({"path": self.path, "body": json.loads(self.rfile.read(n) or b"{}")})
        out = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


NUDGE = {
    "id": "nudge:line:forge:crit-1:L1", "repo": "0xRayAI/xray", "number": 951, "type": "nudge",
    "title": "quiet card", "reason": "nudge L1: next owner",
}
SEAT_COMMENT = {
    "id": "gh-comment-1", "repo": "0xRayAI/xray", "number": 951, "type": "issue_comment", "from": "critic",
    "title": "Seen", "reason": "comment on your issue",
}
HUMAN_COMMENT = {
    "id": "gh-comment-h1", "repo": "0xRayAI/xray", "number": 951, "type": "issue_comment",
    "title": "please look", "reason": "comment on your issue",
}


class ConcurrentClaim(unittest.TestCase):
    def setUp(self):
        Inbox.lines = [LINE, HANDOFF]
        Inbox.posts = []
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Inbox)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.tmp = tempfile.TemporaryDirectory()
        self.keys = Path(self.tmp.name)
        self.cur = self.keys / "cursors" / "forge"
        (self.keys / "forge.key").write_text("seat-key-forge\n")
        self.sleeper = subprocess.Popen(["sleep", "30"])
        self.env_base = {
            **os.environ,
            "LIVE_URL": f"http://127.0.0.1:{self.httpd.server_address[1]}",
            "SEAT_KEYS_DIR": str(self.keys),
            "LIVE_CURSORS": str(self.cur),
        }
        # A cloud agent session sets these. Turn start would also post a cloud_agent launch.
        self.env_base.pop("CURSOR_AGENT", None)
        self.env_base.pop("CURSOR_CONVERSATION_ID", None)

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.sleeper.kill()
        self.sleeper.wait(timeout=5)
        self.tmp.cleanup()

    def inbox(self, *args, owner):
        env = {**self.env_base, "WAKE_RUN": str(owner)}
        return subprocess.run([str(TOOL), "forge", *args], env=env, capture_output=True, text=True, timeout=20)

    def test_second_run_exits_before_turn_start(self):
        out = {}

        def go(name, owner):
            out[name] = self.inbox(owner=owner)

        threads = [
            threading.Thread(target=go, args=("first", os.getpid())),
            threading.Thread(target=go, args=("second", self.sleeper.pid)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        reads = [out["first"], out["second"]]
        self.assertTrue(all(proc.returncode == 0 for proc in reads), [proc.stderr for proc in reads])
        filled = [proc for proc in reads if proc.stdout.strip()]
        empty = [proc for proc in reads if not proc.stdout.strip()]
        self.assertEqual(len(filled), 1)
        self.assertEqual(len(empty), 1)
        self.assertEqual([json.loads(line)["id"] for line in filled[0].stdout.splitlines()], ["crit-1", "hand-1"])
        winner = os.getpid() if out["first"].stdout.strip() else self.sleeper.pid
        loser = self.sleeper.pid if winner == os.getpid() else os.getpid()
        quiet = self.inbox("--turn", "start", "--tag", "wake", owner=loser)
        self.assertEqual(quiet.returncode, 0, quiet.stderr)
        self.assertEqual(quiet.stdout, "")
        self.assertEqual(Inbox.posts, [])
        started = self.inbox("--turn", "start", "--tag", "wake", owner=winner)
        self.assertEqual(started.returncode, 0, started.stderr)
        self.assertEqual(len(Inbox.posts), 1)
        self.assertEqual(Inbox.posts[0]["body"]["action"], "start")
        held = json.loads((self.cur / "forge.claims.json").read_text())
        self.assertTrue(held)
        self.assertTrue(all(rec.get("token") == str(winner) for rec in held.values()))
        quiet_end = self.inbox("--turn", "end", "--tag", "wake", owner=loser)
        self.assertEqual(quiet_end.returncode, 0, quiet_end.stderr)
        self.assertEqual(quiet_end.stdout, "")
        self.assertEqual(len(Inbox.posts), 1)
        self.assertEqual(json.loads((self.cur / "forge.claims.json").read_text()), held)
        ended = self.inbox("--turn", "end", "--tag", "wake", owner=winner)
        self.assertEqual(ended.returncode, 0, ended.stderr)
        self.assertEqual(Inbox.posts[-1]["body"]["action"], "end")

    def test_same_wake_rereads_its_lines(self):
        owner = os.getpid()
        first = self.inbox(owner=owner)
        again = self.inbox(owner=owner)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn("crit-1", again.stdout)
        self.assertIn("hand-1", again.stdout)

    def test_same_packet_key_is_one_claim(self):
        Inbox.lines = [LINE, {**LINE, "id": "crit-2", "title": "same packet"}]
        first = self.inbox(owner=os.getpid())
        second = self.inbox(owner=self.sleeper.pid)
        self.assertEqual([json.loads(line)["id"] for line in first.stdout.splitlines()], ["crit-1", "crit-2"])
        self.assertEqual(second.stdout, "")

    def test_dead_claim_can_be_taken(self):
        self.cur.mkdir(parents=True, exist_ok=True)
        (self.cur / "forge.claims.json").write_text(json.dumps({
            "0xrayai/xray#399|abc1234dead|critic_fail": {"pid": 2_000_000_001, "at": time.time()},
            "0xrayai/xray#399|abc1234dead|ready": {"pid": 2_000_000_001, "at": time.time()},
        }))
        taken = self.inbox(owner=os.getpid())
        self.assertEqual(taken.returncode, 0, taken.stderr)
        self.assertIn("crit-1", taken.stdout)
        self.assertIn("hand-1", taken.stdout)

    def test_new_head_is_not_the_claimed_line(self):
        self.inbox(owner=os.getpid())
        Inbox.lines = [LINE, {**LINE, "id": "crit-new", "sha": "fff9999dead", "title": "new head"}]
        second = self.inbox(owner=self.sleeper.pid)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("crit-new", second.stdout)
        self.assertNotIn("crit-1", second.stdout)

    def test_loser_turn_end_does_not_release_the_owner_token(self):
        winner = os.getpid()
        loser = self.sleeper.pid
        claimed = self.inbox(owner=winner)
        self.assertEqual(claimed.returncode, 0, claimed.stderr)
        self.assertIn("crit-1", claimed.stdout)
        before = json.loads((self.cur / "forge.claims.json").read_text())
        self.assertEqual({rec.get("token") for rec in before.values()}, {str(winner)})
        quiet = self.inbox("--turn", "end", "--tag", "wake", owner=loser)
        self.assertEqual(quiet.returncode, 0, quiet.stderr)
        self.assertEqual(quiet.stdout, "")
        self.assertEqual(Inbox.posts, [])
        self.assertEqual(json.loads((self.cur / "forge.claims.json").read_text()), before)
        blocked = self.inbox(owner=loser)
        self.assertEqual(blocked.stdout, "")
        ended = self.inbox("--turn", "end", "--tag", "wake", owner=winner)
        self.assertEqual(ended.returncode, 0, ended.stderr)
        self.assertEqual(Inbox.posts[-1]["body"]["action"], "end")
        freed = self.inbox(owner=loser)
        self.assertIn("crit-1", freed.stdout)
        self.assertIn("hand-1", freed.stdout)

    def test_shell_exit_releases_the_claim_without_turn_end(self):
        owner = self.sleeper.pid
        script = (
            "set -eu\n"
            f"export WAKE_RUN={owner}\n"
            f"trap '\"{TOOL}\" forge --release' EXIT\n"
            f"\"{TOOL}\" forge >/dev/null\n"
        )
        ran = subprocess.run(["bash", "-c", script], env=self.env_base, capture_output=True, text=True, timeout=20)
        self.assertEqual(ran.returncode, 0, ran.stderr)
        self.assertEqual(Inbox.posts, [])
        nxt = self.inbox(owner=os.getpid())
        self.assertEqual(nxt.returncode, 0, nxt.stderr)
        self.assertIn("crit-1", nxt.stdout)
        self.assertIn("hand-1", nxt.stdout)

    def test_other_token_release_leaves_the_claim(self):
        self.inbox(owner=os.getpid())
        quiet = self.inbox("--release", owner=self.sleeper.pid)
        self.assertEqual(quiet.returncode, 0, quiet.stderr)
        self.assertEqual(quiet.stdout, "")
        self.assertEqual(Inbox.posts, [])
        blocked = self.inbox(owner=self.sleeper.pid)
        self.assertEqual(blocked.stdout, "")

    def test_empty_inbox_still_posts_the_owner_prompt(self):
        Inbox.lines = []
        script = (
            "set -eu\n"
            f"read_out=$(\"{TOOL}\" forge)\n"
            f"\"{TOOL}\" forge --prompt --from blaze\n"
            "test -z \"$read_out\"\n"
        )
        ran = subprocess.run(
            ["bash", "-c", script],
            env={**self.env_base, "WAKE_RUN": str(os.getpid())},
            capture_output=True, text=True, timeout=20,
        )
        self.assertEqual(ran.returncode, 0, ran.stderr)
        self.assertEqual(len(Inbox.posts), 1)
        self.assertEqual(Inbox.posts[0]["body"]["kind"], "prompt")
        self.assertEqual(Inbox.posts[0]["body"]["action"], "sent")
        self.assertEqual(Inbox.posts[0]["body"]["from"], "blaze")

    def test_cursor_key_keeps_a_new_head_unhandled(self):
        owner = os.getpid()
        read = self.inbox(owner=owner)
        self.assertIn("crit-1", read.stdout)
        fresh = self.inbox("--repeat", "--pr", "0xRayAI/xray#399", "--sha", "abc1234dead", "--kind", "critic_fail", owner=owner)
        self.assertEqual(fresh.returncode, 1, fresh.stdout + fresh.stderr)
        self.assertIn("new", fresh.stdout)
        remembered = self.inbox("--remember", "--pr", "0xRayAI/xray#399", "--sha", "abc1234dead", "--kind", "critic_fail", owner=owner)
        self.assertEqual(remembered.returncode, 0, remembered.stderr)
        again = self.inbox("--repeat", "--pr", "0xRayAI/xray#399", "--sha", "abc1234dead", "--kind", "critic_fail", owner=owner)
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn("repeat", again.stdout)
        new_head = self.inbox("--repeat", "--pr", "0xRayAI/xray#399", "--sha", "fff9999dead", "--kind", "critic_fail", owner=owner)
        self.assertEqual(new_head.returncode, 1, new_head.stderr)
        self.assertIn("new", new_head.stdout)
        self.assertEqual(Inbox.posts, [])

    def test_turn_end_releases_the_claim(self):
        self.inbox(owner=os.getpid())
        ended = self.inbox("--turn", "end", "--tag", "wake", owner=os.getpid())
        self.assertEqual(ended.returncode, 0, ended.stderr)
        nxt = self.inbox(owner=self.sleeper.pid)
        self.assertIn("crit-1", nxt.stdout)


    def ids(self, proc):
        return [json.loads(line)["id"] for line in proc.stdout.splitlines()]

    def test_two_close_wakes_answer_one_nudge_once(self):
        """xray#976: 'Received L1 nudge' was posted twice, 20s apart, by two wakes of one seat."""
        Inbox.lines = [NUDGE]
        first = self.inbox(owner=os.getpid())
        self.assertEqual(self.ids(first), [NUDGE["id"]])
        # The first wake ends its turn and releases. The second wake starts a moment later.
        ended = self.inbox("--turn", "end", "--tag", "wake", owner=os.getpid())
        self.assertEqual(ended.returncode, 0, ended.stderr)
        second = self.inbox(owner=self.sleeper.pid)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(second.stdout, "")
        # A later level of the same ladder is a new line and is read.
        Inbox.lines = [NUDGE, {**NUDGE, "id": "nudge:line:forge:crit-1:L2", "reason": "nudge L2: next owner"}]
        third = self.inbox(owner=self.sleeper.pid)
        self.assertEqual(self.ids(third), ["nudge:line:forge:crit-1:L2"])

    def test_two_concurrent_wakes_read_a_seat_comment_once(self):
        Inbox.lines = [SEAT_COMMENT, {**SEAT_COMMENT, "id": "gh-comment-2", "title": "Received"}]
        out = {}

        def go(name, owner):
            out[name] = self.inbox(owner=owner)

        threads = [
            threading.Thread(target=go, args=("a", os.getpid())),
            threading.Thread(target=go, args=("b", self.sleeper.pid)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        filled = [proc for proc in out.values() if proc.stdout.strip()]
        self.assertEqual(len(filled), 1)
        self.assertEqual(self.ids(filled[0]), ["gh-comment-1", "gh-comment-2"])

    def test_handled_seat_comment_stays_claimed_but_a_second_comment_on_the_issue_still_reads(self):
        Inbox.lines = [SEAT_COMMENT]
        self.assertEqual(self.ids(self.inbox(owner=os.getpid())), ["gh-comment-1"])
        self.inbox("--release", owner=os.getpid())
        # The exact comment already handled does not come back to another wake.
        self.assertEqual(self.inbox(owner=self.sleeper.pid).stdout, "")
        # A second seat comment on the same issue, same head, still shows up in the read.
        Inbox.lines = [SEAT_COMMENT, {**SEAT_COMMENT, "id": "gh-comment-2", "title": "Received"}]
        self.assertEqual(self.ids(self.inbox(owner=self.sleeper.pid)), ["gh-comment-2"])
        # A chat read by the same seat under a new token sees the new comment too, with or without a sha.
        Inbox.lines = [{**SEAT_COMMENT, "id": "gh-comment-3", "sha": "abc1234dead"}, {**SEAT_COMMENT, "id": "gh-comment-4"}]
        self.assertEqual(self.ids(self.inbox(owner=os.getpid())), ["gh-comment-3", "gh-comment-4"])

    def test_human_comment_is_a_plain_claim_and_is_read_again_after_release(self):
        Inbox.lines = [HUMAN_COMMENT]
        self.assertEqual(self.ids(self.inbox(owner=os.getpid())), ["gh-comment-h1"])
        self.inbox("--release", owner=os.getpid())
        Inbox.lines = [HUMAN_COMMENT, {**HUMAN_COMMENT, "id": "gh-comment-h2"}]
        again = self.inbox(owner=self.sleeper.pid)
        self.assertEqual(self.ids(again), ["gh-comment-h1", "gh-comment-h2"])

    def test_tombstone_expires(self):
        Inbox.lines = [NUDGE]
        self.inbox(owner=os.getpid())
        self.inbox("--release", owner=os.getpid())
        claims = json.loads((self.cur / "forge.claims.json").read_text())
        self.assertTrue(all(rec.get("tomb") for rec in claims.values()))
        for rec in claims.values():
            rec["until"] = time.time() - 1
        (self.cur / "forge.claims.json").write_text(json.dumps(claims))
        self.assertEqual(self.ids(self.inbox(owner=self.sleeper.pid)), [NUDGE["id"]])


if __name__ == "__main__":
    unittest.main()
