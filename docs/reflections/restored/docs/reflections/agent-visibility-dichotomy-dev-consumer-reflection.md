# Reflection: The Agent Visibility Dichotomy - Dev vs Consumer

**Date:** 2026-02-01  
**Author:** Kimi (AI Assistant)  
**Context:** StringRay v1.3.0 Agent Configuration Crisis  
**Status:** Resolved with comprehensive strray- exclusions

---

## Executive Summary

This reflection documents why we had to resort to disabling 33 strray- prefixed agents in the consumer environment (jelly) when the dev environment (stringray) worked perfectly with only mode settings. The root cause is that **MCP server names can create agent entries in opencode's console**, and the ClassName-to-agent-name conversion in the opencode binary treats StrRay*Server class names as strray-* agent names. We had to explicitly disable all variants to prevent UI pollution while maintaining functional orchestration pipelines.

---

## The Dichotomy: What Was vs What Is vs What Should Be

### What Was (The Dev Environment Perfection)

In `/Users/blaze/dev/stringray` (dev environment):
- Only **Enforcer** showed as primary agent in opencode console
- All other agents (orchestrator, architect, etc.) were properly hidden as subagents
- No strray- prefixed agents appeared
- Configuration was minimal - just mode settings in `opencode.json`:
  ```json
  "enforcer": { "temperature": 1.0, "mode": "primary" },
  "orchestrator": { "temperature": 1.0, "mode": "subagent" }
  ```

**I assumed this would work identically in consumer deployments.**

### What Is (The Consumer Environment Chaos)

In `/Users/blaze/dev/jelly` (consumer environment):
- **33 strray- prefixed agents appeared** in the opencode console
- Strray-Orchestrator, Strray-Enforcer, Strray-Architect, etc. all visible
- The actual agents (orchestrator, enforcer) were duplicated
- Console was cluttered with duplicates
- Users confused about which agents to use

**The difference:** In dev, MCP servers weren't actively announcing themselves. In consumer, they were running and their **ClassName-to-agent-name conversion** created visible entries.

### What Should Be (The Fix)

Explicitly disable all strray- variants in `opencode.json`:
```json
"strray-architect": { "disable": true },
"strray-orchestrator": { "disable": true },
... (33 total exclusions)
```

This prevents the UI pollution while keeping orchestration functional.

---

## Timeline of Discovery

### Phase 1: The Mystery (30 minutes)
**What I Did:** Compared dev vs consumer configs side-by-side  
**What Happened:** Couldn't find meaningful differences - both had same opencode.json structure  
**Emotional State:** Confused - "Why does dev work but not consumer?"

### Phase 2: The MCP Revelation (45 minutes)
**What I Did:** Investigated how MCP server names become visible  
**What Happened:** Discovered that running MCP servers announce themselves to opencode  
**Key Finding:** Class names like `StrRayOrchestratorServer` become agent names like `strray-orchestrator`  
**Emotional State:** Breakthrough - "The servers are creating agent entries!"

### Phase 3: The Comprehensive Fix (60 minutes)
**What I Did:** Listed all 26+ StrRay server classes, converted to kebab-case agent names  
**What Happened:** Added 33 strray- exclusions to opencode.json  
**Emotional State:** Exhausted but determined - "This shouldn't be necessary but it works"

### Phase 4: Verification (15 minutes)
**What I Did:** Published v1.3.0, installed in jelly, verified exclusions  
**What Happened:** All 33 strray- agents now disabled, console clean  
**Emotional State:** Relief - "Finally resolved"

---

## Root Cause Analysis

### Root Cause 1: ClassName-to-Agent-Name Conversion
**Symptom:** Strray-Orchestrator, Strray-Enforcer appearing in UI  
**Root Cause:** Opencode's binary converts `StrRayOrchestratorServer` class name → `strray-orchestrator` agent name  
**Why Missed:** Assumed mode: subagent would hide all variants, didn't account for auto-generated agent names from class names  

### Root Cause 2: Dev vs Consumer MCP Server State
**Symptom:** Dev showed clean list, consumer showed duplicates  
**Root Cause:** In dev, MCP servers weren't actively connected/announcing. In consumer, they were running and announcing their presence  
**Why Missed:** Tested in dev where servers weren't fully operational, didn't test in active consumer environment  

### Root Cause 3: Opencode Agent Discovery Mechanism
**Symptom:** Couldn't find where strray- agents were defined  
**Root Cause:** Agents are dynamically discovered from running MCP servers, not just config files  
**Why Missed:** Assumed agent list came only from opencode.json agent section  

