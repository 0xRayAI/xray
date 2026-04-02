---
slug: "/docs//plan-storyteller-enforcement"
title: "PLAN Storyteller Enforcement"
sidebar_label: "PLAN Storyteller Enforcement"
sidebar_position: 3
---

# Plan: Enforce Storyteller Skill for Reflections, Sagas, and Journeys

## Status: PARTIALLY IMPLEMENTED (2026-04-01)

### Completed:
- [x] Phase 1: storyteller added to skill-invocation.enum
- [x] Phase 2: skill-storyteller tool with handler added
- [x] Phase 3: StorytellingTriggerProcessor created
- [x] Step 1: storyteller in skill-invocation enum
- [x] Step 3: storytelling config in features.json
- [x] Step 4: storytelling-trigger-processor.ts

### Remaining:
- [ ] Phase 4: Update AGENTS.md with storyteller usage
- [ ] Phase 5: Create story-type-router.ts
- [ ] Phase 6: CLI commands (npx strray-ai reflection)
- [ ] Step 2: AGENTS.md storyteller section
- [ ] Step 6: storyteller MCP server
- [ ] Step 7: CLI commands

---

## Problem Statement

When asked to "write a saga" or "document this journey," the system did NOT:
1. Invoke the storyteller skill
2. Use the storyteller agent configuration
3. Follow the templates and frameworks in `agents/storyteller.yml`
4. Apply the quality checklist from `src/skills/storyteller/SKILL.md`

Instead, documentation was written directly without thestorytelling framework.

**This is a primary feature failure** - users don't know:
- When to use which story type
- Which template applies
- How to invoke the storyteller skill
- That the storyteller agent even exists

## Current Architecture

### Storyteller Agent (`agents/storyteller.yml`)
- **1,141 lines** of comprehensive configuration
- **Story Types**: bug_fix, feature_development, architectural_decision, reflection, saga, journey, narrative
- **Frameworks**: three_act_structure, hero_journey, pixar_story_spine
- **Quality Metrics**: word count, paragraph structure, voice consistency
- **Anti-patterns**: AI-sound patterns, structural anti-patterns
- **Peer Review**: Must send to `@growth-strategist` before publishing
- **Integration**: Lists triggers like "Write a deep reflection", "Document a journey"

### Storyteller Skill (`src/skills/storyteller/SKILL.md`)
- **131 lines** of simpler documentation
- **Story Types Table** with save locations and word counts
- **Frontmatter requirements**: story_type, emotional_arc, codex_terms
- **Voice Guidelines**: Warmly candid, conversational
- **Quality Checklist**: 8 items to verify
- **Fact-checking requirements**

### Reflection Infrastructure
1. **Publish Preflight Processor** - Checks for recent reflections before publish
2. **Features Config** - `require_reflection` configuration
3. **Intelligent Commit Batcher** - Can block commits if reflection needed

### The Gap
- `skill-invocation.server.ts` does NOT include "storyteller" in invocable skills
- No processor detects "should write story" conditions
- No automatic triggering mechanism

---

## Solution Architecture

### Phase 1: Make Storyteller Invocable

**File**: `src/mcps/knowledge-skills/skill-invocation.server.ts`

Add `storyteller` to the skill enum:
```typescript
enum: [
  // Core skills
  "code-review",
  // ... existing skills ...
  
  // Storytelling skills (NEW)
  "storyteller",
  
  // Additional skills
  // ... rest
]
```

### Phase 2: Create Storyteller Skill Server

**New File**: `src/mcps/knowledge-skills/storyteller.server.ts`

```typescript
// MCP server for storyteller skill
// Tools:
// - write-reflection: Create a reflection document
// - write-saga: Create a saga document  
// - write-journey: Create a journey document
// - write-narrative: Create a narrative document
// - fact-check-story: Verify technical details in stories
```

### Phase 3: Create Reflection Trigger Processor

**New File**: `src/processors/implementations/reflection-trigger-processor.ts`

**Triggers**:
1. **Commit Count** - After N commits without reflection
2. **Session Duration** - After long coding sessions
3. **Complex Changes** - After modifying multiple files
4. **User Request** - When user asks for reflection/saga/journey
5. **Publish Preflight** - Before publishing, check for recent reflection

**Configuration** (`.strray/features.json`):
```json
{
  "reflection": {
    "enabled": true,
    "auto_generate": true,
    "triggers": {
      "commit_count": 10,
      "session_duration_minutes": 60,
      "file_changes_threshold": 15,
      "complex_files_threshold": 5
    },
    "story_types": {
      "commit_count": "reflection",
      "publish": "saga",
      "complex_change": "journey"
    },
    "remind_user": true
  }
}
```

### Phase 4: Update AGENTS.md with Storyteller Usage

Add to `AGENTS.md`:

```markdown
## When to Invoke @storyteller

### Automatic Triggers (System Enforced)
- **After 10+ commits** without reflection → Write reflection
- **Before publishing** → Write saga documenting the journey
- **After complex changes** (15+ files) → Write journey

### Manual Triggers (User Requests)
When user says:
- "Write a saga" → Invoke @storyteller with story_type: saga
- "Document this journey" → Invoke @storyteller with story_type: journey
- "Write a reflection" → Invoke @storyteller with story_type: reflection
- "Tell the story of X" → Invoke @storyteller with story_type: narrative

### Story Type Selection Guide

| Situation | Story Type | Location | Length |
|-----------|------------|----------|--------|
| Single fix/feature | `reflection` | docs/reflections/ | 2-5k words |
| Multi-day work | `saga` | docs/reflections/deep/ | 5-15k words |
| Investigation/learning | `journey` | docs/reflections/deep/ | 1.5-4k words |
| Technical story | `narrative` | docs/reflections/ | 1-3k words |

### Quality Requirements
1. **Read storyteller.yml** for template structure
2. **Apply correct story_type** from supported types
3. **Include frontmatter**: story_type, emotional_arc, codex_terms
4. **Minimum 2,000 words** for reflections
5. **Voice**: Warmly candid, conversational
6. **End sections**: Key Takeaways + What Next
7. **Fact-check**: Verify agent names, file paths, error messages
8. **Send to @growth-strategist** for peer review before publishing
```

### Phase 5: Create Story Type Router

**New File**: `src/processors/implementations/story-type-router.ts`

```typescript
/**
 * Determines appropriate story type based on context
 */
export function determineStoryType(context: {
  commitCount?: number;
  fileCount?: number;
  sessionDuration?: number;
  hasUserRequest?: boolean;
  requestedType?: string;
  isPublishing?: boolean;
}): {
  storyType: "reflection" | "saga" | "journey" | "narrative";
  location: string;
  requiredLength: { min: number; ideal: number };
  template: string;
}
```

### Phase 6: Integration Points

1. **Pre-commit Hook** - Check commit count, remind if reflection due
2. **Pre-push Hook** - Check for reflections, prompt if needed
3. **Pre-publish Hook** - Require saga documentation
4. **Agent Router** - When user mentions story/saga/journey, route to storyteller
5. **CLI Command** - `npx strray-ai reflection` or `npx strray-ai saga`

---

## Implementation Order

### Step 1: Add storyteller to skill-invocation enum
**File**: `src/mcps/knowledge-skills/skill-invocation.server.ts`
**Effort**: Small (add to enum list)

### Step 2: Update AGENTS.md with storyteller usage guide
**File**: `AGENTS.md`
**Effort**: Small (add section)

### Step 3: Add reflection config to features.json
**File**: `.strray/features.json`
**Effort**: Small (add config section)

### Step 4: Create reflection-trigger processor
**File**: `src/processors/implementations/reflection-trigger-processor.ts`
**Effort**: Medium (new processor, triggers, config)

### Step 5: Create story-type router
**File**: `src/processors/implementations/story-type-router.ts`
**Effort**: Medium (router logic, templates)

### Step 6: Create storyteller MCP server
**File**: `src/mcps/knowledge-skills/storyteller.server.ts`
**Effort**: Large (MCP server implementation)

### Step 7: Add CLI commands
**File**: `src/cli/commands/reflection.ts`
**Effort**: Medium (CLI integration)

---

## User Experience After Implementation

### Scenario 1: User asks "write a saga about this"
```
User: "write a saga about the journey from v1.15.40 to v1.18.2"

System:
1. Detects "saga" keyword
2. Routes to @storyteller
3. Loads storyteller.yml configuration
4. Reads all commits, PRs, changes
5. Applies hero_journey framework
6. Writes to docs/reflections/deep/SAGA-v1.15.40-to-v1.18.2.md
7. Sends to @growth-strategist for review
```

### Scenario 2: After 10 commits without reflection
```
System:
1. Pre-commit hook fires
2. Reflection-trigger-processor checks commit count
3. If threshold met, displays reminder:
   "You've made 10 commits without writing a reflection.
    Consider invoking @storyteller: reflection"
4. Offers: "Write reflection now? (y/n)"
```

### Scenario 3: Before publishing
```
User: npx strray-ai publish

System:
1. publish-preflight-processor runs
2. Checks for recent saga/journey
3. If none, prompts: "No recent saga documenting this release journey.
    Consider running: npx strray-ai saga create"
4. Optionally blocks publish until saga exists
```

---

## Metrics & Validation

### Success Criteria
1. **Storyteller in skill-invocation enum** - Verified by code inspection
2. **AGENTS.md has storyteller section** - Verified by file read
3. **Reflection config in features.json** - Verified by file read
4. **Reflection trigger processor exists** - Verified by file existence
5. **Story type router exists** - Verified by file existence
6. **CLI commands work** - Verified by `npx strray-ai reflection --help`

### Quality Metrics
1. All stories follow storyteller.yml template structure
2. All stories have correct frontmatter
3. All stories meet minimum word count
4. All stories pass fact-check
5. All stories sent to @growth-strategist for review

---

## Questions to Resolve

1. **Should we auto-generate stories?** Or just prompt users to invoke manually?
2. **Should we block publish without saga?** Or just warn?
3. **What's the minimum commit count for reflection reminder?**
4. **Should we integrate with inference-improvement?** To use reflections for learning?

---

## Next Steps

1. Review this plan
2. Decide on open questions
3. Implement steps in order
4. Test with the saga I just wrote (v1.15.40 to v1.18.2)
5. Verify storyteller.yml template is being used
