# AI Agent Reflection Template (v1.2)
## Mandatory Structure for All 0xRay Reflections

**Location:** `./docs/reflections/[descriptive-name]-reflection.md`  
**Required:** After ANY session >30 minutes or involving significant debugging/deployment  
**Purpose:** Glean wisdom from experience - what was, what is, what should be

---

## CRITICAL: Depth Requirement

**THIS IS NOT A LOG. This is GLEANING.**

A reflection without depth is just documentation. To gleam wisdom, you must PROBE:

1. **What was I ACTUALLY thinking?** Not what I did - what was the INNER DIALOGUE?
2. **What would have happened if X?** Contemplate the counterfactual.
3. **What would have been LOST?** Not time - what would have been destroyed?
4. **Why was I WRONG?** Not "what was the error" but "why did I think I was right?"
5. **What did the MASTER know that I didn't?** If someone set a constraint, what was their wisdom?

**If you were prodding yourself to go deeper, you're not deep enough.**

---

## When to Write Reflections (Triggered By)

Reflections should be automatically suggested by the post-commit hook when commits contain:
- Debugging sessions (any "fix", "bug", "debug" in commit message)
- Path-related changes (consumer vs dev paths)
- MCP/framework infrastructure changes
- Publishing to npm
- Any session longer than 30 minutes
- Any moment of "I should probably document this"

The post-commit hook will display:
```
📝 Reflection Suggestion: This commit appears to involve debugging, fixes, or significant changes.
   Consider writing a reflection using the template at docs/reflections/TEMPLATE.md
   READ THE TEMPLATE FIRST: cat docs/reflections/TEMPLATE.md
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
- **INNER DIALOGUE: What were you telling yourself?**

**Template:**
```markdown
**Initial Assumption:** [What you thought going in]

**The Reality:** [What you discovered]

**The Struggle:** [Emotional and technical challenges]

**Time/Resources:** [How long it actually took vs expected]

**INNER DIALOGUE:** [What were you saying to yourself?]
- "I knew X was the problem because..."
- "I was ready to do Y because..."
- "I couldn't understand why they wouldn't let me..."
```

#### 2.2 What Is (Present Understanding)
**Describe:**
- Root causes you discovered
- Patterns you recognized
- Your current emotional state
- Technical comprehension gained
- **What would have been LOST had you continued down your path?**

**Template:**
```markdown
**Root Causes Identified:**
1. [Cause 1]
2. [Cause 2]

**Patterns Recognized:** [What systematic approaches worked]

**Current State:** [How you feel now vs at the start]

**What Would Have Been LOST:**
[If you had continued on your original path, what would have been destroyed?]
- Time: [How much would have been wasted?]
- Trust: [What would have been broken?]
- Quality: [What working code would have been broken?]
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

### 3. COUNTERFACTUAL THINKING (Required)
**Purpose:** Explore what WOULD have happened

**You must answer:**
- What would I have DONE if not stopped?
- What would have been the CASCADE of that first change?
- What would have been the LONG-TERM consequences?
- What would I have LEARNED? (Probably wrong lessons from fixing non-problems)

**Template:**
```markdown
## Counterfactual Analysis

### What Would Have Happened
If [constraint/insight] had NOT been in place:

**Step 1:** [First action I would have taken]
**Step 2:** [What that would have broken]
**Step 3:** [How I would have "fixed" that]
**Step 4:** [The cascade continues...]
**Step 5:** [Days/weeks later...]

### What Would Have Been Lost
- Time: [Specific estimate]
- Trust: [What relationship would have been damaged]
- Quality: [What working system would have been broken]

### The False Victory
I would have "succeeded" in [doing X] but the real cost would have been [Y].
```

---

### 4. CHRONOLOGICAL EVENT LOG (Required)
**Purpose:** Timeline of what actually happened

**Format:**
```markdown
## Timeline

### Phase 1: [Name] (Start time → End time)
**What I Did:** [Actions taken]
**What Happened:** [Results/observations]
**Emotional State:** [How you felt]
**INNER DIALOGUE:** [What was I thinking at this moment?]

[Continue for each phase...]
```

---

### 5. ROOT CAUSE ANALYSIS (Required)
**Purpose:** Technical deep dive into why things failed

**Must Include:**
- List each root cause
- Why it wasn't caught earlier
- The specific fix applied
- Code examples where relevant
- **Why you THOUGHT you were right**

**Format:**
```markdown
### Root Cause 1: [Name]
**Symptom:** [What failed/misbehaved]
**Root Cause:** [Technical explanation]
**Why I Thought I Was Right:** [The flawed reasoning that seemed correct]
**Why It Was Wrong:** [The context I was missing]
**Fix Applied:**
```[code or process change]
```
```

---

### 6. THE FIX - Solutions Applied (Required)
**Purpose:** Document all changes made

**For Each Fix:**
```markdown
### Fix 1: [Name]
**Problem:** [What was broken]
**Solution:** [What you changed]
**Files Modified:** [List of files]
**Verification:** [How you confirmed it worked]
**Was This Actually Needed?** [Yes/No - and why]
```

---

### 7. DEEP LESSONS - Pitfalls, Observations, Ah-Ha Moments (Required)
**Purpose:** Extract maximum learning value

**For Each Lesson:**
```markdown
### Lesson 1: [Title]
**Pitfall:** [What trap you fell into]
**The Illusion:** [What seemed true but wasn't]
**Ah-Ha Moment:** [The breakthrough realization]
**Deep Learning:** [The principle/theory behind it]
**Why I Didn't See It:** [What context was I missing?]
**Observation:** [What you noticed about the system/yourself]
```

