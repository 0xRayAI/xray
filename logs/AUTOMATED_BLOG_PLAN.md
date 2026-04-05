# Automated Blog Post System Plan

**Generated:** 2026-02-27
**Status:** Proposed

---

## Overview
Generate blog posts from StringRay's internal data (reflections, activity logs) using agents, with human-quality review.

---

## Data Sources

| Source | Content | Best For |
|--------|---------|----------|
| `docs/reflections/*.md` | 50+ deep learnings | Philosophy, lessons learned, case studies |
| `test-activity-*.log` | Timestamps, agent activity | Real-time updates, metrics |
| `docs/INFERENCE_DIGEST.md` | Synthesized patterns | Core principles |
| `KERNEL_EXPERIENCE_LOG.md` | Framework evolution | Origin stories |

**Recommendation**: Start with **oldest reflections** (chronological journey) - shows evolution. Then activity logs for ongoing content.

---

## Agent Assignments (23 Agents → 23 Blog Series)

| Agent | Blog Topic | Frequency |
|-------|------------|-----------|
| @enforcer | "How We Achieved 99.6% Error Prevention" | Weekly |
| @orchestrator | "Complex Task Delegation in Practice" | Weekly |
| @architect | "System Design Decisions That Worked" | Bi-weekly |
| @security-auditor | "Vulnerabilities We Caught (So You Don't Have To)" | Monthly |
| @code-reviewer | "Code Quality Patterns That Scale" | Weekly |
| @refactorer | "Technical Debt We Eliminated" | Bi-weekly |
| @test-architect | "Testing Strategies That Actually Work" | Weekly |
| @bug-triage-specialist | "Debugging Tales: What Went Wrong" | Weekly |
| @librarian | "How We Explore 50+ Reflection Docs" | Monthly |
| @security-auditor | "Security Patterns for AI Frameworks" | Monthly |

---

## Workflow Pipeline

```
CRON → SELECT SOURCE → DRAFT (Agent) → REVIEW (Marketing + SEO) → APPROVE → PUBLISH
```

### 1. Cron Schedule
```bash
# Weekly on Monday 9am
0 9 * * 1 cd /Users/blaze/dev/stringray && npm run blog:generate

# Or via GitHub Actions (more reliable)
# .github/workflows/blog-automation.yml
```

### 2. Source Selection
```typescript
// scripts/blog/select-source.ts
const sources = [
  { type: 'reflection', path: 'docs/reflections/', sort: 'oldest' },
  { type: 'activity', path: 'test-activity-*.log', filter: 'ERROR' },
  { type: 'inference', path: 'docs/INFERENCE_DIGEST.md' }
];
```

### 3. Draft Generation (per agent)
```typescript
// scripts/blog/generate.ts
async function generatePost(agent: Agent, source: Source) {
  const content = await agent.analyze(source);
  const draft = await @marketing-expert.write({
    topic: content.theme,
    data: content.insights,
    agent: agent.name
  });
  return draft;
}
```

### 4. Review Pipeline
```typescript
// Always requires both:
const review = await Promise.all([
  @marketing-expert.review(draft, { tone: true, clarity: true }),
  @seo-copywriter.verify(draft, { keywords: true, meta: true })
]);

// If both pass → auto-publish
// If fails → flag for human review
```

---

## SEO Requirements for Each Post

Every post must have:
- [ ] Meta title (<60 chars)
- [ ] Meta description (<160 chars)
- [ ] Primary keyword
- [ ] 2-3 secondary keywords
- [ ] H1 + H2 hierarchy
- [ ] Internal links (to other posts)
- [ ] External links (to StringRay docs)
- [ ] JSON-LD schema (Article or SoftwareApplication)
- [ ] E-E-A-T agent signature
- [ ] Cache buster on all links

---

## Publishing

```bash
# Auto-commit to landing repo
git add articles/
git commit -m "blog: $(date) - new article"
git push origin gh-pages
```

---

## Starting Point

**Begin with oldest reflections** (shows framework evolution):
1. `stringray-deployment-reflection.md` (early struggles)
2. `framework-migration.md` (becoming enterprise)
3. `kimi-deployment-crisis-reflection.md` (hard lessons)
4. ...progress chronologically...

**Then fill with activity logs** for ongoing real-time content.

---

## Human Oversight

| Review Level | When Required |
|--------------|----------------|
| Auto-publish | Both marketing + SEO approve |
| Human review | Either rejects, or post mentions "production" / "security" |
| Manual only | Crisis posts, controversial topics |

---

## Implementation TODO

- [ ] Create `scripts/blog/` directory
- [ ] Build source selector
- [ ] Create agent draft generator
- [ ] Set up review pipeline
- [ ] Configure GitHub Actions workflow
- [ ] Draft first automated post
