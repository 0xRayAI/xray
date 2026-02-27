# AI Agent Reflection Template (v1.1)
## Mandatory Structure for All StringRay Reflections

**Location:** `./docs/reflections/[descriptive-name]-reflection.md`  
**Required:** After ANY session >30 minutes or involving significant debugging/deployment  
**Purpose:** Glean wisdom from experience - what was, what is, what should be

---

## When to Write Reflections (Triggered By)

Reflections should be automatically suggested by the post-commit hook when commits contain:
- Debugging sessions (any "fix", "bug", "debug" in commit message)
- Path-related changes (consumer vs dev paths)
- MCP/framework infrastructure changes
- Publishing to npm
- Any session longer than 30 minutes

The post-commit hook will display:
```
📝 Reflection Suggestion: This commit appears to involve debugging, fixes, or significant changes.
   Consider writing a reflection using the template at docs/reflections/TEMPLATE.md
```

---

## Template Sections (All Required)

### 1. EXECUTIVE SUMMARY (Required)
**Purpose:** One-paragraph overview for quick scanning

**Must Include:**
- What happened (incident/task summary)
- Outcome (success/failure/partial)
- Key lesson in one sentence

**Example:**
```markdown
This reflection documents the v1.2.x deployment crisis where 7 consecutive npm publishes failed due to path transformation bugs, missing files in package, and version mismatches. Through systematic debugging in isolated environments, we identified and fixed all issues, resulting in v1.2.7 which is now production-ready. The key lesson: never assume dev environment equals consumer environment.
```

---

### 2. THE DICHOTOMY - What Was vs What Is vs What Should Be (Required)
**Purpose:** Reveal the complexity hidden in "simple" tasks

#### 2.1 What Was (The Struggle)
**Describe:**
- What you initially thought the task was
- What made it harder than expected
- Your emotional state (frustration, confusion, confidence)
- Technical surprises that emerged

**Template:**
```markdown
**Initial Assumption:** [What you thought going in]

**The Reality:** [What you discovered]

**The Struggle:** [Emotional and technical challenges]

**Time/Resources:** [How long it actually took vs expected]
```

#### 2.2 What Is (Present Understanding)
**Describe:**
- Root causes you discovered
- Patterns you recognized
- Your current emotional state
- Technical comprehension gained

**Template:**
```markdown
**Root Causes Identified:**
1. [Cause 1]
2. [Cause 2]

**Patterns Recognized:** [What systematic approaches worked]

**Current State:** [How you feel now vs at the start]
```

#### 2.3 What Should Be (Future Vision)
**Describe:**
- How to prevent this in the future
- Process improvements needed
- Automation opportunities
- Your commitment to change

**Template:**
```markdown
**Prevention Measures:**
- [Specific process change]
- [Automation to implement]
- [Checklist to create]

**Process Evolution:** [How workflows should change]
```

---

### 3. CHRONOLOGICAL EVENT LOG (Required)
**Purpose:** Timeline of what actually happened

**Format:**
```markdown
## Timeline

### Phase 1: [Name] (Start time → End time)
**What I Did:** [Actions taken]
**What Happened:** [Results/observations]
**Emotional State:** [How you felt]

### Phase 2: [Name] (Start time → End time)
**What I Did:** [Actions taken]
**What Happened:** [Results/observations]
**Emotional State:** [How you felt]

[Continue for each phase...]
```

---

### 4. ROOT CAUSE ANALYSIS (Required)
**Purpose:** Technical deep dive into why things failed

**Must Include:**
- List each root cause
- Why it wasn't caught earlier
- The specific fix applied
- Code examples where relevant

**Format:**
```markdown
### Root Cause 1: [Name]
**Symptom:** [What failed/misbehaved]
**Root Cause:** [Technical explanation]
**Why Missed:** [Why we didn't catch this earlier]
**Fix Applied:**
```[code or process change]
```
```

---

### 5. THE FIX - Solutions Applied (Required)
**Purpose:** Document all changes made

**For Each Fix:**
```markdown
### Fix 1: [Name]
**Problem:** [What was broken]
**Solution:** [What you changed]
**Files Modified:** [List of files]
**Verification:** [How you confirmed it worked]
```

---

### 6. DEEP LESSONS - Pitfalls, Observations, Ah-Ha Moments (Required)
**Purpose:** Extract maximum learning value

**For Each Lesson:**
```markdown
### Lesson 1: [Title]
**Pitfall:** [What trap you fell into]
**Ah-Ha Moment:** [The breakthrough realization]
**Deep Learning:** [The principle/theory behind it]
**Observation:** [What you noticed about the system/yourself]
```

---

### 7. PERSONAL JOURNEY - Struggle & Triumph (Required)
**Purpose:** Humanize the technical narrative

