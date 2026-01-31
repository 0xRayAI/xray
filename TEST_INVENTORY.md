# StringRay 1.2.0 Simulation & Orchestration Test Inventory

## Test Scripts Found

### MJS Test Scripts (in scripts/mjs/)

#### Orchestration Tests
1. **test-orchestrator-simple.mjs** - Simple orchestrator routing test
   - Status: BROKEN - Wrong import path
   - Fix: Change import from `./node_modules/strray-ai/dist/plugin/src/orchestrator.js` to `./node_modules/strray-ai/dist/orchestrator/orchestrator.js`

2. **test-orchestrator-complex.mjs** - Complex orchestrator with dependencies
   - Status: BROKEN - Wrong import path
   - Fix: Same as above

3. **test-complex-orchestration.mjs** - Complex multi-agent orchestration
   - Status: BROKEN - Syntax error + wrong path
   - Fix: Fix syntax error and change path from `../../dist/orchestrator.js` to `../../dist/orchestrator/orchestrator.js`

#### Simulation Tests
4. **run-simulations.mjs** - Codex rule simulations runner
   - Status: BROKEN - References non-existent simulation folder
   - Fix: Needs to be rewritten or pointed to actual test infrastructure

5. **test-simulation.mjs** - General simulation test
   - Status: UNKNOWN - Need to check

#### Other Related Tests
6. **test-mcp-functionality.mjs** - MCP server tests
7. **test-consumer-readiness.mjs** - Consumer environment tests
8. **test-configuration-validation.mjs** - Configuration validation
9. **test-framework-boot.mjs** - Framework boot tests
10. **test-integration.mjs** - Integration tests
11. **test-enforcement-e2e.mjs** - End-to-end enforcement
12. **test-ci-cd-integration.mjs** - CI/CD integration

### Bash Scripts (in scripts/bash/)

1. **test-manual-orchestration.sh** - Manual orchestration test
2. **validate-multi-agent-orchestration.sh** - Multi-agent validation
3. **check-agent-orchestration-health.sh** - Health check

### TypeScript Integration Tests (in src/__tests__/integration/)

1. **boot-orchestrator.integration.test.ts** - Boot orchestrator
2. **orchestration-e2e.test.ts** - E2E orchestration
3. **orchestrator-integration.test.ts** - Integration tests
4. **test-manual-orchestrator.test.ts** - Manual orchestrator
5. **test-orchestrator-led.test.ts** - LED orchestrator
6. **orchestrator/basic-orchestrator.test.ts** - Basic tests
7. **orchestrator/concurrent-execution.test.ts** - Concurrent execution
8. **orchestrator/dependency-handling.test.ts** - Dependency handling

## Fixes Needed

### Critical Path Issues
All orchestrator imports need to use correct paths:
- ❌ `dist/plugin/src/orchestrator.js`
- ❌ `../../dist/orchestrator.js`
- ✅ `dist/orchestrator/orchestrator.js` (correct)
- ✅ `./node_modules/strray-ai/dist/orchestrator/orchestrator.js` (for consumer tests)

### Missing Components
- `dist/simulation/` folder doesn't exist - codex-rule-simulations.js not found
- Need to either create simulation infrastructure or remove references
