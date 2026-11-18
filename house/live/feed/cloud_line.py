"""Cloud activity line posted beside a station turn end that names a bc- id."""
import re

BC_ID = re.compile(r"bc-[A-Za-z0-9][A-Za-z0-9_-]{1,80}")
WINDOW_S = 24 * 3600


def agent_id(tag):
    if tag is None:
        return None
    match = BC_ID.search(str(tag))
    return match.group(0) if match else None


def cloud_body(turn, tag, t_ct):
    """Turn end with a bc- id posts cloud_agent finished. Other turns post nothing."""
    if turn != "end":
        return None
    agent = agent_id(tag)
    if not agent:
        return None
    body = {"kind": "cloud_agent", "action": "finished", "agent": agent, "t_ct": t_ct}
    if tag:
        body["tag"] = str(tag)
    return body


def cloud_gaps(lines, now, window=WINDOW_S):
    """A seat whose latest turn in the window names bc- and has no cloud line for that agent."""
    latest = {}
    clouds = {}
    for line in lines or []:
        if not isinstance(line, dict):
            continue
        t = line.get("t")
        if not isinstance(t, (int, float)):
            continue
        seat = str(line.get("seat") or "")
        if not seat:
            continue
        kind = line.get("kind")
        if kind == "turn":
            prev = latest.get(seat)
            if prev is None or t >= prev[0]:
                latest[seat] = (t, line)
        elif kind == "cloud_agent" and line.get("agent"):
            key = (seat, str(line.get("agent")))
            if key not in clouds or t >= clouds[key]:
                clouds[key] = t
    gaps = []
    for seat, (t, line) in latest.items():
        if t > now + 300 or now - t > window:
            continue
        agent = agent_id(line.get("tag"))
        if not agent:
            continue
        cloud_t = clouds.get((seat, agent))
        if cloud_t is None or now - cloud_t > window or cloud_t > now + 300:
            gaps.append({"seat": seat, "agent": agent})
    gaps.sort(key=lambda item: (item["seat"], item["agent"]))
    return gaps
