"""Site config: our feed/site.json names Bifrost and burst-live; with no site.json the Example template stays."""
import json, os, subprocess, sys, unittest
from pathlib import Path

FEED = Path(__file__).resolve().parent.parent / "feed"


def probe(site_env):
    code = ("import sys, json; sys.path.insert(0, %r); import live_site, live_collect, live_flow, live_fleet; "
            "print(json.dumps([live_site.SITE['title'], live_collect.BRAND, live_flow.USM, live_flow.DEV, live_flow.APP, "
            "live_fleet.RW_ENV['production'], [s['health'] for s in live_site.SITE['services']]]))") % str(FEED)
    env = {k: v for k, v in os.environ.items() if k not in ("LIVE_BRAND", "LIVE_SITE_JSON")}
    if site_env is not None:
        env["LIVE_SITE_JSON"] = site_env
    return json.loads(subprocess.run([sys.executable, "-B", "-c", code], env=env, capture_output=True, text=True, check=True).stdout)


class Site(unittest.TestCase):
    def test_ours_is_bifrost_and_burst_live(self):
        title, brand, node, dev, app, prod, health = probe(None)
        self.assertEqual((title, brand, node), ("Bifrost live fleet", "Bifrost", "Bifrost"))
        self.assertEqual({dev, app, prod}, {"burst-live"})
        self.assertEqual(health, ["https://burst-live-production.up.railway.app/healthz"])
        raw = (FEED / "site.json").read_text()
        self.assertNotIn("example.com", raw); self.assertNotIn("Example", raw)

    def test_other_installs_keep_example_defaults(self):
        title, brand, node, dev, app, prod, health = probe("")
        self.assertEqual((title, brand, node, dev, app, prod), ("Example live mesh", "Example", "Example", "dev.example.com", "app.example.com", "app.example.com"))
        self.assertEqual(health, ["https://dev.example.com/health", "https://app.example.com/health"])


if __name__ == "__main__":
    unittest.main()
