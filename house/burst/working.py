"""Working signals for a seat. One time per seat. Not an active count.

Lab runs: any file mtime under the seat's run folders in the last 150s
(skip directories named node_modules and .git), or a process whose cwd is
inside the seat's lab folders and that used at least 1s of CPU since the
previous pass (stay lit 120s). Reads mtimes, cwd, and utime+stime only.

GitHub checks: a running, queued, or failing check on a PR the seat
authored, newer than that PR's last merge, within 30 minutes.

Seat activity: fleet/activity.jsonl, one start or end. The seat stays lit
while a start has no later end for the same seat, kind, and tag, for at
most 60 minutes. The line's text is not kept.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path

RUN_MTIME_S = 150
CPU_HOLD_S = 120
CPU_MIN_S = 1.0
CHECK_WINDOW_S = 30 * 60
ACTIVITY_HOLD_S = 60 * 60
SKIP_DIRS = {"node_modules", ".git"}
ACTIVITY_KINDS = {"subagent", "turn", "watcher"}
_FREE_TEXT = re.compile(r"body|text|message", re.I)
CHECK_BUSY = {"queued", "in_progress", "pending", "waiting", "requested", "running"}
CHECK_FAIL = {"failure", "timed_out", "startup_failure", "action_required", "cancelled", "error", "fail"}


def _ts(iso):
    if not iso:
        return None
    try:
        return datetime.fromisoformat(str(iso).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


def max_file_mtime(root: Path):
    """Latest file mtime under root. Directory mtimes are ignored. Names are not kept."""
    if not root.is_dir():
        return None
    latest = None
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            try:
                mt = os.stat(os.path.join(dirpath, fn), follow_symlinks=False).st_mtime
            except OSError:
                continue
            if latest is None or mt > latest:
                latest = mt
    return latest


def stat_cpu_ticks(stat_path: Path) -> int:
    """utime + stime. The command field in parentheses is discarded."""
    rest = stat_path.read_text().rsplit(")", 1)[-1].split()
    return int(rest[11]) + int(rest[12])


def notes_from_host_ci(author, merged_at, workflow_runs, jobs, commit_status):
    """Busy or failing CI from Actions runs, their jobs, and commit statuses.

    A fine-grained host token has no Checks permission. Names are not stored.
    """
    notes = []
    for run in workflow_runs or []:
        noted = note_check(
            author, merged_at, run.get("status"), run.get("conclusion"),
            run.get("run_started_at") or run.get("created_at"), run.get("updated_at"))
        if noted:
            notes.append(noted)
    for job in jobs or []:
        noted = note_check(
            author, merged_at, job.get("status"), job.get("conclusion"),
            job.get("started_at") or job.get("created_at"), job.get("completed_at"))
        if noted:
            notes.append(noted)
    rollup = commit_status or {}
    state = (rollup.get("state") or "").lower()
    if state == "pending":
        status, conclusion = "pending", None
    elif state in ("failure", "error"):
        status, conclusion = "completed", state
    else:
        status, conclusion = None, None
    if status:
        when = None
        for item in rollup.get("statuses") or []:
            when = item.get("updated_at") or item.get("created_at") or when
        noted = note_check(author, merged_at, status, conclusion, when, when)
        if noted:
            notes.append(noted)
    return notes


def note_check(author, merged_at, status, conclusion, started_at, completed_at):
    """One note from a check run. The check's name is not accepted."""
    st = (status or "").lower()
    conc = (conclusion or "").lower()
    if st not in CHECK_BUSY and conc not in CHECK_FAIL:
        return None
    t = started_at or completed_at
    if not t or not author:
        return None
    return {"author": author, "merged_at": merged_at, "t": t}


def activity_working(lines, now, hold_s=ACTIVITY_HOLD_S):
    """Map seat -> until (unix). One number per seat.

    A start is open when no later end shares its seat, kind, and tag.
    The light ends at that start plus 60 minutes. Names and times only.
    """
    groups = {}
    for line in lines or []:
        if not isinstance(line, dict):
            continue
        if any(_FREE_TEXT.search(str(key)) for key in line):
            continue
        if any(isinstance(val, str) and _FREE_TEXT.search(val) for val in line.values()):
            continue
        kind = line.get("kind")
        action = line.get("action")
        seat = line.get("seat")
        tag = line.get("tag") if line.get("tag") is not None else ""
        if kind not in ACTIVITY_KINDS or action not in ("start", "end"):
            continue
        if not isinstance(seat, str) or not seat:
            continue
        if not isinstance(tag, str) or len(tag) > 80:
            continue
        t = _ts(line.get("t_ct"))
        if t is None or t > now + 120:
            continue
        groups.setdefault((seat, kind, tag), []).append((t, action))
    out = {}
    for (seat, _kind, _tag), events in groups.items():
        events.sort()
        open_start = None
        for t, action in events:
            if action == "start":
                open_start = t
            elif open_start is not None and t >= open_start:
                open_start = None
        if open_start is None:
            continue
        until = open_start + hold_s
        if until <= now:
            continue
        if seat not in out or until > out[seat]:
            out[seat] = until
    return out


