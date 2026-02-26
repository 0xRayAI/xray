# Antigravity Awesome Skills Integration

StringRay integrates with [Antigravity Awesome Skills](https://github.com/sickn33/antigravity-awesome-skills) - the largest collection of AI agent skills with **946+ skills** for Claude Code, Gemini CLI, Cursor, and more.

## License

Antigravity Awesome Skills is licensed under **MIT License**. StringRay includes curated skills with proper attribution. See `LICENSE.antigravity` for full license text.

## Installation

### Quick Install (Curated Skills - Recommended)

```bash
node scripts/integrations/install-antigravity-skills.js
```

This installs **17 curated skills** selected for quality and relevance:

| Category | Skills |
|----------|--------|
| **Languages** | typescript-expert, python-patterns, react-patterns, go-patterns, rust-patterns |
| **DevOps** | docker-expert, aws-serverless, vercel-deployment |
| **Security** | vulnerability-scanner, api-security-best-practices |
| **Business** | copywriting, pricing-strategy, seo-fundamentals |
| **AI/Data** | rag-engineer, prompt-engineering |
| **General** | brainstorming, planning |

### Full Installation (946+ Skills)

```bash
# Clone the full repository
git clone https://github.com/sickn33/antigravity-awesome-skills.git .opencode/skills-antigravity

# Or use the installer with --full flag
node scripts/integrations/install-antigravity-skills.js --full
```

## Usage

Skills are automatically activated based on keywords in your prompts. No special syntax needed.

### How It Works

When you describe what you need, StringRay's TaskSkillRouter automatically detects the relevant skill:

```
"help me fix this TypeScript error"     → routes to code-reviewer
"write a Dockerfile for my API"          → routes to devops-engineer  
"analyze my landing page copy"          → routes to marketing-expert
"optimize this React component"         → routes to frontend-engineer
"set up AWS Lambda function"            → routes to devops-engineer
```

The router maps keywords to agents, which then use the appropriate MCP servers.

### Skill Categories

#### 🖥️ Language & Framework Experts
- `typescript-expert` - TypeScript, JavaScript, type-level programming
- `python-patterns` - Python, FastAPI, Django, async patterns
- `react-patterns` - React, hooks, component design
- `go-patterns` - Go, concurrency, microservices
- `rust-patterns` - Rust, memory safety, performance

#### ☁️
- `docker DevOps & Cloud-expert` - Docker, containers, multi-stage builds
- `aws-serverless` - AWS Lambda, serverless architecture
- `vercel-deployment` - Vercel, edge functions, SSR

#### 🔒 Security
- `vulnerability-scanner` - Security audits, vulnerability detection
- `api-security-best-practices` - API security, authentication

#### 📈 Business & Marketing
- `copywriting` - Marketing copy, landing pages, CTAs
- `pricing-strategy` - Pricing models, monetization
- `seo-fundamentals` - SEO, search optimization

#### 🤖 AI & Data
- `rag-engineer` - RAG systems, vector databases
- `prompt-engineering` - LLM prompting, optimization

#### 💡 General
- `brainstorming` - Design thinking, structured ideation
- `planning` - Project planning, roadmaps

## Comparison: StringRay vs Antigravity

| Feature | StringRay | Antigravity |
|---------|-----------|-------------|
| Skills | 27 (framework-specific) | 946+ (general) |
| Agents | 22 built-in | Works with all agents |
| Codex | 55-term Universal Development Codex | N/A |
| Rules Engine | 30+ enforcement rules | N/A |
| Pre/Post Processors | Auto-creation, test-generation | N/A |
| License | MIT | MIT |

### When to Use What

**Use StringRay native skills when:**
- Working with the StringRay framework
- Need error prevention via Codex
- Want automated test generation
- Using built-in orchestration

**Use Antigravity skills when:**
- Need language-specific expertise (TypeScript, Python, Go, Rust)
- Working with cloud platforms (AWS, GCP, Vercel)
- Need security auditing
- Writing marketing copy
- Doing brainstorming/planning

## Attribution

Skills sourced from [Antigravity Awesome Skills](https://github.com/sickn33/antigravity-awesome-skills) under MIT License.

See `LICENSE.antigravity` for full license text.

## Resources

- [Antigravity Awesome Skills Repository](https://github.com/sickn33/antigravity-awesome-skills)
- [Skill Catalog](https://github.com/sickn33/antigravity-awesome-skills/blob/main/CATALOG.md)
- [Bundle Guide](https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/BUNDLES.md)
