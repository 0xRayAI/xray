# StringRay MCP Skills Migration Analysis

**Date:** 2026-04-07  
**Author:** StringRay AI Team  
**Status:** Analysis Complete - Migration Path Defined

---

## Executive Summary

StringRay currently bundles 35,075 lines of MCP skill servers in `src/mcps/knowledge-skills/`. These should be extracted to standalone packages following the Ziggy pattern, distributed via the Zigzag marketplace, and installed as plugins in StringRay.

**Result:** Core drops from 166k → ~130k lines. Skills become independent, versionable, discoverable packages.

---

## Current State Analysis

### StringRay Core (`~/dev/stringray`)

| Metric | Value |
|--------|-------|
| Total Lines | 166,319 |
| Source Files | 511 |
| MCP Skills | 35,075 lines (21%) |
| Core Logic | ~130k lines (79%) |

#### By Directory

| Directory | Lines | % |
|-----------|-------|---|
| **mcps/** | 35,075 | 21% |
| **__tests__/** | 29,195 | 18% |
| **enforcement/** | 13,791 | 8% |
| **integrations/** | 12,052 | 7% |
| **core/** | 9,234 | 6% |
| **processors/** | 8,288 | 5% |
| **delegation/** | 7,881 | 5% |
| **postprocessor/** | 7,152 | 4% |
| **orchestrator/** | 4,997 | 3% |
| **performance/** | 4,634 | 3% |
| **analytics/** | 4,197 | 3% |
| **cli/** | 3,612 | 2% |
| **security/** | 3,407 | 2% |
| **monitoring/** | 3,111 | 2% |
| **utils/** | 2,933 | 2% |
| **validation/** | 2,819 | 2% |
| **agents/** | 2,638 | 2% |
| **reporting/** | 2,070 | 1% |
| **session/** | 2,011 | 1% |
| **infrastructure/** | 1,199 | 1% |
| **Total** | **166,319** | **100%** |

#### Top 5 Largest Files

| File | Lines |
|------|-------|
| `mcps/knowledge-skills/ui-ux-design.server.ts` | 1,982 |
| `processors/processor-manager.ts` | 1,826 |
| `mcps/knowledge-skills/tech-writer.server.ts` | 1,592 |
| `postprocessor/PostProcessor.ts` | 1,555 |
| `delegation/codebase-context-analyzer.ts` | 1,504 |

#### MCP Knowledge Skills Breakdown

| Skill | Lines |
|-------|-------|
| ui-ux-design | 1,982 |
| tech-writer | 1,592 |
| devops-deployment | 1,485 |
| database-design | 1,162 |
| security-audit | 1,093 |
| testing-best-practices | 1,084 |
| testing-strategy | 1,083 |
| code-review | 1,032 |
| refactoring-strategies | 992 |
| project-analysis | 955 |
| mobile-development | 638 |
| skill-invocation | 628 |
| bug-triage-specialist | 603 |
| log-monitor | 598 |
| session-management | 571 |
| multimodal-looker | 569 |
| code-analyzer | 554 |
| growth-strategist | 406 |
| content-creator | 293 |
| seo-consultant | 250 |
| strategist | 244 |
| api-design | 149 |
| architecture-patterns | 141 |
| git-workflow | 140 |
| performance-optimization | 135 |
| **Total** | **35,075** |

---

### Ziggy (`~/dev/ziggy`) - Clean MCP Server Pattern

| Metric | Value |
|--------|-------|
| Total Lines | 296 |
| Purpose | Tweet generator MCP server |
| Framework | Express + @modelcontextprotocol/sdk |
| Transport | Streamable HTTP |
| Deployment | Railway/Vercel |

**Key Characteristics:**
- Single purpose, focused functionality
- Clean separation of concerns
- Deployable as standalone service
- Configurable via environment variables
- Health check endpoint
- Web UI for documentation

**This is the pattern each StringRay skill should follow.**

---

### Zigzag (`~/dev/zigzag`) - Agent Marketplace Platform

| Metric | Value |
|--------|-------|
| Total Lines | 16,133 |
| Source Files | 113 |
| Framework | Next.js |
| Features | Marketplace, Wallet, Payments, Pods, Dashboard |

**Key Features:**
- Agent marketplace for discovery
- Agent registration and publishing
- Wallet and payment integration
- Pod management for agent deployment
- Transaction history
- SSO authentication

**This is where StringRay skills should be distributed from.**

---

## Architecture Comparison

### Current State (Bundled)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STRINGRAY CORE (166k lines)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    MCP SKILLS (35k lines)                        │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │     │
│  │  │ui-ux     │ │code-revw │ │devops    │ │database  │            │     │
│  │  │design    │ │          │ │deploy    │ │design    │            │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │     │
│  │  │security  │ │testing   │ │testing   │ │refactor  │            │     │
│  │  │audit     │ │best-pract│ │strategy  │ │strategies│            │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │     │
│  │  ... 22 more skills ...                                          │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    CORE SYSTEMS (130k lines)                     │     │
│  │  Boot, Delegation, Processors, Enforcement, CLI, etc.            │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  PROBLEM: Skills bundled even if not used. Hard to version. Large core.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Target State (Externalized)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STRINGRAY CORE (130k lines)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    CORE SYSTEMS                                  │     │
│  │  Boot, Delegation, Processors, Enforcement, CLI, Plugin System   │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  Plugin System:                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  • Auto-discovery                                                 │     │
│  │  • Hot-reload                                                     │     │
│  │  • npm install support                                            │     │
│  └───────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ install
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ZIGZAG MARKETPLACE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ @strray-ai/ │  │ @strray-ai/ │  │ @strray-ai/ │  │ @strray-ai/ │      │
│  │ skill-code  │  │ skill-ui-ux │  │ skill-devops│  │ skill-test  │      │
│  │ -review     │  │ -design     │  │ -deployment │  │ -strategy   │      │
│  │ (1,032 ln)  │  │ (1,982 ln)  │  │ (1,485 ln)  │  │ (1,083 ln)  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                                             │
│  Each skill is:                                                             │
│  • Independent npm package                                                  │
│  • Versioned separately                                                     │
│  • Deployable standalone (like Ziggy)                                       │
│  • Installable via plugin system                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Extract One Skill (Proof of Concept)
1. Choose `code-review` skill (1,032 lines)
2. Create standalone package following Ziggy pattern
3. Publish to npm as `@strray-ai/skill-code-review`
4. Update StringRay to load via plugin system
5. Document the process

### Phase 2: Extract Top 10 Skills
1. Extract skills with >500 lines each
2. Publish all as separate npm packages
3. Update Zigzag marketplace to list them
4. Update StringRay plugin system to support skill packages

### Phase 3: Extract Remaining Skills
1. Extract all remaining skills
2. Full marketplace integration
3. Deprecate bundled skills in StringRay core
4. Update documentation

### Phase 4: Cleanup
1. Remove bundled skills from StringRay core
2. Update boot orchestrator to not load bundled skills
3. Update tests to use plugin-installed skills
4. Final core size: ~130k lines

---

## Benefits

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Core Lines | 166,319 | ~130,000 | -22% |
| Core Files | 511 | ~480 | -6% |
| Skill Packages | 0 | 30+ | +30 |
| Discoverability | None | Zigzag Marketplace | +100% |
| Versioning | Tied to core | Independent | +100% |
| Install Size | 73.2 MB | ~50 MB | -32% |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during migration | High | Keep bundled skills until all extracted |
| Plugin system not ready | Medium | Phase 1 validates plugin loading |
| npm package maintenance overhead | Low | Automated publishing via CI/CD |
| User confusion about installation | Medium | Clear documentation, Zigzag marketplace |

---

## Timeline Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1: Proof of Concept | 1-2 days | Extract 1 skill, publish, test |
| Phase 2: Top 10 Skills | 3-5 days | Extract, publish, integrate |
| Phase 3: Remaining Skills | 5-7 days | Extract all, marketplace integration |
| Phase 4: Cleanup | 1-2 days | Remove bundled, update docs |
| **Total** | **10-16 days** | **Full migration** |

---

## Next Steps

1. [ ] Extract `code-review` skill as proof of concept
2. [ ] Create npm package structure for skills
3. [ ] Update plugin system to support skill packages
4. [ ] Publish first skill to npm
5. [ ] Test installation via `npx strray-ai plugin install @strray-ai/skill-code-review`
6. [ ] Document migration process
7. [ ] Begin Phase 2 extraction

---

## References

- StringRay: `~/dev/stringray`
- Ziggy: `~/dev/ziggy`
- Zigzag: `~/dev/zigzag`
- Plugin System: `src/integrations/plugins/`
- MCP Skills: `src/mcps/knowledge-skills/`
