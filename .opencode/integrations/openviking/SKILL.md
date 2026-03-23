---
name: openviking
source: volcengine/OpenViking
attribution: |
  Originally from https://github.com/volcengine/OpenViking
  Created by ByteDance Volcengine Viking Team
  License: Apache 2.0 (see LICENSE.openviking)
converted: 2026-03-23
---

---
name: openviking
description: Context database for AI agents using filesystem paradigm for hierarchical memory, resources, and skills organization with tiered context loading (L0/L1/L2).
category: memory
risk: low
source: infrastructure
date_added: '2026-03-23'
---

# OpenViking Context Database Skill

## Overview

OpenViking is an open-source Context Database designed specifically for AI Agents. It abandons the fragmented vector storage model of traditional RAG and adopts a "filesystem paradigm" to unify the structured organization of memories, resources, and skills.

## Core Concepts

### Filesystem Paradigm

OpenViking treats everything as files in a virtual filesystem:
- Every piece of context is a file with a path
- Directories organize related context
- Navigation feels like Unix filesystem operations

### URI Scheme

Context is accessed via directory-aware URIs:
```
viking://user/project/memory/
viking://resources/docs/
viking://skills/auth/
```

### Tiered Context Loading

OpenViking loads context in layers to save tokens:
- **L0**: Core system context (always loaded)
- **L1**: Project-level context (session loaded)
- **L2**: Task-specific context (on-demand)

## Key Features

### Memory Management
- Persistent memory across sessions
- Hierarchical organization by project/task
- Versioned context evolution

### Resource Integration
- Unified access to documentation
- Codebase awareness
- External data sources

### Skills Organization
- Structured skill discovery
- Skill dependency management
- Versioned skill loading

### Retrieval System
- Directory-aware search
- Recursive traversal
- Semantic within structure

## CLI Commands

| Command | Purpose |
|---------|---------|
| `ov init` | Initialize workspace |
| `ov status` | Check OpenViking status |
| `ov add-memory` | Add new memory |
| `ov add-resource` | Add resource to context |
| `ov ls viking://` | List all context |
| `ov search <query>` | Search context |

## Installation

```bash
pip install openviking --upgrade
openviking-server  # Start server (default port: 1933)
```

## Configuration

Config file: `~/.openviking/ov.conf`

```yaml
workspace: ~/project
embedding:
  provider: openai  # or volcengine, jina
  model: text-embedding-3-small
vlm:
  provider: openai
  model: gpt-4o
```

## Credits

- **OpenViking**: Volcengine Viking Team, ByteDance (Apache 2.0)
- **Framework integration**: StringRay v1.14.0

## License

Apache License 2.0 - see LICENSE.openviking

## Resources

- GitHub: https://github.com/volcengine/OpenViking
- Documentation: https://openviking.readthedocs.io
- Website: https://openviking.ai