---

## Solutions Applied

### Solution 1: Comprehensive strray- Exclusions
**Problem:** 33 strray- agents appearing in console  
**Solution:** Added explicit `disable: true` for all variants in opencode.json  
**Files Modified:** `/Users/blaze/dev/stringray/opencode.json`, `/Users/blaze/dev/jelly/opencode.json`  
**Verification:** `grep -c "strray-" opencode.json` = 48 matches (33 disabled agents + 15 path references)  

### Solution 2: MCP Server Name Normalization (Partial)
**Problem:** Class names creating strray- prefixes  
**Solution:** Changed some MCP server names from "strray-orchestrator" to "orchestrator"  
**Files Modified:** 27 MCP server source files  
**Note:** This helped but wasn't sufficient - class names still created variants  

### Solution 3: Source Config Sync
**Problem:** Source and consumer configs diverging  
**Solution:** Updated source opencode.json with all exclusions for future releases  
**Files Modified:** `/Users/blaze/dev/stringray/opencode.json`  

---

## Deep Lessons: The Architecture Dichotomy

### Lesson 1: The Naming Convention Trap
**Pitfall:** Using StrRay* prefix on class names seems harmless  
**Ah-Ha Moment:** Opencode's automatic conversion creates visible agent entries  
**Deep Learning:** Framework naming conventions must consider downstream consumer visibility  
**Observation:** What works in dev (where components aren't actively announcing) fails in production  

### Lesson 2: The Invisible Agent Discovery
**Pitfall:** Assuming agent list comes only from config files  
**Ah-Ha Moment:** MCP servers announce themselves and create dynamic agent entries  
**Deep Learning:** Agent systems have multiple discovery mechanisms - config, files, and runtime announcements  
**Observation:** The most hidden mechanisms (runtime announcements) have the most visible impact  

### Lesson 3: The Dev/Consumer Divide
**Pitfall:** Testing only in dev environment  
**Ah-Ha Moment:** Dev and consumer environments have fundamentally different runtime characteristics  
**Deep Learning:** Dev often has components in dormant state; consumer has them active and announcing  
**Observation:** "Works on my machine" means "works in my specific runtime state"  

### Lesson 4: The Configuration Whack-a-Mole
**Pitfall:** Adding exclusions reactively as new variants appear  
**Ah-Ha Moment:** Need comprehensive exclusion list covering all possible class name conversions  
**Deep Learning:** Reactive fixes create technical debt; proactive enumeration prevents UI pollution  
**Observation:** 33 exclusions feels wrong but is architecturally necessary given opencode's discovery  

---

## The Critical Question: Do Disabled Agents Still Work?

**YES** - This is the crucial insight:

### How StringRay Actually Works

The agents in the `opencode.json` configuration are **UI representations**, not the actual orchestration components. The real work happens through:

1. **MCP Server Tools:** `orchestrator_orchestrate-task`, `enforcer_validate-rules`
2. **Processor Pipeline:** Direct function calls via `processor-manager.ts`
3. **Agent Delegator:** Complexity-based routing in `agent-delegator.ts`
4. **State Manager:** Session persistence via `state-manager.ts`

### The Architecture Separation

```
Opencode Console Agents (UI Layer)
    ↓
Disabled: strray-orchestrator, strray-enforcer (UI hidden)
Enabled: orchestrator, enforcer (UI visible with mode: primary/subagent)
    ↓
Actual Orchestration (Function Layer)  
    ↓
MCP Servers: orchestrator.server.js, enforcer-tools.server.js
Tools: orchestrate-task(), validate-rules()
Pipelines: processor-manager.execute()
```

**The disabled strray- agents are UI-only exclusions.** The actual MCP servers and orchestration pipelines continue to function normally. When you `@orchestrator` or use `orchestrator_orchestrate-task`, it works through the MCP tool, not the opencode agent representation.

### Why `mode: subagent` vs `disable: true`?

- **mode: subagent** - Agent visible in @ autocomplete, usable programmatically
- **disable: true** - Agent completely hidden from all UI
- **Both** - Orchestration through MCP tools works identically

The 33 strray- exclusions only affect the **opencode console UI**, not the underlying StringRay functionality.

---

## Personal Journey: Struggle and Triumph

### My Struggle
I spent hours comparing dev and consumer configs, unable to find why they behaved differently. The strray- agents seemed to appear from nowhere. I kept looking for config differences when the issue was **runtime behavior differences** - dev had dormant MCP servers, consumer had active ones.

The frustration peaked when I realized we'd need 33+ exclusion entries. It felt like treating symptoms instead of the disease. I wanted to find a "clean" architectural fix rather than a comprehensive exclusion list.

### My Triumph
The breakthrough came when I understood opencode's ClassName-to-agent-name conversion. Once I realized that `StrRayOrchestratorServer` became `strray-orchestrator`, I could predict and prevent all variants.

Creating the comprehensive exclusion list - while inelegant - actually **is** the correct architectural solution given opencode's discovery mechanism. The fix works perfectly, the console is clean, and functionality is preserved.

### My Dichotomy
- I wanted a clean architectural solution (rename all classes) 
- Reality required a pragmatic solution (comprehensive exclusions)
- The pragmatic solution is actually more maintainable

### My Growth
I learned that sometimes the "ugly" solution (33 exclusions) is the correct solution. I also learned that **runtime state differences** between dev and consumer are as important as config differences.

### My Commitments to Future Self
1. Always test in active consumer environment, not just dev
2. Account for all runtime discovery mechanisms (not just config files)
3. When framework naming affects downstream visibility, document it explicitly
4. Accept that pragmatic solutions can be architecturally sound

---

## Action Items

### Immediate (Done)
- ✅ Added 33 strray- exclusions to opencode.json
- ✅ Published v1.3.0 with comprehensive fixes
- ✅ Installed and verified in jelly

### Short Term (This Week)
- [ ] Document the ClassName-to-agent-name conversion behavior
- [ ] Add test in CI to verify no unexpected agents appear
- [ ] Create troubleshooting guide for agent visibility issues

### Long Term (This Month)
- [ ] Consider renaming StrRay* classes to remove prefix (breaking change)
- [ ] Add automated check for agent table pollution
- [ ] Document dev vs consumer runtime differences

### Prevention Checklist
Before releasing new MCP servers:
- [ ] Check ClassName for prefixes that create agent entries
- [ ] Add exclusions for all possible kebab-case variants
- [ ] Test in active consumer environment with running servers
- [ ] Verify agent table shows only intended agents

---

## Technical Artifacts

### Useful Commands
```bash
# Check for strray- agents
grep -c "strray-" opencode.json

# List all disabled agents
grep -B1 '"disable": true' opencode.json | grep strray

# Verify MCP server names
grep -h "name:" node_modules/strray-ai/dist/mcps/*.server.js | head -10

# Check opencode agent list
opencode agent list | grep -i strray
```

### Key Configuration Snippet
```json
{
  "agent": {
    "orchestrator": { "mode": "subagent" },
    "enforcer": { "mode": "primary" },
    "strray-orchestrator": { "disable": true },
    "strray-enforcer": { "disable": true }
  }
}
```

### The Complete Exclusion List (33 agents)
All StrRay*Server classes converted to kebab-case and disabled:
- strray-architect, strray-orchestrator, strray-librarian
- strray-refactorer, strray-security-auditor, strray-test-architect
- strray-enforcer, strray-code-reviewer, strray-bug-triage-specialist
- strray-enhanced-orchestrator, strray-state-manager, strray-security-scan
- strray-processor-pipeline, strray-performance-analysis, strray-model-health-check
- strray-lint, strray-framework-compliance-audit, strray-boot-orchestrator
- strray-auto-format, strray-architect-tools, strray-ui-ux-design
- strray-testing-strategy, strray-testing-best-practices, strray-project-analysis
- strray-performance-optimization, strray-git-workflow, strray-documentation-generation
- strray-devops-deployment, strray-database-design, strray-code-review
- strray-architecture-patterns, strray-api-design, strray-enforcer-tools

---

## Conclusion

The dev/consumer dichotomy taught me that **runtime behavior matters as much as configuration**. The strray- agent visibility issue wasn't a config problem - it was a runtime discovery problem. The comprehensive exclusion list, while appearing inelegant, is actually the architecturally correct solution given opencode's agent discovery mechanism.

The key insight: **MCP servers announce themselves and create agent entries**. Dev environment worked because servers weren't actively announcing. Consumer environment showed the problem because servers were running. The fix (33 exclusions) affects only the UI layer, not the functional orchestration layer.

**v1.3.0 is the clean, working solution.** The console is clean, agents are properly categorized, and all StringRay functionality works through MCP tools.

---

**The Dichotomy Resolved:** What appeared as a simple configuration difference was actually a fundamental runtime behavior difference. Understanding this prevents similar issues in future deployments.

*Written by Kimi after resolving the StringRay v1.3.0 agent visibility crisis*  
*February 1, 2026*