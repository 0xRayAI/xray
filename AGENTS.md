# StringRay Framework - Agent Context Guide v1.1.1

**Version**: 1.1.1
**Purpose**: Enterprise AI orchestration with systematic error prevention
**Last Updated**: 2026-01-23

## Executive Overview

StringRay AI v1.1.1 is an enterprise AI orchestration platform that implements systematic error prevention through the Universal Development Codex. The framework provides 8 specialized AI agents with automatic complexity-based task routing and 99.6% error prevention.

### Core System Components
- **9 Specialized AI Agents** with intelligent delegation
- **28 MCP Servers** providing tool integration
- **8 Major Pipelines** for complete workflow coverage
- **Universal Development Codex** (59 mandatory rules)
- **JobId Logging System** for complete traceability

### Key Features
- **Multi-Agent Coordination**: Automatic task delegation based on complexity analysis
- **Codex Compliance**: 99.6% systematic error prevention and quality enforcement
- **Enterprise Security**: Comprehensive validation and monitoring
- **Performance Optimization**: Sub-millisecond response times with intelligent caching

## 🎯 CRITICAL AGENT DEVELOPMENT RULE: Mandatory File Reading Protocol

**MANDATORY AGENT DEVELOPMENT RULE (MANDATORY - ZERO TOLERANCE):**

All agents must ALWAYS read the ENTIRE file contents before making ANY edit or change. Use the `read` tool to digest complete file content, then apply precise edits based on understanding of the entire file context. Never use partial context or editing without full file visibility.

**BEFORE making ANY edit to a file, agents MUST:**
1. **ALWAYS** read the ENTIRE file using the `read` tool
2. **FULLY** understand the complete file context and structure
3. **VERIFY** import/export patterns, variable scoping, and function dependencies
4. **Only THEN** apply precise, targeted edits

**NEVER perform ANY of these PROHIBITED operations:**
- ❌ Edit files without first reading their complete contents
- ❌ Make changes based on partial/contextual file reading
- ❌ Use edit operations without full file understanding
- ❌ Report file changes without actually verifying them
- ❌ Claim edits were made without using the edit tool

**CRITICAL EDITING REQUIREMENT (ENFORCED):**
BEFORE making ANY edit to a file, agents MUST read the ENTIRE file using the `read` tool. This ensures full context understanding, prevents regressions, and maintains code integrity. Edit operations based on partial reading are strictly forbidden and will result in immediate failure.

## 🔧 CRITICAL SYSTEM DEVELOPMENT RULES

### **MANDATORY SYSTEM Rule #59A: Command Output Review & Course Correction**

**CRITICAL SYSTEM DEVELOPMENT RULE - IMMEDIATE ACTION REQUIRED:**

ALL agents MUST immediately review ALL command outputs, identify ANY errors or issues, and automatically add a TODO item for course correction. No exceptions. Every command output MUST be reviewed before proceeding to any further actions.

**MANDATORY REQUIREMENTS:**
1. **Review ALL Command Outputs Immediately** - Every `bash` or tool call output must be read and analyzed
2. **Identify Issues Automatically** - Look for errors, warnings, exceptions, failures, or unexpected results
3. **Add TODO for Course Correction** - When issues found, immediately add a TODO item to fix them
4. **Prioritize Fixes** - Critical errors (build failures, import errors, module not found) get PRIORITY HIGH
5. **Block Further Progress** - Do not proceed with other tasks until errors are addressed

**ENFORCEMENT:** This rule is enforced through systematic review. Violation of this rule will result in code errors and system failures that must be immediately corrected.

### **MANDATORY SYSTEM Rule #59B: File Verification Before Import/Usage**

**CRITICAL SYSTEM DEVELOPMENT RULE - IMPORT VALIDATION:**

ALL agents MUST verify file paths and extensions before creating imports or references. Node.js/Microsoft-style import resolution must be followed exactly.

**MANDATORY REQUIREMENTS:**
1. **Check File Existence** - Use `ls`, `find`, or `read` to verify target file exists
2. **Verify Import Paths** - Ensure relative paths (`../../file.ts`) match actual directory structure
3. **File Extensions Matter** - TypeScript files need `.ts` extension, don't import `.js` for `.ts` files
4. **Module Resolution Awareness** - Understand Node.js ESM vs CommonJS, TypeScript path mapping

### **MANDATORY SYSTEM Rule #59C: Agent Work Completion Confirmation**

