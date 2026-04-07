---
title: Plugin System
description: Industrial-grade plugin architecture for StringRay
---

# Plugin System

The plugin system enables extensibility through a production-ready, enterprise-grade architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BootOrchestrator                        │
├─────────────────────────────────────────────────────────────┤
│  Phase 4.5: Plugin System Initialization                    │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ PluginRegistry │───▶│ PluginServerConfigRegistry   │   │
│  │                │    │                              │   │
│  │ • discover()   │    │ • registerPluginServer()    │   │
│  │ • load()       │    │ • registerAllPluginServers()│   │
│  │ • enable()     │    │ • getServersByCapability() │   │
│  └─────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Plugin Types

| Type | Description |
|------|-------------|
| `mcp-server` | MCP server integration |
| `skill` | Skill/knowledge provider |
| `integration` | Framework integration |
| `agent` | Agent capability extension |

## Plugin Lifecycle

```
UNINSTALLED → INSTALLED → ENABLING → ENABLED → ACTIVE
                                        ↓
                                      ERROR
```

## Plugin Manifest

Create `.strray/plugins/<name>/plugin.yaml`:

```yaml
name: my-plugin
version: 1.0.0
type: mcp-server
description: My custom plugin

runtime:
  command: npx
  args:
    - "-y"
    - "@modelcontextprotocol/server-filesystem"
    - "/path/to/files"
  timeout: 30000

capabilities:
  - file-system
  - read-write

tools:
  - name: read-file
    description: Read a file from disk
  - name: write-file
    description: Write a file to disk

routing:
  - keywords: ["file", "disk", "storage"]
    skill: filesystem
    agent: enforcer
    confidence: 0.9
```

## CLI Commands

```bash
# List plugins
npx strray-ai plugin list

# Install plugin
npx strray-ai plugin install <name>

# Enable plugin
npx strray-ai plugin enable <name>

# Disable plugin
npx strray-ai plugin disable <name>

# Show plugin status
npx strray-ai plugin status <name>

# Uninstall plugin
npx strray-ai plugin uninstall <name>
```

## Security Features

- **Command Whitelisting**: Only approved commands can execute
- **Environment Filtering**: Sensitive env vars blocked
- **Filesystem Restrictions**: Path allow-listing
- **Resource Limits**: Memory, CPU, FD limits

## Resource Limits

```yaml
resourceLimits:
  maxMemoryMB: 512
  maxCpuPercent: 80
  maxProcessTime: 300000
  maxFileDescriptors: 100
```

## Auto-Discovery

Plugins are automatically discovered from `.strray/plugins/` on boot:

1. Scan directory for subdirectories
2. Check for `plugin.yaml` manifest
3. Validate manifest schema
4. Register MCP servers
5. Enable auto-start plugins
