"""Next open child on a parent issue after one of its pulls merges. The body is not stored."""
import re

REF_RE = re.compile(r"(?:refs|closes|fixes)\s+#(\d+)", re.I)
HASH_RE = re.compile(r"#(\d+)")
R_RE = re.compile(r"\bR=([A-Za-z][A-Za-z0-9_-]{0,40})")


def ref_numbers(body):
    return [int(n) for n in REF_RE.findall(body or "")]


def next_open_child(body, done):
    closed = {int(n) for n in done}
    for raw in HASH_RE.findall(body or ""):
        num = int(raw)
        if num not in closed:
            return num
    return None


def r_seat(body):
    match = R_RE.search(body or "")
    if not match:
        return None
    seat = re.sub(r"[^a-z0-9_-]", "", match.group(1).lower())
    return seat or None


def parent_door(bodies, done):
    """bodies maps an issue number to its body. The first parent with a later open child wins."""
    closed = {int(n) for n in done}
    for num, body in bodies.items():
        nxt = next_open_child(body, closed | {int(num)})
        seat = r_seat(body)
        if nxt and nxt != int(num) and seat:
            return {"parent": int(num), "next": nxt, "seat": seat}
    return None