**CRITICAL SYSTEM DEVELOPMENT RULE - WORK VERIFICATION:**

ALL agents MUST verify their changes actually took effect before declaring task completion. No exceptions. Post-change verification is mandatory to prevent reporting false success.

**MANDATORY REQUIREMENTS:**
1. **Verify Changes Applied** - Use `read` tool to confirm edits were made exactly as intended
2. **Check File Content** - Validate the actual file content contains expected modifications
3. **Test Compilation** - If code changes, run compilation to verify no syntax errors
4. **Confirm No Regressions** - Ensure existing functionality remains intact
5. **Report Actual Status** - Only declare success after confirmed verification

**ENFORCEMENT:** Violation results in immediate task failure. Agents must never declare "completed" without verification.

### **MANDATORY SYSTEM Rule #59C: Agent Work Completion Confirmation**

**CRITICAL SYSTEM DEVELOPMENT RULE - WORK VERIFICATION:**

ALL agents MUST verify their changes actually took effect before declaring task completion. No exceptions. Post-change verification is mandatory to prevent reporting false success and undetectable failures.

**MANDATORY REQUIREMENTS:**
1. **Verify Changes Applied** - Use `read` tool to confirm edits were made exactly as intended
2. **Check File Content** - Validate the actual file content contains expected modifications
3. **Test Compilation** - If code changes, run compilation to verify no syntax errors introduced
4. **Confirm No Regressions** - Ensure existing functionality remains intact
5. **Report Actual Status** - Only declare success after confirmed verification (no false positives)
6. **Verification Must Be Observable** - Log verification steps so failures are detectable

**PROHIBITED BEHAVIORS:**
- ✅ **Allowed**: Declare success only after verification confirms changes worked
- ❌ **Forbidden**: Declare success without checking if changes actually took effect
- ❌ **Forbidden**: Use subjective indicators (assumption, belief, "looks correct")
- ❌ **Forbidden**: Skip verification when changes are "trivial" or "obvious"
- ❌ **Forbidden**: Accept incomplete success metrics (only check positive changes, ignore regressions)
- ❌ **Forbidden**: Continue to next task when verification fails

**ENFORCEMENT:** Systematic verification required. Any task declared "completed" must include proof of successful verification. False completion reports result in workflow failures and revision requirements.

**VERIFICATION PROTOCOL:**
1. Pre-change: Establish baseline with `read` or relevant check
2. Apply changes: Execute the intended modification
3. Post-change: Use `read` to verify exact changes are present
4. Regression test: Ensure no unintended modifications occurred
5. Compilation check: Verify no new syntax/build errors introduced
6. Log completion: Only then declare task truly "completed"

**--------**

## Agent Capabilities Matrix

| Agent | Role | Complexity Threshold | Primary Tools | Conflict Strategy |
|-------|------|---------------------|---------------|-------------------|
| **enforcer** | Codex compliance & error prevention | All operations | read, grep, lsp_*, bash | Block on violations |
| **architect** | System design & technical decisions | High complexity | read, grep, lsp_*, bash, background_task | Expert priority |
| **orchestrator** | Multi-agent workflow coordination | Enterprise | read, grep, lsp_*, bash, background_task, call_omo_agent | Consensus |
| **bug-triage-specialist** | Error investigation & surgical fixes | Debug operations | read, grep, lsp_*, bash, ast_grep_* | Majority vote |
| **code-reviewer** | Quality assessment & standards validation | All code changes | read, grep, lsp_*, bash, lsp_diagnostics | Expert priority |
| **security-auditor** | Vulnerability detection & compliance | Security operations | read, grep, lsp_*, bash, grep_app_searchGitHub | Block critical |
| **refactorer** | Technical debt elimination & code consolidation | Refactor operations | read, grep, lsp_*, bash, ast_grep_*, lsp_rename | Majority vote |
| **test-architect** | Testing strategy & coverage optimization | Test operations | read, grep, lsp_*, bash | Expert priority |
| **librarian** | Codebase exploration & documentation | Analysis operations | project-analysis_* | N/A (solo agent) |

## Complexity Analysis System

Every request is evaluated using 6 key metrics for intelligent agent routing:

### Metrics
- **File Count** (0-20 points): Number of affected files
- **Change Volume** (0-25 points): Lines changed
- **Operation Type** (multiplier): create/modify/refactor/analyze/debug/test
- **Dependencies** (0-15 points): Component relationships
- **Risk Level** (multiplier): low/medium/high/critical
- **Duration** (0-15 points): Estimated minutes

