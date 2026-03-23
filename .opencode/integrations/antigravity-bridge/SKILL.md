# @antigravity-bridge Skill

## Purpose

Bridge skill that provides unified access to all Antigravity skills and integrated third-party skills with improved UX and discovery.

## Skills Available via Bridge

### Antigravity Skills (MIT License)

| Skill | Purpose | License |
|-------|---------|----------|
| `typescript-expert` | TypeScript patterns and best practices | MIT |
| `react-patterns` | React component patterns | MIT |
| `python-patterns` | Python coding patterns | MIT |
| `docker-expert` | Docker and containerization | MIT |
| `api-security-best-practices` | API security guidelines | MIT |
| `rag-engineer` | RAG architecture patterns | MIT |
| `seo-fundamentals` | SEO best practices | MIT |
| `prompt-engineering` | Prompt crafting techniques | MIT |
| `brainstorming` | Creative brainstorming | MIT |
| `copywriting` | Content writing guidelines | MIT |
| `pricing-strategy` | Pricing models and strategy | MIT |
| `vercel-deployment` | Vercel deployment guides | MIT |
| `aws-serverless` | AWS Lambda and serverless | MIT |

### Third-Party Skills (Apache 2.0 License)

| Skill | Source | Purpose |
|-------|--------|---------|
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | AI frontend design language |
| `openviking` | [volcengine/OpenViking](https://github.com/volcengine/OpenViking) | Context database for agents |

## Usage

```
@antigravity list          # List all available skills
@antigravity search <term> # Search skills by topic
@antigravity use <skill>  # Activate a specific skill
```

## License Information

All Antigravity skills are MIT licensed - see LICENSE.antigravity

Third-party skills:
- Impeccable: Apache 2.0 - see LICENSE.impeccable
- OpenViking: Apache 2.0 - see LICENSE.openviking

## Integration

This bridge is auto-installed by `npx strray-ai install` to provide unified access to all Antigravity skills and integrated third-party skills.

## Update

```bash
npx strray-ai update-skills
```