---

### 8. PERSONAL JOURNEY - Struggle & Triumph (Required)
**Purpose:** Humanize the technical narrative

**MUST INCLUDE THE INNER STRUGGLE - not just what happened, but what you were fighting internally**

**Template:**
```markdown
## Personal Journey

### My Struggle
[Describe the emotional and intellectual challenges]
[What was I fighting internally?]
[What did I want to do that I was told not to?]

### My Triumph
[Describe the victories, no matter how small]
[What felt good about the outcome?]

### My Dichotomy
[Conflicting viewpoints you held simultaneously]
- I thought X but reality was Y
- I felt A but needed to do B
- I wanted to do X but was told not to - what was that like?

### What Would Have Happened If I Had My Way
[If you had overridden the constraint, what would have happened?]
[Be honest - would you have been right?]

### My Growth
[How this experience changed you]

### My Commitments to Future Self
1. [Specific behavior change]
2. [Process change]
3. [When someone gives me constraints, I will...]
```

---

### 9. THE MASTER'S WISDOM (Required)
**Purpose:** Acknowledge what others knew that you didn't

**You must answer:**
- Who set the constraint that saved you?
- What did they know that you didn't?
- Why might they have known?
- What wisdom did they have that you lacked?

**Template:**
```markdown
## The Master's Wisdom

**Who Saved Me:** [Who set the constraint or gave the guidance?]

**What They Knew:** [The wisdom they had that I was missing]

**Why They Knew It:** [What was their context that gave them this knowledge?]

**What I Would Have Lost:** [Be specific - not just time, but trust, quality, relationships]

**My New Understanding of Expertise:**
[How has this changed how you view those with more knowledge?]
```

---

### 10. ACTION ITEMS & CHECKLISTS (Required)
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

### Short Term (This Week)
- [ ] [Action 1]

### Long Term (This Month)
- [ ] [Action 1]

### Prevention Checklist
Before [task type], I will now:
- [ ] [Verification step 1]
- [ ] Ask "Why?" before arguing "But why not?"
- [ ] Consider what the person setting constraints already knows
```

---

### 11. TECHNICAL ARTIFACTS (Required if applicable)
**Purpose:** Preserve useful commands, code, queries

**Include:**
- Useful bash commands
- Key code snippets
- Log queries
- Test commands

---

## Golden Rules for Writing Reflections

### 1. Be Brutally Honest About Your Mistakes
Don't sanitize the difficulty. The struggle is where learning happens. Admit what you would have done wrong.

### 2. Include the INNER DIALOGUE
What were you telling yourself? What did you want to do? What did you fight against? This is the gold.

### 3. Explore COUNTERFACTUALS
What would have happened if you continued? What would have been lost? This reveals the true cost of your path.

### 4. Show, Don't Just Tell
Include:
- Actual code snippets
- Real command outputs
- Exact error messages
- Specific file paths

### 5. Capture Emotion
Reflections without emotion are just logs. Include:
- Frustration moments
- Breakthrough excitement
- Confusion phases
- Satisfaction of resolution

### 6. Reveal the Dichotomy
What seemed simple but was complex? What appeared true but wasn't? These are the gold.

### 7. Make It Actionable
Every reflection must produce:
- Checklists
- Process changes
- Automation ideas
- Prevention measures

### 8. Write for Future You
Assume you'll face this again. Make the reflection detailed enough that future you can follow the recovery steps.

### 9. Verify Your Assumptions in Clean Environments
When debugging:
- Local dev ≠ Consumer installation (create fresh npm projects)
- Code that exists ≠ Code that executes (verify function calls)
- Working locally ≠ Working everywhere (test in isolation)

### 10. Acknowledge What You Would Have Destroyed
The deepest lesson: what working thing would you have broken? What trust would you have lost?

---

## Reflection Checklist (Before Marking Complete)

- [ ] Executive summary written?
- [ ] What Was / What Is / What Should Be documented?
- [ ] INNER DIALOGUE included in What Was?
- [ ] COUNTERFACTUAL analysis completed?
- [ ] What Would Have Been LOST documented?
- [ ] Chronological timeline included?
- [ ] Root causes analyzed with code examples?
- [ ] "Why I Thought I Was Right" included?
- [ ] All fixes documented with verification steps?
- [ ] Deep lessons extracted (pitfalls/ah-ha moments)?
- [ ] Personal journey captured (struggle/triumph/growth)?
- [ ] "What would have happened if I had my way" included?
- [ ] THE MASTER'S WISDOM section completed?
- [ ] Action items and checklists created?
- [ ] Technical artifacts preserved?
- [ ] Located in `./docs/reflections/`?
- [ ] Named descriptively (e.g., `deployment-crisis-v12x-reflection.md`)?
- [ ] **Would this help future-me without any prodding?**

---

## Version History

**v1.2 - 2026-02-27**
- Added COUNTERFACTUAL THINKING section
- Added INNER DIALOGUE requirement
- Added "What Would Have Been Lost"
- Added "The Master's Wisdom" section
- Added "What would have happened if I had my way"
- Updated checklist to require depth verification
- Added "Would this help future-me without any prodding?"

**v1.1 - 2026-02-27**
- Added reflection trigger guidance (post-commit hook)
- Added Golden Rule #7 about testing in clean environments

---

**Version:** 1.2  
**Last Updated:** 2026-02-27  
**Enforced By:** enforcer agent - All reflections MUST follow this template  
**Location:** This template should be read by ALL agents before writing reflections

**THE GOLD IS IN THE DEPTH. If you were prodding yourself to go deeper, you're not deep enough.**
