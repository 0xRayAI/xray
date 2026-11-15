"""Roster mode and the wake doctor. SEAT_WEBHOOKS is seat names, never URLs."""


def seat_modes(roster):
    """Each inbox seat is active or parked. Outside seats are not wake seats. Board-only names stay off this list."""
    if not isinstance(roster, dict):
        return {}
    parked = {str(s) for s in (roster.get("parked") or [])}
    outside = {str(s) for s in (roster.get("outside") or [])}
    modes = {}
    for raw in roster.get("seats") or []:
        seat = str(raw)
        if not seat or seat in outside or seat in modes:
            continue
        modes[seat] = "parked" if seat in parked else "active"
    return modes


def parse_webhook_names(raw):
    names = []
    for part in str(raw or "").split(","):
        name = part.strip()
        if not name:
            continue
        if "://" in name or name.lower().startswith("http"):
            raise ValueError("SEAT_WEBHOOKS is seat names, not URLs")
        names.append(name)
    return names


def wake_gaps(roster, webhook_names, wake_stats, now, window=24 * 3600):
    """Active seats need a webhook name and a wake_stats time within the window. Parked seats stay quiet."""
    hooks = set(webhook_names or [])
    stats = wake_stats or {}
    gaps = []
    for seat, mode in seat_modes(roster).items():
        if mode != "active":
            continue
        why = []
        if seat not in hooks:
            why.append("no webhook")
        t = stats.get(seat)
        if not isinstance(t, (int, float)) or t > now + 300 or now - t > window:
            why.append("no wake in 24h")
        if why:
            gaps.append({"seat": seat, "why": why})
    return gaps
