# Deep Reflection Template (v1.0)
## Multi-Session Journey Documentation

**Location:** `./docs/deep-reflections/[descriptive-name]-journey-YYYY-MM-DD.md`  
**Purpose:** Document complex multi-session journeys, architectural transformations, and system-wide investigations  
**When to Use:** Sessions spanning multiple days, major architectural changes, or system-wide investigations

---

## When to Write Deep Reflections

Use this template when:
- Session spans multiple days
- Investigating root causes across multiple components
- Major architectural changes or system transformations
- Complex debugging requiring iterative discovery
- System-wide pattern recognition

**Not for:** Single-bug fixes, quick patches, or simple implementations (use `docs/reflections/TEMPLATE.md` instead)

---

## Template Structure

### 1. HEADER (Required)

```markdown
# Deep Reflection: [Topic Name]
## [Subtitle - Brief Description]

**Date**: YYYY-MM-DD
**Session Focus**: [What this session covered]
**Reflection Type**: [System Architecture | Multi-Component Investigation | Architectural Transformation | Complex Debugging]
**Prior Sessions**: [Links to prior sessions if multi-part journey]
**Expected Next Steps**: [What comes next]
```

### 2. EXECUTIVE JOURNEY SUMMARY (Required)

**Purpose:** One-paragraph overview of the entire journey

```markdown
## Executive Journey Summary

This deep reflection documents [brief description of what was investigated/built/fixed] across [number] sessions. The journey involved [key components/systems] and resulted in [outcome]. Key insights include: [1-3 sentence key learnings].
```

### 3. SESSION CHRONOLOGY (Required)

For each session, document:

```markdown
### Session N: [Session Title] - [Date]

**Duration:** [Start time] → [End time]
**Focus:** [What this session aimed to accomplish]

**What I Discovered:**
- [Discovery 1]
- [Discovery 2]

**What I Tried:**
- [Approach 1] → [Result]
- [Approach 2] → [Result]

**Blockers Encountered:**
- [Blocker 1] - How I resolved it
- [Blocker 2] - How I resolved it

**Key Insight This Session:**
[One sentence capturing the main learning]
```

### 4. INVESTIGATION NARRATIVE (Required)

**Purpose:** Tell the story of the investigation/journey

```markdown
## Investigation Narrative

### The Starting Point

[Describe the initial problem/question that started this journey]
[What was the symptom vs what we discovered was the root cause]

### The Path Taken

#### Phase 1: [Name]
[What happened in this phase]
[What I thought would happen vs what actually happened]

#### Phase 2: [Name]
[What triggered moving to this phase]
[Key discoveries made]

[Continue for each phase...]

### The Revelation

[What was the final key insight?]
[How did all the pieces connect?]
```

### 5. TECHNICAL DEEP DIVE (Required)

For each technical area investigated:

```markdown
## Technical Deep Dive: [Component/System Name]

### Architecture Before
[Diagram or description of how it worked before]

### Investigation Process
1. [Step 1 of investigation]
2. [Step 2 of investigation]
3. [Step 3 of investigation]

### Findings
- [Finding 1]: [Explanation]
- [Finding 2]: [Explanation]

### Changes Made
[What was modified and why]

### Architecture After
[Diagram or description of how it works now]
```

### 6. COUNTERFACTUAL ANALYSIS (Required)

```markdown
## What Would Have Happened If...

### If We Hadn't Discovered [Key Insight]
[Describe the cascade of problems that would have occurred]

### If We Continued Down [Wrong Path]
[What would have been broken]
[What would have been lost]

### If We Had Started With [Alternative Approach]
[How things would have been different]
```

### 7. SYSTEM-WIDE IMPACT (Required)

```markdown
## System-Wide Impact

### Components Affected
| Component | Before | After | Impact Level |
|-----------|--------|-------|--------------|
| [Name] | [State] | [State] | High/Medium/Low |

### Pattern Implications
[What patterns does this reveal about the system?]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
```

### 8. PERSONAL JOURNEY (Required)

```markdown
## Personal Journey

### My Evolution This Journey
[How my understanding changed from start to end]

### Moments of Frustration
[What was most frustrating and why]

### Moments of Clarity
[When did things click and what triggered it]

### What I Would Do Different
[Hindsight insights]

### Commitments to Future Self
1. [Commitment 1]
2. [Commitment 2]
```

### 9. LESSONS EXTRACTED (Required)

```markdown
## Key Lessons

### For This System
1. **[Lesson 1]**: [Explanation] - [How it applies]
2. **[Lesson 2]**: [Explanation] - [How it applies]

### For Future Investigations
1. **[Methodology Lesson 1]**: [What to do differently next time]
2. **[Methodology Lesson 2]**: [What to do differently next time]

### For AI Collaboration
[Lessons about working with AI on complex investigations]
```

### 10. ACTION ITEMS (Required)

```markdown
## Action Items

### Immediate (Next 24 Hours)
- [ ] [Action]

### Short Term (This Week)
- [ ] [Action]

### Long Term (This Month)
- [ ] [Action]

### Monitoring/Verification
- [ ] [What to watch for]
```

### 11. APPENDIX (Optional)

```markdown
## Appendix

### Files Modified
- [File 1]: [Change]
- [File 2]: [Change]

### Commands Run
```bash
[Command 1]
[Command 2]
```

### References
- [Link to related docs]
- [Link to code]
```

---

## Naming Convention

**Format:** `{topic}-journey-YYYY-MM-DD.md` or `DEEP_REFLECTION_{topic}.md`

**Examples:**
- `kernel-journey-2026-03-09.md`
- `AGENTS-consumer-documentation-strategy-journey-2026-03-09.md`
- `DEEP_REFLECTION_KERNEL_JOURNEY.md`

---

## Deep vs Standard Reflection Comparison

| Aspect | Standard Reflection | Deep Reflection |
|--------|--------------------|--------------------|
| **Duration** | Single session | Multiple sessions |
| **Length** | 1,000-5,000 lines | 10,000+ lines |
| **Template** | `docs/reflections/TEMPLATE.md` | This template |
| **Focus** | Specific fix/implementation | System-wide investigation |
| **Format** | Structured sections | Narrative journey |
| **Naming** | `{topic}-reflection.md` | `{topic}-journey-YYYY-MM-DD.md` |

---

## Version History

**v1.0 - 2026-03-10**
- Initial template creation
- Based on analysis of existing deep reflections in `docs/deep-reflections/`

---

**Location:** This template should be read before writing deep reflections  
**Enforced By:** Framework documentation standards
