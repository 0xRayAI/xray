#!/usr/bin/env python3
"""Unit tests for the live-wire tripwire decision. No git, no network."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tripwire_push as tw


def _fp(events: list[dict], generated_at: str) -> str:
    body = {
        "generated_at": generated_at,
        "event_count": len(events),
        "events": events,
        "notes": ["ignored"],
    }
    return tw.fingerprint_bytes("live-events.json", json.dumps(body).encode())


class FingerprintTests(unittest.TestCase):
    def test_generated_at_does_not_trip(self) -> None:
        events = [{"id": "a", "kind": "comment"}]
        self.assertEqual(_fp(events, "t1"), _fp(events, "t2"))

    def test_event_change_trips(self) -> None:
        self.assertNotEqual(
            _fp([{"id": "a"}], "t"),
            _fp([{"id": "a"}, {"id": "b"}], "t"),
        )

    def test_mp4_is_byte_hash(self) -> None:
        self.assertNotEqual(
            tw.fingerprint_bytes("mesh-live.mp4", b"one"),
            tw.fingerprint_bytes("mesh-live.mp4", b"two"),
        )

    def test_missing_file(self) -> None:
        self.assertIsNone(tw.fingerprint_file(Path("/tmp/does-not-exist-live-wire.json")))


class DecisionTests(unittest.TestCase):
    def test_same_hash_does_not_push(self) -> None:
        local = {"feed": "events:abc", "mesh": "raw:def"}
        self.assertFalse(tw.should_push(local, dict(local)))

    def test_missing_local_does_not_delete(self) -> None:
        self.assertFalse(tw.should_push({"feed": None, "mesh": None}, {"feed": "events:abc", "mesh": "raw:def"}))

    def test_first_publish_when_main_differs(self) -> None:
        local = {"feed": "events:new", "mesh": None}
        main = {"feed": "events:old", "mesh": None}
        self.assertTrue(
            tw.needs_publish(local, main, main, branch_exists=False, main_incorporated=False)
        )

    def test_skip_when_replay_matches(self) -> None:
        local = {"feed": "events:same", "mesh": "raw:same"}
        self.assertFalse(
            tw.needs_publish(
                local,
                dict(local),
                {"feed": "events:old", "mesh": "raw:old"},
                branch_exists=True,
                main_incorporated=True,
            )
        )

    def test_republish_when_main_drops_overlay(self) -> None:
        local = {"feed": "events:live", "mesh": "raw:live"}
        self.assertTrue(
            tw.needs_publish(
                local,
                dict(local),
                {"feed": "events:stale", "mesh": "raw:stale"},
                branch_exists=True,
                main_incorporated=False,
            )
        )

    def test_skip_when_main_already_has_bytes(self) -> None:
        local = {"feed": "events:same", "mesh": "raw:same"}
        self.assertFalse(
            tw.needs_publish(
                local,
                dict(local),
                dict(local),
                branch_exists=True,
                main_incorporated=False,
            )
        )

    def test_branch_name_refuses_main(self) -> None:
        with self.assertRaises(SystemExit):
            tw.check_branch("main")



class NoLoopTests(unittest.TestCase):
    """A real push is a feed_push packet; folding it back into the feed never trips another push."""

    def test_feed_push_only_change_does_not_trip(self) -> None:
        base = [{"id": "a", "kind": "merged"}]
        fp = {"id": "live-wire:push:1", "kind": "feed_push"}
        self.assertEqual(_fp(base, "t1"), _fp(base + [fp], "t2"))
        self.assertNotEqual(_fp(base, "t1"), _fp(base + [{"id": "b", "kind": "push"}], "t1"), "a fleet push still trips")

    def test_push_then_fold_back_is_quiet(self) -> None:
        import tempfile
        from datetime import datetime
        import fetch_feed as ff
        local = json.dumps({"generated_at": "t1", "event_count": 1, "events": [{"id": "a", "kind": "merged"}]}).encode()
        ev = tw.push_event(datetime(2026, 10, 6, 6, 30, tzinfo=tw.CT), "mill", "live-wire", 1)
        self.assertEqual((ev["from"], ev["to"], ev["kind"]), ("mill", "GitHub", "feed_push"))
        published = tw.snapshot_bytes(local, ev)
        self.assertIn(ev["id"], [e["id"] for e in json.loads(published)["events"]], "the push carries its own packet")
        with tempfile.TemporaryDirectory() as d:
            led = Path(d) / "feed-pushes.jsonl"
            tw.record_push(led, ev)
            folded = ff.feed_push_events(led, datetime(2026, 10, 6, tzinfo=tw.CT))
        regenerated = json.loads(local)
        regenerated["generated_at"] = "t2"
        regenerated["events"] = regenerated["events"] + folded
        regenerated["event_count"] = len(regenerated["events"])
        local2 = tw.fingerprint_bytes("live-events.json", json.dumps(regenerated).encode())
        remote = tw.fingerprint_bytes("live-events.json", published)
        self.assertFalse(tw.needs_publish({"feed": local2, "mesh": None}, {"feed": remote, "mesh": None},
                                          {"feed": None, "mesh": None}, branch_exists=True, main_incorporated=True),
                         "fetcher folding the feed_push back in must not trigger another push")

    def test_unchanged_feed_stays_quiet(self) -> None:
        f = _fp([{"id": "a", "kind": "merged"}], "t")
        self.assertFalse(tw.needs_publish({"feed": f, "mesh": None}, {"feed": f, "mesh": None},
                                          {"feed": None, "mesh": None}, branch_exists=True, main_incorporated=True))


if __name__ == "__main__":
    unittest.main()
