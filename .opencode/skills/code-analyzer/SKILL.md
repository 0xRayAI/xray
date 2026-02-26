---
name: code-analyzer
description: Deep code analysis, metrics extraction, and pattern detection
author: StrRay Framework
version: 1.0.0
tags: [analysis, metrics, code-quality, patterns]

mcp:
  analyzer:
    command: node
    args: [node_modules/strray-ai/dist/mcps/knowledge-skills/analyzer.server.js]
---

# Code Analyzer Skill

Deep code analysis, metrics extraction, and pattern detection.

## Tools Available

- **analyze_codebase**: Comprehensive codebase analysis
- **calculate_metrics**: Code metrics (complexity, maintainability)
- **detect_patterns**: Design pattern recognition
- **find_code_smells**: Technical debt identification
- **analyze_dependencies**: Dependency graph analysis
- **generate_insights**: Actionable recommendations

## Usage

This skill provides code analysis capabilities for:
- Complexity and maintainability metrics
- Design pattern detection
- Code smell identification
- Dependency analysis
- Architectural insights

## Integration

Activated when code analysis or quality assessment capabilities are requested.
