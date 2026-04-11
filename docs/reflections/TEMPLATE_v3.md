# Reflection Template v3.0 (UNIFIED)

## For Personal Growth AND Institutional Knowledge

**Version:** 3.0
**Location:** `./docs/reflections/`
**Required:** After ANY significant session (>30 min, debugging, deployment, new feature)

---

## Naming Conventions

All reflections use this format:

```
[type]-[topic-description]-[date]-[timestamp].md
```

### Types
| Type | Prefix | When to Use |
|------|--------|-------------|
| Checkpoint | `checkpoint-` | Auto-triggered after N commits or N days |
| CI/CD | `auto-ci-` | After CI failures |
| Test | `auto-test-` | After test failures |
| Deployment | `auto-deployment-` | After deployments |
| Manual | `manual-` | User-triggered reflections |

### Examples
```
checkpoint-ci-cd-pipeline-fixes-2026-04-06-113048.md
manual-hermes-agent-integration-2026-04-05.md
auto-test-suite-failure-2026-04-04.md
```

### Rules
- Always include timestamp (HHMMSS) for uniqueness
- Use descriptive topic from commit message or work done
- Lowercase, hyphens for separators
- No special characters

---

## THE GOLD IS IN THE DEPTH

If you're prodding yourself to go deeper, you're not deep enough.

---

## PART A: PERSONAL GROWTH (Required)

*Why we learn: emotional truth creates lasting change*

### 1. Executive Summary (Required)
**One paragraph:** What happened, outcome, key lesson.

```markdown
[One paragraph summarizing: what the session was about, what we did, what we learned, what changed]
```

---

### 2. The Dichotomy - What Was / What Is / What Should Be (Required)

#### 2.1 What Was (The Struggle)
- What you initially thought the task was
- What made it harder than expected
- Your emotional state (frustration, confusion, confidence)
- **INNER DIALOGUE: What were you telling yourself?**

```markdown
**Initial Assumption:** [What you thought going in]

**The Reality:** [What you discovered]

**The Struggle:** [Emotional and technical challenges]

**Time/Resources:** [How long it actually took vs expected]

**INNER DIALOGUE:** [What were you saying to yourself?]
- "I knew X was the problem because..."
- "I was ready to do Y because..."
- "I couldn't understand why..."
```

#### 2.2 What Is (Present Understanding)
- Root causes discovered
- Patterns recognized
- Current emotional state
- **What would have been LOST?**

```markdown
**Root Causes Identified:**
1. [Cause 1]
2. [Cause 2]

**What Would Have Been LOST:**
- [Specific time/cost/trust that would have been destroyed]
```

#### 2.3 What Should Be (Future Vision)
- How to prevent this in the future
- Process improvements
- Your commitment

---

### 3. Counterfactual Thinking (Required)

**What WOULD have happened if you continued down your path?**

```markdown
### What Would Have Happened
If [constraint/insight] had NOT been in place:

**Step 1:** [First action I would have taken]
**Step 2:** [What that would have broken]
**Step 3:** [How I would have "fixed" that]
**Step 4:** [The cascade continues...]

### What Would Have Been Lost
- [Specific estimate of time/trust/quality]

### The False Victory
I would have "succeeded" in [doing X] but the real cost would have been [Y].
```

---

### 4. Personal Journey (Required)

**The human story behind the technical work**

```markdown
### My Struggle
[Describe the emotional and intellectual challenges]

### My Triumph
[Describe the victories, no matter how small]

### My Dichotomy
[Conflicting viewpoints you held simultaneously]
- I thought X but reality was Y

### What Would Have Happened If I Had My Way
[If you had overridden the constraint, what would have happened?]

### My Growth
[How this experience changed you]

### My Commitments to Future Self
1. [Specific behavior change]
2. [Process change]
```

---

### 5. The Master's Wisdom (Required)

**Who saved you? What did they know?**

```markdown
**Who Saved Me:** [Who set the constraint or gave guidance?]

**What They Knew:** [The wisdom they had that I was missing]

**Why They Knew It:** [What was their context?]

**What I Would Have Lost:** [Be specific - not just time]
```

---

## PART B: TECHNICAL (Required)

*Why we remember: actionable code builds future capability*

### 6. What Changed - With Code (Required)

**Before:**
```typescript
// [Exact before state]
```

**After:**
```typescript
// [Exact after state]
```

**Key Methods Added:**
```typescript
// [Method name]: what it does
// [Lines of code]
```

---

### 7. Architecture Impact (Required)

**ASCII Diagram of Change:**

```
[Before]:
┌─────────────────────────────────────────┐
│  Original Flow                          │
└─────────────────────────────────────────┘

[After]:
┌─────────────────────────────────────────┐
│  New Flow with Change                   │
│    ↓                                    │
│  [What was added]                       │
└─────────────────────────────────────────┘
```

---

### 8. Key Files Modified (Required)

| File | Change | Lines |
|------|--------|-------|
| [path/to/file.ts] | [description] | [+X] |
| [path/to/file.ts] | [description] | [+X] |

---

### 9. Test Evidence (Required)

```bash
$ [command run]
[actual output]

✅ [result]
```

---

### 10. What Still Doesn't Work (Required - Be Honest)

- [ ] [Issue 1 - still broken]
- [ ] [Issue 2 - not resolved]
- [ ] [Issue 3 - needs further work]

---

### 11. For Future AI (Required)

**How to continue this work:**

```bash
# Step 1: [command to run]
# Step 2: [what to check]
# Step 3: [how to verify]
```

**What was learned:**
1. [Lesson 1]
2. [Lesson 2]

**Patterns to watch:**
- [Pattern 1]
- [Pattern 2]

---

## PART C: EXTRACTION (Automated)

*This section is GENERATED by post-processor - not written manually*

### 12. Kernel Patterns Extracted
[Generated from content - patterns detected]

### 13. Code Examples for Reuse
[Generated - snippets for future AI]

### 14. Lessons for Learning Engine
[Generated - structured for pattern-learning-engine]

---

## Reflection Checklist (Before Marking Complete)

- [ ] PART A: Personal
  - [ ] Executive Summary
  - [ ] The Dichotomy (What Was/Is/Should Be)
  - [ ] INNER DIALOGUE in What Was
  - [ ] Counterfactual Thinking
  - [ ] Personal Journey
  - [ ] Master's Wisdom

- [ ] PART B: Technical
  - [ ] What Changed (with CODE)
  - [ ] Architecture Impact (ASCII diagram)
  - [ ] Key Files Modified (table)
  - [ ] Test Evidence (actual output)
  - [ ] What Still Doesn't Work (honest)
  - [ ] For Future AI (how to continue)

- [ ] Located in `./docs/reflections/`
- [ ] Named descriptively: `[topic]-reflection-[date].md`
- [ ] **Would this help future-me without any prodding?**

---

## Validator Usage

```bash
# Validate a reflection before committing
./scripts/node/reflection-check.sh docs/reflections/my-reflection.md
```

---

**Version:** 3.0  
**Updated:** 2026-04-04  
**Purpose:** Personal growth + Institutional knowledge in one document  
**Enforced by:** 0xRay reflection pipeline