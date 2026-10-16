"""One accent rule for every draw-stamped-card plate."""

DEFAULT_ACCENT = 'cyan'


def resolve_accent(title, requested=None):
    """Return 'rainbow' or the default accent.

    requested is --accent, or the accent field on steps.json / table.json.
    A title that contains BIFROST (any case) is always rainbow, so requested
    is ignored. Every other title uses DEFAULT_ACCENT. A rainbow request on
    that title falls back to the default.
    """
    if 'BIFROST' in str(title or '').upper():
        return 'rainbow'
    if requested == 'rainbow':
        return DEFAULT_ACCENT
    return DEFAULT_ACCENT