def activity_working_file(path, now, hold_s=ACTIVITY_HOLD_S):
    """Read a JSONL file. A bad line is skipped. The text is not returned."""
    lines = []
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            lines.append(json.loads(raw))
        except ValueError:
            continue
    return activity_working(lines, now, hold_s)


def check_working(notes, now, window_s=CHECK_WINDOW_S):
    """Map seat -> until (unix). One number per seat. No PR titles."""
    out = {}
    for note in notes or []:
        author = note.get("author")
        if not author or author == "GitHub":
            continue
        t = _ts(note.get("t"))
        if t is None or t > now + 120 or now - t > window_s:
            continue
        merged = _ts(note.get("merged_at")) if note.get("merged_at") else None
        if merged is not None and t <= merged:
            continue
        until = t + window_s
        if author not in out or until > out[author]:
            out[author] = until
    return out


class RunWatch:
    """In-memory until-times and CPU baselines. Baselines are not written out."""

    def __init__(self):
        self.until = {}
        self.cpu_prev = {}

    def cpu_from_proc(self, labs, proc_root: Path, clk: int):
        folders = []
        for lab in labs or []:
            for rel in (lab.get("folders") or lab.get("runs") or []):
                try:
                    folders.append((lab["seat"], str(Path(rel).resolve())))
                except OSError:
                    continue
        if not folders or not proc_root.is_dir():
            return {}
        totals = {}
        seen = set()
        for entry in proc_root.iterdir():
            if not entry.name.isdigit():
                continue
            pid = entry.name
            try:
                cwd = os.readlink(entry / "cwd")
                ticks = stat_cpu_ticks(entry / "stat")
            except OSError:
                continue
            seat = None
            for name, folder in folders:
                base = folder.rstrip("/")
                if cwd == folder or cwd.startswith(base + "/"):
                    seat = name
                    break
            if not seat:
                continue
            seen.add(pid)
            prev = self.cpu_prev.get(pid)
            self.cpu_prev[pid] = ticks
            if prev is None:
                continue
            delta = (ticks - prev) / float(clk or 100)
            if delta > 0:
                totals[seat] = totals.get(seat, 0.0) + delta
        for pid in list(self.cpu_prev):
            if pid not in seen:
                self.cpu_prev.pop(pid, None)
        return totals

    def scan(self, labs, now, cpu_seconds=None, proc_root=None, clk=None):
        """Return {seat: until}. File names, cwd, and command lines are not in the result."""
        mtimes = {}
        seats = set()
        for lab in labs or []:
            seat = lab.get("seat")
            if not seat:
                continue
            seats.add(seat)
            latest = None
            for rel in lab.get("runs") or []:
                mt = max_file_mtime(Path(rel))
                if mt is not None and (latest is None or mt > latest):
                    latest = mt
            if latest is not None:
                mtimes[seat] = latest
        if cpu_seconds is None:
            root = Path(proc_root) if proc_root else Path("/proc")
            cpu_seconds = self.cpu_from_proc(labs, root, clk or os.sysconf("SC_CLK_TCK") or 100)
        until = {s: t for s, t in self.until.items() if s in seats}
        for seat in seats:
            evidence = 0.0
            mt = mtimes.get(seat)
            if mt is not None and now - mt <= RUN_MTIME_S:
                evidence = mt + RUN_MTIME_S
            if float(cpu_seconds.get(seat, 0) or 0) >= CPU_MIN_S:
                evidence = max(evidence, now + CPU_HOLD_S)
            if evidence:
                until[seat] = max(float(until.get(seat) or 0), evidence)
            elif float(until.get(seat) or 0) < now:
                until.pop(seat, None)
        self.until = until
        return dict(until)


WATCH = RunWatch()