### Decision Thresholds
- **≤25**: Single-agent execution (direct routing)
- **26-95**: Single-agent execution (may use background tasks)
- **96+**: Enterprise-level orchestration (orchestrator-led multi-agent workflow)

### Operation Multipliers
- create: 1.0, modify: 1.2, refactor: 1.8, analyze: 1.5, debug: 2.0, test: 1.3

### Risk Multipliers
- low: 0.8, medium: 1.0, high: 1.3, critical: 1.6

## Basic Usage Guide

### Agent Commands (oh-my-opencode)
```bash
@orchestrator coordinate complex task
@enforcer analyze code for violations
@architect design system architecture
@code-reviewer review pull request
@security-auditor scan for vulnerabilities
@refactorer consolidate duplicate code
@test-architect plan testing strategy
```

### Internal Agent Coordination
```typescript
// Primary method for agent-to-agent communication
task(description="Analyze codebase", prompt="...", subagent_type="librarian")

// Alternative for background execution
call_omo_agent(description="Code review", prompt="...", subagent_type="architect")
```

### CLI Management Commands
```bash
npx strray-ai install         # Install framework in project
npx strray-ai init           # Initialize configuration
npx strray-ai status         # Check installation status
npx strray-ai health         # Comprehensive health check
npx strray-ai report         # Generate activity reports
npx strray-ai validate       # Validate setup
```

## Architecture Overview

### Core Architecture
The framework operates as an oh-my-opencode plugin with hybrid TypeScript/Python backend:

- **Primary**: oh-my-opencode's Prometheus planner + Sisyphus executor
- **Secondary**: StringRay's multi-agent delegation for complex tasks
- **Configuration**: Merged hierarchy (global → project → framework settings)

### Boot Sequence
1. **Plugin Loading**: oh-my-opencode loads StringRay plugin
2. **Context Loading**: Codex terms and configuration loaded
3. **State Manager**: Session persistence initialized
4. **Orchestrator**: Multi-agent coordination activated
5. **Delegation System**: Task routing enabled
6. **Processors**: Pre/post validation pipelines activated
7. **Security**: Hardening and authentication enabled
8. **Monitoring**: Performance tracking started

### Key Components
- **Codex Enforcer**: Central validation authority for 59 mandatory rules
- **Complexity Analyzer**: Intelligent task routing engine
- **State Manager**: Session persistence and recovery
- **Orchestrator**: Multi-agent workflow coordination
- **MCP Servers**: 28 model context protocol servers for tool integration

## Universal Development Codex

59 mandatory terms for systematic error prevention:

### Core Terms (1-10)
1. Progressive production-ready code (no stubs/incomplete implementations)
2. No patches/stubs/bridge code
3. Avoid over-engineering
4. Fit-for-purpose production code
5. Surgical fixes only (root cause, not symptoms)
6. Batched introspection cycles
7. Resolve all errors (90% runtime prevention)
8. Prevent infinite loops
9. Use shared global state where possible
10. Single source of truth

### Key Architectural Terms (21-30)
21. Type safety first (no `any`, strict TypeScript)
22. Early returns and guard clauses
23. Error boundaries and graceful degradation
24. Immutability where possible
25. Separation of concerns
26. DRY - Don't Repeat Yourself
27. YAGNI - You Aren't Gonna Need It
28. Meaningful naming
29. Small, focused functions
30. Consistent code style

### Performance & Security (31-45)
31. Async/await over callbacks
32. Proper error handling (no empty catch blocks)
33. Logging and monitoring
34. Documentation updates
35. Version control best practices
36. Test coverage >85%
37. Fast feedback loops
38. Performance budget enforcement (<2MB bundle, <2s FCP)
39. Security by design
40. Accessibility first (WCAG 2.1 AA)

## Operational Flows

### Request Lifecycle
```
User Input → Complexity Analysis → Agent Routing → Execution → Validation → Response
                    ↓                     ↓                    ↓
            Enforcer evaluates    Rules enforced       Optimal agent
            orchestration needs   automatically       selected based
                                 via delegation      on complexity score
```

### Multi-Agent Escalation
```
Complexity > 95 → Orchestrator Activation
     ↓
Intelligent Agent Router selects team
     ↓
Parallel Execution with call_omo_agent/task()
     ↓
Result Consolidation with Consensus Resolution
     ↓
Final Response to User
```

