"""push_activity.sh + live-act-append.sh + POST /activity/ingest end to end against the real app/server.mjs:
lines written locally reach the board once (cursor), the source file is never rotated, dry-run sends nothing.
Local only, throwaway secrets."""
import json, os, threading, re, secrets, subprocess, tempfile, time, unittest, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUSH, APPEND = ROOT / "tools" / "push_activity.sh", ROOT / "tools" / "live-act-append.sh"


class PushActivityTest(unittest.TestCase):
    EXTRA = {}

    @classmethod
    def setUpClass(cls):
        cls.data = tempfile.mkdtemp(); cls.ingest = secrets.token_hex(16)
        env = {"PORT": "0", "MESH_PASSWORD": secrets.token_hex(8), "SESSION_SECRET": secrets.token_hex(16),
               "INGEST_SECRET": cls.ingest, "PATH": os.environ["PATH"], "MESH_DATA_DIR": cls.data, "COLLECTOR": "off", **cls.EXTRA}
        cls.srv = subprocess.Popen(["node", str(ROOT / "app" / "server.mjs")], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for _ in range(100):
            m = re.search(r"listening on :(\d+)", cls.srv.stdout.readline())
            if m: cls.base = f"http://127.0.0.1:{m.group(1)}"; break
        else: raise RuntimeError("server did not start")
        threading.Thread(target=lambda: [None for _ in cls.srv.stdout], daemon=True).start()   # keep the pipe drained

    @classmethod
    def tearDownClass(cls):
        cls.srv.terminate(); cls.srv.wait(5); cls.srv.stdout.close()

    def pulled(self):
        r = urllib.request.Request(self.base + "/activity/pull", headers={"Authorization": "Bearer " + self.ingest})
        return json.load(urllib.request.urlopen(r))["lines"]

    def setUp(self):
        self.d = Path(tempfile.mkdtemp()); self.f = self.d / "fleet" / "activity.jsonl"
        self.env = dict(os.environ, ACTIVITY_FILE=str(self.f), LIVE_URL=self.base, LIVE_INGEST_SECRET=self.ingest,
                        PUSH_LOG=str(self.d / "push.log"), ONCE="1")

    def append(self, *a):
        subprocess.run(["bash", str(APPEND), *a], env=self.env, check=True)

    def push(self, **e):
        return subprocess.run(["bash", str(PUSH)], env=dict(self.env, **e), capture_output=True, text=True, timeout=30)

    def test_end_to_end_once_and_append_only(self):
        tag = "t" + secrets.token_hex(3)
        self.append("Builder", "received", "prompt", "Human")   # a human's message reaching a seat
        self.append("Builder", "start", "turn", tag)
        before = len(self.pulled())
        self.assertEqual(self.push().returncode, 0)
        got = [l for l in self.pulled()[before:]]
        self.assertEqual([(l["kind"], l["action"]) for l in got], [("prompt", "received"), ("turn", "start")])
        self.assertEqual(got[0]["from"], "Human")
        size = self.f.stat().st_size
        self.assertEqual(self.push().returncode, 0)                    # cursor: nothing re-sent
        self.assertEqual(len(self.pulled()), before + 2)
        self.append("Builder", "end", "turn", tag)
        with self.f.open("a") as fh: fh.write('{"t_ct":"x","seat":"Builder","kind":"turn","action":"end"}\n')   # bad line: rejected, skipped
        self.assertEqual(self.push().returncode, 0)
        self.assertEqual(len(self.pulled()), before + 3)
        self.assertGreater(self.f.stat().st_size, size)                # never truncated or rotated
        self.assertNotIn(self.ingest, (self.d / "push.log").read_text())
        self.assertIn("rejected=1", (self.d / "push.log").read_text())

    def test_dry_run_and_bad_secret(self):
        self.append("Builder", "start", "watcher", "w1")
        before = len(self.pulled())
        r = self.push(DRY_RUN="1", LIVE_URL="", LIVE_INGEST_SECRET="")
        self.assertEqual(r.returncode, 0); self.assertIn('"watcher"', r.stdout)
        self.assertFalse(Path(str(self.f) + ".cursor").exists())
        self.assertEqual(self.push(LIVE_INGEST_SECRET="wrong").returncode, 1)
        self.assertEqual(len(self.pulled()), before)
        self.assertIn("401", (self.d / "push.log").read_text())

    def test_unknown_seat_rejected(self):
        t = time.strftime("%Y-%m-%dT%H:%M:%S") + "+00:00"
        req = urllib.request.Request(self.base + "/activity/ingest", method="POST", headers={"X-Live-Ingest": self.ingest},
                                     data=json.dumps({"t_ct": t, "seat": "nobody", "kind": "turn", "action": "start"}).encode())
        out = json.load(urllib.request.urlopen(req))
        self.assertEqual(out["added"], 0); self.assertEqual(out["rejected"][0]["error"], "unknown seat")

    def test_env_required(self):
        self.assertEqual(self.push(LIVE_URL="").returncode, 2)


class EnvConfigTest(PushActivityTest):
    """Seat ids, human aliases and the active window come from env (no house names in server.mjs)."""
    EXTRA = {"LIVE_SEAT_IDS": "alpha,beta", "HUMAN_ALIASES": "lead=Lead", "LIVE_WINDOW_MIN": "30"}

    def test_end_to_end_once_and_append_only(self): pass
    def test_dry_run_and_bad_secret(self): pass

    def test_seat_ids_from_env(self):
        self.env["ACTIVITY_FILE"] = str(self.f)
        self.append("alpha", "start", "turn", "a1"); self.append("forge", "start", "turn", "a2")
        before = len(self.pulled())
        self.assertEqual(self.push().returncode, 0)
        self.assertEqual([l["seat"] for l in self.pulled()[before:]], ["alpha"])

    def test_no_house_names_in_server(self):
        src = (ROOT / "app" / "server.mjs").read_text()
        self.assertIn("process.env.HUMAN_ALIASES", src)
        self.assertNotRegex(src, r"\]\.includes\(f\)\) return '")   # no hardcoded human alias list


if __name__ == "__main__":
    unittest.main()
