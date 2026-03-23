---
name: impeccable
source: pbakaus/impeccable
attribution: |
  Originally from https://github.com/pbakaus/impeccable
  Created by Paul Bakaus (jQuery UI creator)
  License: Apache 2.0 (see LICENSE.impeccable)
  Builds on Anthropic's frontend-design skill (MIT)
converted: 2026-03-23
---

---
name: impeccable
description: A design language skill for AI coding assistants that teaches professional frontend design, typography, color systems, and explicit anti-patterns to avoid.
category: design
risk: low
source: community
date_added: '2026-03-23'
---

# Impeccable Design Language Skill

## Overview

Impeccable is a design language skill system for AI coding assistants that addresses one of the most common complaints about AI-generated frontend code: it all looks the same.

## Core Features

### Design Principles

Impeccable fights generic AI output with:
- **Expanded skill** with domain-specific reference files
- **20 steering commands** to audit, review, polish, distill, animate, and more
- **Explicit anti-patterns** telling the AI what NOT to do

### Included Commands

| Command | Purpose |
|---------|---------|
| `/teach-impeccable` | One-time setup: gather design context |
| `/audit` | Run technical quality checks (a11y, performance, responsive) |
| `/critique` | UX design review: hierarchy, clarity, emotional resonance |
| `/normalize` | Align with design system standards |
| `/polish` | Pre-ship refinement pass |
| `/typeset` | Fix typography and type scales |
| `/arrange` | Fix layout and spacing |
| `/palette` | Generate cohesive color systems |
| `/distill` | Simplify complex UI into cleaner designs |
| `/clarify` | Improve unclear UX copy |
| `/optimize` | Performance improvements |
| `/animate` | Motion design guidance |

### Anti-Patterns to Avoid

Explicit instructions for what NOT to do:
- Don't use overused fonts (Arial, Inter, system defaults)
- Don't use gray text on colored backgrounds
- Don't use pure black/gray (always add tinting)
- Don't put everything in cards or nest cards
- Don't use bounce/elastic easing (feels outdated)
- Don't use purple gradients
- Don't use cards on colored backgrounds

## Usage

When invoked, the AI will:
1. Analyze the current project context
2. Apply design principles from the skill
3. Use appropriate commands for the task
4. Avoid explicit anti-patterns

## Design System Foundation

Impeccable builds on Anthropic's original `frontend-design` skill as its foundation, extending it with:
- Deeper typography expertise
- Color system generation
- Spacing and layout patterns
- Animation guidance
- 20 actionable commands

## Credits

- **Impeccable**: Paul Bakaus (Apache 2.0)
- **Frontend-design skill**: Anthropic (MIT)
- **Framework integration**: StringRay v1.14.0

## License

Apache License 2.0 - see LICENSE.impeccable

Impeccable builds on Anthropic's frontend-design skill. See NOTICE.md for attribution.
