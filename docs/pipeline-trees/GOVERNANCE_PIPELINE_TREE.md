# Governance Pipeline

**Purpose**: Validate operations against codex rules and attempt automatic fixes

**Data Flow**:
```
validateOperation(operation, context)
    │
    ▼
RuleRegistry.getRules()
    │
    ▼
RuleHierarchy.sortByDependencies()
    │
    ▼
For each rule (in dependency order):
    │
    ├─► ValidatorRegistry.getValidator()
    │
    └─► validator.validate() → RuleValidationResult
    │
    ▼
ValidationReport { passed, errors, warnings, results }
    │
    ▼
If violations:
    │
    ▼
attemptRuleViolationFixes(violations, context)
    │
    ▼
ViolationFixer.fixViolations()
    │
    ▼
Return ViolationFix[]
```

**Layers**:
- Layer 1: Rule Registry (RuleRegistry - rule storage)
- Layer 2: Rule Hierarchy (RuleHierarchy - dependencies)
- Layer 3: Validator Registry (ValidatorRegistry - validator lookup)
- Layer 4: Rule Executor (RuleExecutor - orchestration)
- Layer 5: Violation Fixer (ViolationFixer - fix delegation)

**Components**:
- `src/enforcement/rule-enforcer.ts` (RuleEnforcer - facade)
- `src/enforcement/core/rule-registry.ts` (RuleRegistry)
- `src/enforcement/core/rule-hierarchy.ts` (RuleHierarchy)
- `src/enforcement/core/rule-executor.ts` (RuleExecutor)
- `src/enforcement/core/violation-fixer.ts` (ViolationFixer)
- `src/enforcement/validators/validator-registry.ts` (ValidatorRegistry)

**Entry Points**:
| Entry | File:Line | Description |
|-------|-----------|-------------|
| validateOperation() | rule-enforcer.ts:368 | Main validation entry |
| attemptRuleViolationFixes() | rule-enforcer.ts:385 | Fix violations |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | ValidationReport { passed: true } |
| Violations | ValidationReport { passed: false, errors, warnings } |
| Fixes | ViolationFix[] |

**Rule Categories**:
- Code Quality: no-duplicate-code, console-log-usage
- Architecture: src-dist-integrity, no-over-engineering
- Security: input-validation, security-by-design
- Testing: tests-required, test-coverage

**Artifacts**:
- 28+ rules registered (sync + async)
- Validation reports with violations

**Testing Requirements**:
1. Validate operation → verify report generated
2. Validate with violations → verify errors detected
3. Attempt fixes → verify fix attempts made
4. Full flow: validate → report → fix → output