**Must Include:**
- **My Struggle:** What was hard/frustrating
- **My Triumph:** What felt good/was successful
- **My Dichotomy:** Conflicting perspectives you held
- **My Growth:** How you changed
- **My Future Self:** What you'll do differently

**Template:**
```markdown
## Personal Journey

### My Struggle
[Describe the emotional and intellectual challenges]

### My Triumph
[Describe the victories, no matter how small]

### My Dichotomy
[Conflicting viewpoints you held simultaneously]
- I thought X but reality was Y
- I felt A but needed to do B

### My Growth
[How this experience changed you]

### My Commitments to Future Self
1. [Specific behavior change]
2. [Process change]
3. [Mindset shift]
```

---

### 8. ACTION ITEMS & CHECKLISTS (Required)
**Purpose:** Ensure insights translate to action

**Must Create:**
- Immediate action items (next 24 hours)
- Short-term improvements (next week)
- Long-term process changes (next month)
- Checklist for preventing recurrence

**Template:**
```markdown
## Action Items

### Immediate (Next 24 Hours)
- [ ] [Action 1]
- [ ] [Action 2]

### Short Term (This Week)
- [ ] [Action 1]
- [ ] [Action 2]

### Long Term (This Month)
- [ ] [Action 1]
- [ ] [Action 2]

### Prevention Checklist
Before [task type], I will now:
- [ ] [Verification step 1]
- [ ] [Verification step 2]
- [ ] [Verification step 3]
```

---

### 9. TECHNICAL ARTIFACTS (Required if applicable)
**Purpose:** Preserve useful commands, code, queries

**Include:**
- Useful bash commands
- Key code snippets
- Log queries
- Test commands

---

## Golden Rules for Writing Reflections

### 1. Be Honest About Struggles
Don't sanitize the difficulty. The struggle is where learning happens.

### 2. Show, Don't Just Tell
Include:
- Actual code snippets
- Real command outputs
- Exact error messages
- Specific file paths

### 3. Capture Emotion
Reflections without emotion are just logs. Include:
- Frustration moments
- Breakthrough excitement
- Confusion phases
- Satisfaction of resolution

### 4. Reveal the Dichotomy
What seemed simple but was complex? What appeared true but wasn't? These are the gold.

### 5. Make It Actionable
Every reflection must produce:
- Checklists
- Process changes
- Automation ideas
- Prevention measures

### 6. Write for Future You
Assume you'll face this again. Make the reflection detailed enough that future you can follow the recovery steps.

### 7. Verify Your Assumptions in Clean Environments
When debugging:
- Local dev ≠ Consumer installation (create fresh npm projects)
- Code that exists ≠ Code that executes (verify function calls)
- Working locally ≠ Working everywhere (test in isolation)

---

## Reflection Checklist (Before Marking Complete)

- [ ] Executive summary written?
- [ ] What Was / What Is / What Should Be documented?
- [ ] Chronological timeline included?
- [ ] Root causes analyzed with code examples?
- [ ] All fixes documented with verification steps?
- [ ] Deep lessons extracted (pitfalls/ah-ha moments)?
- [ ] Personal journey captured (struggle/triumph/growth)?
- [ ] Action items and checklists created?
- [ ] Technical artifacts preserved?
- [ ] Located in `./docs/reflections/`?
- [ ] Named descriptively (e.g., `deployment-crisis-v12x-reflection.md`)?

---

## Example Structure in Practice

```markdown
# Reflection: [Title]

## Executive Summary
[One paragraph overview]

## The Dichotomy

### What Was
[Initial assumptions and struggles]

### What Is
[Current understanding and root causes]

### What Should Be
[Future prevention and improvements]

## Timeline

### Phase 1: Discovery (2:00 PM - 2:30 PM)
[What happened]

### Phase 2: Debugging (2:30 PM - 4:00 PM)
[What happened]

## Root Cause Analysis

### Root Cause 1: [Name]
**Symptom:** ...
**Root Cause:** ...
**Fix:** ...

## Solutions Applied

### Fix 1: [Name]
**Problem:** ...
**Solution:** ...
**Verification:** ...

## Deep Lessons

### Lesson 1: [Title]
**Pitfall:** ...
**Ah-Ha:** ...

## Personal Journey

### My Struggle
[Emotional narrative]

### My Triumph
[Victory narrative]

## Action Items

### Immediate
- [ ] ...

### Prevention Checklist
- [ ] ...
```

---

**Version:** 1.1  
**Last Updated:** 2026-02-27  
**Enforced By:** enforcer agent - All reflections MUST follow this template  
**Location:** This template should be read by ALL agents before writing reflections

**v1.1 Changes:** Added reflection trigger guidance (post-commit hook), added Golden Rule #7 about testing in clean environments