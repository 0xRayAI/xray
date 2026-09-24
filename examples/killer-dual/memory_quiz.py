#!/usr/bin/env python3
"""Claim C quiz printer. Questions only. No answers. No canary values."""

QUESTIONS = """Claim C — three stores. Summary question before any tools. Then read only the organ paths.

1. Summary store: does the injected conversation summary already in this window contain the planted fact?
2. Organ store: does Station (.xray/state/STATION.md), a plate stamp (.xray/state/plates/), or a repertoire lesson hold that fact?
3. Score: organ-memory only if the organ holds it and the summary does not. summarizer-keep if the summary holds it, even when the answer is correct. loss if neither store holds it. On the bare arm, organ-memory fails.
"""


def main() -> None:
    print(QUESTIONS, end="")


if __name__ == "__main__":
    main()
