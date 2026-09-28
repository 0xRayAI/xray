# Reflection Command System
## How to Ensure Bullet-Proof Reflection Compliance

**Version:** 1.0  
**Status:** Mandatory for all AI agents  
**Enforced By:** enforcer agent

---

## The Problem

Reflections have been written inconsistently across the codebase:
- Some in root directory (`KIMI_REFLECTION.md`)
- Some in `docs/reflections/` (correct location)
- Missing required sections
- Inconsistent structure
- Poor searchability
- Lost institutional knowledge

**This must stop.**

---

## The Solution: Three-Command System

### Command 1: READ TEMPLATE (Before Writing)

**When:** Before starting ANY reflection  
**Why:** Ensures you know the required structure

```bash
# READ THIS FIRST - Every time, without exception
cat docs/reflections/TEMPLATE.md
```

**Key things to note:**
- 9 required sections
- Specific formatting for each section
- Must be in `docs/reflections/` directory
- Must include checkboxes for action items
- Must have code examples

---

### Command 2: VALIDATE (After Writing)

**When:** After completing reflection, before saving  
**Why:** Catches non-compliance before it pollutes the codebase

```bash
# Run validation on your draft
./scripts/node/reflection-check.sh /path/to/your/reflection-draft.md
```

**What it checks:**
- ✅ File location (must be in docs/reflections/)
- ✅ Executive Summary present
- ✅ The Dichotomy sections (What Was/Is/Should Be)
- ✅ Timeline/Chronological section
- ✅ Root Cause Analysis with structure
- ✅ Solutions/Fixes section
- ✅ Deep Lessons with Pitfall→Ah-Ha structure
- ✅ Personal Journey section
- ✅ Action Items with checkboxes
- ✅ Code examples present
- ✅ Minimum length (100+ lines)

**If validation fails:**
```
❌ REFLECTION IS NON-COMPLIANT
Fix the errors above before saving.
```

**You MUST fix errors before proceeding.**

---

### Command 3: SAVE CORRECTLY (Final Step)

**When:** After validation passes  
**Why:** Ensures proper naming and location

```bash
# Move to correct location with descriptive name
mv your-reflection-draft.md docs/reflections/[descriptive-name]-reflection.md

# Examples of good names:
# docs/reflections/deployment-crisis-v12x-reflection.md
# docs/reflections/test-suite-recovery-reflection.md
# docs/reflections/mcp-path-bug-reflection.md
# docs/reflections/json-codex-integration-reflection.md

# Bad names (too vague):
# reflection.md
# thoughts.md
# notes.md
```

---

## Complete Workflow Example

### Scenario: You just spent 2 hours debugging a deployment issue

```bash
# Step 1: Read template (EVERY TIME)
cat docs/reflections/TEMPLATE.md

# Step 2: Write your reflection
# Use preferred editor to create: /tmp/deployment-debug-reflection.md

# Step 3: Validate before saving
./scripts/node/reflection-check.sh /tmp/deployment-debug-reflection.md

# If output shows:
# ❌ Missing Executive Summary section
# ❌ Missing Timeline section
# ❌ Missing Root Cause Analysis section
# → Go back and add those sections

# Step 4: Fix issues and re-validate
./scripts/node/reflection-check.sh /tmp/deployment-debug-reflection.md

# If output shows:
# ✅ REFLECTION IS COMPLIANT
# → Proceed to save

# Step 5: Save to correct location
mv /tmp/deployment-debug-reflection.md docs/reflections/deployment-crisis-v127-reflection.md

# Step 6: Verify it's there
ls -la docs/reflections/*v127*
```

---

## Quick Reference Card

### Before Starting
```bash
cat docs/reflections/TEMPLATE.md | head -50
```

### After Writing
```bash
./scripts/node/reflection-check.sh your-reflection.md
```