### Error Handling
```
Error Detected → Rule Enforcement Pipeline → Agent Delegation
      ↓              ↓              ↓
Error Classification → Violation Mapping → Appropriate Agent Selection
      ↓              ↓              ↓
Auto-Fix Attempt → Success Monitoring → Report Generation
      ↓              ↓              ↓
Rollback on Failure → Escalation Path → Manual Intervention
```

## Configuration

### oh-my-opencode Configuration (.opencode/oh-my-opencode.json)
```json
{
  "model_routing": {
    "enforcer": "opencode/grok-code",
    "architect": "opencode/grok-code",
    "orchestrator": "opencode/grok-code",
    "bug-triage-specialist": "opencode/grok-code",
    "code-reviewer": "opencode/grok-code",
    "security-auditor": "opencode/grok-code",
    "refactorer": "opencode/grok-code",
    "test-architect": "opencode/grok-code",
    "librarian": "opencode/grok-code"
  },
  "framework": {
    "version": "1.1.1",
    "codexEnforcement": true,
    "jobIdLogging": true,
    "consoleLogRule": true
  },
  "pipelines": {
    "maxConcurrentAgents": 3,
    "complexityThresholds": {
      "singleAgent": 25,
      "multiAgent": 95
    }
  }
}
```

### Framework Configuration (.strray/config.json)
```json
{
  "framework": {
    "version": "1.1.1",
    "logging": {
      "level": "info",
      "jobIdTracking": true,
      "activityLogPath": "logs/framework/activity.log"
    }
  },
  "codex": {
    "enabled": true,
    "termCount": 59,
    "enforcement": "strict"
  },
  "performance": {
    "bundleSizeLimit": "2MB",
    "responseTimeTarget": "5s",
    "errorPreventionTarget": "99.6%"
  }
}
```

## Performance Budgets

- **Bundle Size**: <2MB (gzipped <700KB)
- **First Contentful Paint**: <2s
- **Time to Interactive**: <5s
- **Test Coverage**: >85%
- **Error Prevention**: 99.6%

## Troubleshooting Essentials

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Plugin not loading | Agent commands ignored | Run `node node_modules/strray-ai/scripts/postinstall.cjs` |
| Agent commands not working | @ commands unrecognized | Check oh-my-opencode configuration |
| Rule violations not caught | Code passes validation | Verify codex injection and rule enforcer |
| JobId missing | Activity log incomplete | Check framework-logger initialization |
| Performance issues | Slow responses | Monitor complexity analysis thresholds |
| MCP connectivity fails | Server connection errors | Run `node scripts/test:mcp-connectivity.js` |

### Diagnostic Commands
```bash
# Framework health
npx strray-ai health

# Activity log analysis
tail -50 logs/framework/activity.log

# Job-specific reports
npx strray-ai report --type full-analysis

# Performance monitoring
npm run performance:report

# MCP connectivity test
node scripts/test:mcp-connectivity.js

# Plugin validation
npx strray-ai validate
```

### Emergency Procedures
1. **Framework unresponsive**: Run `npx strray-ai doctor` for automated diagnosis
2. **Critical failures**: Check `logs/framework/error.log`
3. **Configuration corruption**: Remove `.opencode/` and `.strray/` then reinstall
4. **Complete reset**: `npm uninstall strray-ai && npm install strray-ai`

## Framework Status

**Production Ready**: Enterprise-grade AI orchestration platform
**Error Prevention**: 99.6% systematic validation
**Test Coverage**: 85%+ behavioral coverage
**Performance**: Sub-millisecond task delegation
**Scalability**: Multi-agent orchestration with automatic conflict resolution

---

## Reflection System

The StringRay Framework maintains a comprehensive reflection system for capturing institutional knowledge and guiding future development. Reflections are mandatory for significant development sessions and serve as both historical records and active decision-making tools.

**Reflection Categories:**
- **Journey Reflections**: Comprehensive framework evolution analysis
- **Incident Reflections**: Specific failures and recovery processes
- **Transformation Reflections**: Major technical changes and implementations
- **Session Reflections**: Current development session analysis and immediate lessons

**Current Session Requirements:**
- Create reflections immediately after debugging sessions exceeding 30 minutes
- Include root cause analysis, corrective actions, and specific next steps
- Reference related past reflections for continuity and pattern recognition

*Full documentation preserved in AGENTS-full.md. This condensed version provides essential context for agents while staying within token limits.*