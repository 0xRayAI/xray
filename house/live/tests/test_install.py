"""deploy.sh overlay and seat_keys.sh seat list. No network."""
import json
import os
import sys
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
APP = ROOT / "app"
SEAT_KEYS = ROOT / "feed" / "seat_keys.sh"
DEPLOY = APP / "deploy.sh"


def _railway(log: Path) -> Path:
    bindir = log.parent / "bin"
    bindir.mkdir(exist_ok=True)
    exe = bindir / "railway"
    exe.write_text("#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$RAILWAY_LOG\"\n"
                   "if [ \"$1\" = status ]; then echo 'Project: live-board'; fi\nexit 0\n")
    exe.chmod(exe.stat().st_mode | stat.S_IEXEC)
    return bindir


class SeatKeys(unittest.TestCase):
    def test_mint_uses_env_and_json(self):
        with tempfile.TemporaryDirectory() as d:
            env = dict(os.environ, SEAT_KEYS_DIR=d, SEAT_KEYS_SEATS="alpha")
            subprocess.run(["bash", str(SEAT_KEYS), "mint"], env=env, check=True, capture_output=True, text=True)
            self.assertTrue((Path(d) / "alpha.key").is_file())
            self.assertFalse((Path(d) / "reviewer.key").exists())
            spec = Path(d) / "seats.json"
            spec.write_text('{"seats":[{"id":"beta"}]}')
            env2 = dict(os.environ, SEAT_KEYS_DIR=d, SEATS_JSON=str(spec))
            env2.pop("SEAT_KEYS_SEATS", None)
            subprocess.run(["bash", str(SEAT_KEYS), "mint"], env=env2, check=True, capture_output=True, text=True)
            self.assertTrue((Path(d) / "beta.key").is_file())

    def test_legacy_bare_builder_cloud_is_kept(self):
        with tempfile.TemporaryDirectory() as d:
            bare = Path(d) / "builder-cloud"
            bare.write_text("already")
            bare.chmod(0o600)
            env = dict(os.environ, SEAT_KEYS_DIR=d, SEAT_KEYS_SEATS="builder-cloud")
            subprocess.run(["bash", str(SEAT_KEYS), "mint"], env=env, check=True, capture_output=True, text=True)
            self.assertFalse((Path(d) / "builder-cloud.key").exists())
            self.assertEqual(bare.read_text(), "already")

    def test_publish_uses_service_override(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            keys = root / "keys"
            keys.mkdir()
            (keys / "alpha.key").write_text("k")
            deploy = root / "deploy"
            deploy.mkdir()
            log = root / "railway.log"
            bindir = _railway(log)
            env = dict(os.environ, PATH=str(bindir) + os.pathsep + os.environ.get("PATH", ""),
                       RAILWAY_LOG=str(log), SEAT_KEYS_DIR=str(keys), SEAT_KEYS_SEATS="alpha",
                       LIVE_RAILWAY_SERVICE="my-live", MESH_APP_DEPLOY_DIR=str(deploy))
            subprocess.run(["bash", str(SEAT_KEYS), "publish"], env=env, check=True, capture_output=True, text=True)
            text = log.read_text()
            self.assertIn("--service my-live", text)
            self.assertNotIn("live-mesh", text)


class DeployOverlay(unittest.TestCase):
    def test_overlay_and_railway_ts_land_in_the_deploy_dir(self):
        lock = APP / "package-lock.json"
        created = not lock.exists()
        if created:
            lock.write_text("{}\n")
        try:
            with tempfile.TemporaryDirectory() as d:
                root = Path(d)
                overlay = root / "overlay"
                (overlay / "avatars").mkdir(parents=True)
                (overlay / "live-config.js").write_text("FLEET-OVERLAY-MARK\n")
                (overlay / "avatars" / "mark.png").write_bytes(b"png")
                dst = root / "deploy"
                dst.mkdir()
                log = root / "railway.log"
                bindir = _railway(log)
                env = dict(os.environ, PATH=str(bindir) + os.pathsep + os.environ.get("PATH", ""),
                           RAILWAY_LOG=str(log), MESH_APP_DEPLOY_DIR=str(dst),
                           LIVE_PUBLIC_OVERLAY=str(overlay), LIVE_RAILWAY_PROJECT="live-board",
                           LIVE_RAILWAY_SERVICE="my-live")
                env.pop("MESH_SEED_STORE", None)
                proc = subprocess.run(["bash", str(DEPLOY)], env=env, capture_output=True, text=True)
                self.assertEqual(proc.returncode, 0, proc.stderr)
                self.assertEqual((dst / "public" / "live-config.js").read_text(), "FLEET-OVERLAY-MARK\n")
                self.assertTrue((dst / "public" / "index.html").is_file())
                self.assertEqual((dst / "public" / "avatars" / "mark.png").read_bytes(), b"png")
                ts = (dst / ".railway" / "railway.ts").read_text()
                self.assertIn('healthcheck: "/healthz"', ts)
                self.assertIn('start: "node server.mjs"', ts)
                self.assertIn("--service my-live", log.read_text())
        finally:
            if created:
                lock.unlink(missing_ok=True)


class DeployLayoutLoadsOurConfig(unittest.TestCase):
    """Live-like layout: deploy.sh into a temp deploy dir, then the shipped server code builds the collector env the
    way burst-live does (with a stale LIVE_NODE_MAP service var) and the shipped collector code reads it."""
    def test_node_map_site_and_credit_resolve_in_the_deploy_dir(self):
        lock = APP / "package-lock.json"
        created = not lock.exists()
        if created:
            lock.write_text("{}\n")
        try:
            with tempfile.TemporaryDirectory() as d:
                root = Path(d); dst = root / "deploy"; dst.mkdir(); log = root / "railway.log"
                env = dict(os.environ, PATH=str(_railway(log)) + os.pathsep + os.environ.get("PATH", ""), RAILWAY_LOG=str(log),
                           MESH_APP_DEPLOY_DIR=str(dst), LIVE_RAILWAY_PROJECT="live-board", LIVE_RAILWAY_SERVICE="burst-live")
                for k in ("MESH_SEED_STORE", "LIVE_PUBLIC_OVERLAY"):
                    env.pop(k, None)
                proc = subprocess.run(["bash", str(DEPLOY)], env=env, capture_output=True, text=True)
                self.assertEqual(proc.returncode, 0, proc.stderr)
                col = dst / "collector"
                for f in ("fleet-nodes.json", "fleet-roster.json", "site.json", "live_site.py", "live_collect.py"):
                    self.assertTrue((col / f).is_file(), f)
                for f in ("site-config.js", "avatars/arch1.png", "favicon.png"):
                    self.assertTrue((dst / "public" / f).is_file(), f)
                js = ("import(%r).then(m => console.log(JSON.stringify(m.fleetConfigOf({ LIVE_NODE_MAP: "
                      "'{\"htafolla\":\"Blaze0x1\",\"extra-bot[bot]\":\"mill\"}' }, %r))))") % (str(dst / "presence.mjs"), str(col))
                cfg = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
                nm = json.loads(cfg["LIVE_NODE_MAP"])
                self.assertEqual((nm["htafolla"], nm["extra-bot[bot]"]), ("Blaze", "mill"))   # committed map wins, var adds
                penv = {"PATH": os.environ.get("PATH", ""), "LIVE_NODE_MAP": cfg["LIVE_NODE_MAP"], "PYTHONDONTWRITEBYTECODE": "1"}
                code = ("import json, live_collect as c, live_site as s; print(json.dumps([c.credit('htafolla'), c.credit('Blaze0x1'), "
                        "c.credit('minime0x[bot]'), c.credit('forge0x1[bot]'), s.SITE['title'], c.BRAND]))")
                out = json.loads(subprocess.run([sys.executable, "-B", "-c", code], cwd=col, env=penv, capture_output=True, text=True, check=True).stdout)
                self.assertEqual(out, ["Blaze", "Blaze", "arch1", "forge", "Bifrost live fleet", "Bifrost"])
        finally:
            if created:
                lock.unlink(missing_ok=True)