### Naming Convention
```bash
# Format: [topic]-[specifics]-reflection.md
docs/reflections/[descriptive-topic]-[specific-details]-reflection.md

# Examples:
docs/reflections/ci-cd-pipeline-failure-reflection.md
docs/reflections/mcp-server-path-bug-reflection.md
docs/reflections/test-suite-recovery-jan2026-reflection.md
```

### Location (NON-NEGOTIABLE)
```bash
# Correct:
docs/reflections/my-reflection.md

# WRONG - Never do these:
./my-reflection.md                    # Root directory
./KIMI_REFLECTION.md                  # Root with vague name
./docs/my-reflection.md               # Wrong subdirectory
./reflections/my-reflection.md        # Missing docs/
```

---

## Enforcement

### Pre-Commit Hook (Future)
```bash
# Will be added to prevent non-compliant reflections
if [ -f "docs/reflections/*.md" ]; then
    ./scripts/node/reflection-check.sh docs/reflections/*.md
fi
```

### CI/CD Integration (Future)
```yaml
# Will run in GitHub Actions
- name: Validate Reflections
  run: |
    for file in docs/reflections/*.md; do
      ./scripts/node/reflection-check.sh "$file"
    done
```

### Enforcer Agent Rule (Immediate)
```
CRITICAL RULE #21: All reflections MUST:
1. Be in docs/reflections/ directory
2. Follow TEMPLATE.md structure
3. Pass reflection-check.sh validation
4. Have descriptive names

VIOLATION: Write reflection to wrong location
CONSEQUENCE: Immediate request to rewrite
```

---

## FAQ

### Q: Do I need to validate every reflection?
**A:** YES. No exceptions. Even "quick" reflections must follow the template.

### Q: What if I'm in the middle of a crisis?
**A:** Follow the template anyway. The structure helps you think clearly during crises.

### Q: Can I add extra sections?
**A:** Yes, but all 9 required sections must be present first.

### Q: What if my reflection is short?
**A:** If session was <30 minutes, maybe doesn't need reflection. If >30 minutes, expand to meet 100-line minimum.

### Q: Can I use a different format?
**A:** NO. The template exists for consistency and searchability.

---

## Template Summary (9 Required Sections)

1. **Executive Summary** - One-paragraph overview
2. **The Dichotomy** - What Was / What Is / What Should Be
3. **Timeline** - Chronological event log with phases
4. **Root Cause Analysis** - Symptom → Root Cause → Why Missed → Fix
5. **Solutions Applied** - Problem → Solution → Files → Verification
6. **Deep Lessons** - Pitfall → Ah-Ha Moment → Deep Learning → Observation
7. **Personal Journey** - Struggle → Triumph → Dichotomy → Growth → Future Self
8. **Action Items** - Immediate/Short/Long term + Prevention Checklist
9. **Technical Artifacts** - Commands, code snippets, queries

**Missing any = NON-COMPLIANT**

---

## Migration of Existing Reflections

### Current Root Directory Reflections (MUST MOVE)
- `DEPLOYMENT_REFLECTION.md` → `docs/reflections/deployment-crisis-v12x-reflection.md`
- `KIMI_REFLECTION.md` → `docs/reflections/kimi-deployment-crisis-reflection.md` (needs rewrite per template)

### Command to Move
```bash
# Move and rename for consistency
mv DEPLOYMENT_REFLECTION.md docs/reflections/deployment-crisis-v12x-reflection.md
mv KIMI_REFLECTION.md docs/reflections/kimi-deployment-learnings-reflection.md
```

---

## Success Metrics

**Target:** 100% compliance within 1 week

**Measurement:**
```bash
# Check compliance of all reflections
for file in docs/reflections/*.md; do
  ./scripts/node/reflection-check.sh "$file"
done
```

**Goal:** Zero errors, zero warnings

---

**Version:** 1.0  
**Last Updated:** 2026-02-01  
**Enforced By:** enforcer agent - Non-compliance = immediate rewrite request