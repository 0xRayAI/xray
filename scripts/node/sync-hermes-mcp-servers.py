#!/usr/bin/env python3
"""Merge MCP server entries into ~/.hermes/config.yaml mcp_servers."""
import json
import sys
from pathlib import Path

import yaml


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: sync-hermes-mcp-servers.py <config.yaml> <servers.json>", file=sys.stderr)
        return 1

    config_path = Path(sys.argv[1])
    servers = json.loads(Path(sys.argv[2]).read_text())

    config = {}
    if config_path.exists():
        config = yaml.safe_load(config_path.read_text()) or {}

    existing = config.get("mcp_servers") or {}
    existing.update(servers)
    config["mcp_servers"] = existing
    config_path.write_text(yaml.safe_dump(config, default_flow_style=False, sort_keys=False))
    print(json.dumps({"count": len(existing)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())