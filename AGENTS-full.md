# StringRay Framework - Complete System Architecture & Technical Reference

**Version**: 1.9.0
**Purpose**: Enterprise AI orchestration with systematic error prevention and modular architecture
**Last Updated**: 2026-03-12
**System Complexity**: 75+ modular files, 27 specialized agents, 14 MCP servers, 60 codex terms

---

## Table of Contents

- [1. Quick Start Guide](#1-quick-start-guide)
- [2. Architecture Overview](#2-architecture-overview)
  - [2.1 Modular Architecture Transformation](#21-modular-architecture-transformation)
  - [2.2 Facade Pattern Design](#22-facade-pattern-design)
  - [2.3 Component Interaction](#23-component-interaction)
- [3. Agent Reference - Complete (27 Agents)](#3-agent-reference---complete-27-agents)
  - [3.1 Core Agents (9)](#31-core-agents-9)
  - [3.2 Specialized Engineering Agents (9)](#32-specialized-engineering-agents-9)
  - [3.3 Strategy & Content Agents (9)](#33-strategy--content-agents-9)
- [4. Architecture Deep Dive](#4-architecture-deep-dive)
  - [4.1 RuleEnforcer Module System](#41-ruleenforcer-module-system)
  - [4.2 TaskSkillRouter Module System](#42-taskskillrouter-module-system)
  - [4.3 MCP Client Module System](#43-mcp-client-module-system)
- [5. Technical Reference](#5-technical-reference)
  - [5.1 Internal APIs](#51-internal-apis)
  - [5.2 Configuration Reference](#52-configuration-reference)
  - [5.3 Advanced Usage Patterns](#53-advanced-usage-patterns)
- [6. Examples & Usage Patterns](#6-examples--usage-patterns)
- [7. Migration Guide: Monolithic to Modular](#7-migration-guide-monolithic-to-modular)
- [8. Appendices](#8-appendices)

---

## 1. Quick Start Guide

### Installation

```bash
# Install StringRay in your project
npm install strray-ai

# Run post-install configuration
node node_modules/strray-ai/scripts/node/postinstall.cjs

# Verify installation
npx strray-ai health
```

### Basic Usage

```bash
# Invoke agents using @ syntax
@enforcer analyze this code for codex compliance
@architect design a REST API for user management
@code-reviewer review this pull request
@security-auditor scan for vulnerabilities

# Check framework status
npx strray-ai status
npx strray-ai capabilities
```

### File Organization Guidelines

**IMPORTANT**: Save all generated files to their proper directories. Do NOT save to root.

| File Type | Save To | Example |
|-----------|---------|---------|
| **Reflections** | `docs/reflections/` or `docs/reflections/deep/` | `docs/reflections/my-fix-reflection.md` |
| **Logs** | `logs/` | `logs/framework/activity.log` |
| **Scripts** | `scripts/` or `scripts/bash/` | `scripts/bash/my-script.sh` |
| **Test Files** | `src/__tests__/` | `src/__tests__/unit/my-test.test.ts` |
| **Source Code** | `src/` | `src/my-module.ts` |
| **Config** | `config/` or `.opencode/strray/` | `config/my-config.json` |
| **Docs** | `docs/` | `docs/my-feature.md` |

---

## 2. Architecture Overview

### 2.1 Modular Architecture Transformation

StringRay v1.9.0 represents a **major architectural transformation** from monolithic to modular design. This refactoring improves maintainability, testability, and extensibility while maintaining 100% backward compatibility.

#### Before vs After Comparison

| Aspect | Before (v1.7.x) | After (v1.9.0) | Improvement |
|--------|-----------------|----------------|-------------|
| **RuleEnforcer** | 2,714 lines, 58 methods | 416-line facade + 6 modules | **87% size reduction** |
| **TaskSkillRouter** | 1,933 lines, monolithic | 490-line facade + 12 modules | **75% size reduction** |
| **MCP Client** | 1,413 lines, single file | 312-line facade + 8 modules | **78% size reduction** |
| **Total Files** | 3 monolithic files (9,230 lines) | 75+ modular files (1,218 lines) | **87% size reduction** |
| **Testability** | Difficult to unit test | Isolated module testing | **85%+ coverage** |
| **Maintainability** | Complex, error-prone | Clear separation of concerns | **Dramatic improvement** |

#### Architectural Benefits

**Performance Improvements:**
- **Faster Startup**: Modular loading reduces initialization time by ~40%
- **Reduced Memory**: Smaller active codebase reduces memory footprint
- **Better Caching**: Individual modules can be cached independently
- **Parallel Loading**: Modules load in parallel where possible

**Maintainability Improvements:**
- **Focused Modules**: Each module has a single, clear responsibility
- **Easier Debugging**: Isolated components simplify troubleshooting
- **Simpler Testing**: Unit tests focus on single modules
- **Clear Dependencies**: Explicit module dependencies prevent circular issues

**Extensibility Improvements:**
- **Plugin Architecture**: New modules plug in via configuration
- **Custom Rules**: Add rules without modifying core code
- **Custom Processors**: Extend processing pipeline with custom modules
- **Custom Agents**: Easy agent creation using modular patterns

### 2.2 Facade Pattern Design

The **Facade Pattern** is the cornerstone of StringRay's modular architecture. It provides a simplified interface to a complex subsystem of modules.

#### What is a Facade?

A facade is a design pattern that provides a unified interface to a set of interfaces in a subsystem. It defines a higher-level interface that makes the subsystem easier to use.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT CODE                               │
│         (Agents, Processors, User Code)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    FACADE LAYER                              │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ RuleEnforcer│  │ TaskSkillRouter │  │   MCPClient     │  │
│  │   Facade    │  │     Facade      │  │     Facade      │  │
│  │  (416 lines)│  │   (490 lines)   │  │   (312 lines)   │  │
│  └──────┬──────┘  └────────┬────────┘  └────────┬────────┘  │
└─────────┼──────────────────┼────────────────────┼───────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  MODULE LAYER                                │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Registry   │  │     Config      │  │     Types       │  │
│  │  Executor   │  │    Analytics    │  │     Config      │  │
│  │ Hierarchy   │  │    Routing      │  │   Connection    │  │
│  │   Fixer     │  │    Mapping      │  │     Tools       │  │
│  │  Loaders    │  │    ... (12)     │  │   Simulation    │  │
│  │ Validators  │  │                 │  │     ... (8)     │  │
│  └─────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Facade Responsibilities

**RuleEnforcer Facade:**
- Public API for rule validation
- Delegates to specialized modules
- Maintains backward compatibility
- Coordinates cross-module operations

**TaskSkillRouter Facade:**
- Unified task routing interface
- Skill discovery and invocation
- Analytics and monitoring
- Configuration management

**MCPClient Facade:**
- Server connection management
- Tool discovery and execution
- Error handling and retries
- Connection pooling

### 2.3 Component Interaction

#### Module Communication Patterns

```
Data Flow Through Modular System:

User Request → Facade → Module A → Module B → Module C → Response
                    ↓         ↓         ↓
               Validation  Execution  Cleanup
```

**Communication Methods:**

1. **Direct Calls**: Facade calls module methods directly
2. **Event Emitters**: Modules emit events for loose coupling
3. **Shared State**: Centralized state store for cross-module data
4. **Dependency Injection**: Modules receive dependencies via constructor

#### Dependency Injection Pattern

```typescript
// Module receives dependencies via constructor
class RuleExecutor {
  constructor(
    private validator: RuleValidator,
    private registry: RuleRegistry,
    private logger: Logger
  ) {}
  
  async execute(rule: Rule, context: Context): Promise<Result> {
    // Use injected dependencies
    const isValid = await this.validator.validate(rule);
    const registeredRule = this.registry.get(rule.id);
    this.logger.log('Executing rule', rule.id);
    // ...
  }
}
```

#### Module Interface Contracts

All modules implement standardized interfaces:

```typescript
// Base module interface
interface IModule {
  initialize(config: ModuleConfig): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): ModuleStatus;
}

// Rule module interface
interface IRuleModule extends IModule {
  validate(input: unknown): Promise<ValidationResult>;
  getRules(): Rule[];
}

// Routing module interface
interface IRoutingModule extends IModule {
  route(task: Task): Promise<RouteResult>;
  getCapabilities(): Capability[];
}
```

---

## 3. Agent Reference - Complete (27 Agents)

StringRay provides **27 specialized AI agents** organized into three categories:

### 3.1 Core Agents (9)

These are the primary agents that form the foundation of the StringRay framework.

---

#### @enforcer
**Version**: 1.9.0  
**Role**: Codex compliance & error prevention  
**Complexity Threshold**: All operations  
**Primary Pipeline**: Rule Enforcement

**Description**:  
The enforcer serves as the **central coordinator** for all codex compliance and error prevention. It validates every operation against the Universal Development Codex and delegates violations to appropriate agents for remediation.

**Capabilities:**
- Real-time codex rule validation (60 terms)
- Automatic violation detection and reporting
- Automated fix delegation to specialized agents
- Complexity analysis for routing decisions
- Integration with all 6 RuleEnforcer modules

**Codex Terms Enforced (All 60 terms):**
- **Core Terms**: 1-20 (Progressive production-ready code, no patches/stubs, type safety, etc.)
- **Architecture Terms**: 21-30 (Dependency injection, interface segregation, SOLID principles)
- **Testing Terms**: 26-27 (Test coverage >85%, fast feedback loops)
- **Security Terms**: 29 (Security by design)
- **Governance Terms**: 52-60 (Agent spawn governance, validation chain, multi-agent coordination)

**Example Invocations:**
```bash
# Validate code against codex
@enforcer analyze this function for codex compliance

# Check for specific violations
@enforcer check for console.log statements in src/

# Validate test coverage
@enforcer verify test coverage meets 85% threshold

# Run comprehensive audit
@enforcer perform full codex audit of the codebase

# Check type safety
@enforcer validate no 'any' types are used in TypeScript files
```

**Integration Points:**
- **RuleEnforcer Modules**: Uses Registry, Executor, Validators
- **TaskSkillRouter**: Routes violations to fixer agents
- **MCP Client**: Invokes validation tools via enforcer-tools.server
- **Post-Processor**: Validates all code changes pre-commit

**Dependencies:**
- All other agents (for violation delegation)
- RuleEnforcer facade
- Processor pipeline

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`
- `skill-code-review`, `skill-security-audit`
- All validation MCP servers

**Status**: ✅ Production Ready  
**Notes**: Central governance agent - all compliance decisions flow through enforcer

---

#### @architect
**Version**: 1.9.0  
**Role**: System design & technical decisions  
**Complexity Threshold**: High complexity (>25)  
**Primary Pipeline**: Agent Delegation

**Description**:  
The architect agent specializes in system design, API architecture, and technical decision-making. It provides high-level guidance on code structure, design patterns, and architectural best practices.

**Capabilities:**
- System architecture design and review
- API endpoint design (RESTful, GraphQL)
- Database schema design
- Design pattern selection and implementation
- Technical debt assessment
- Architecture pattern recommendations

**Codex Terms Integrated:**
- **3**: Do not over-engineer the solution
- **4**: Fit for purpose and prod-level code
- **15**: Separation of concerns
- **21**: Dependency injection
- **22**: Interface segregation
- **23**: Open/closed principle
- **24**: Single responsibility principle
- **40**: Modular design
- **41**: State management patterns

**Example Invocations:**
```bash
# Design a new API
@architect design REST API for user authentication

# Review architecture
@architect review the microservices architecture

# Design database schema
@architect design database schema for e-commerce system

# Choose design pattern
@architect recommend design pattern for state management

# Assess technical debt
@architect analyze technical debt in the monolith
```

**Integration Points:**
- **TaskSkillRouter**: Routes architecture tasks
- **MCP Client**: Uses architect-tools.server
- **Enforcer**: Validates designs against codex
- **Skills**: architecture-patterns, api-design, database-design

**Dependencies:**
- Enforcer (for codex validation)
- Refactorer (for implementation)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `background_task`
- `skill-architecture-patterns`, `skill-api-design`, `skill-database-design`

**Status**: ✅ Production Ready

---

#### @orchestrator
**Version**: 1.9.0  
**Role**: Multi-agent workflow coordination  
**Complexity Threshold**: Enterprise (>95)  
**Primary Pipeline**: Agent Delegation

**Description**:  
The orchestrator manages complex, multi-agent workflows for enterprise-level tasks. It coordinates multiple agents, resolves conflicts, and consolidates results into unified responses.

**Capabilities:**
- Multi-agent task coordination
- Conflict resolution (majority vote, expert priority, consensus)
- Parallel agent execution
- Result consolidation and synthesis
- Complex workflow management
- Agent consensus building

**Codex Terms Integrated:**
- **6**: Batched introspection cycles
- **7**: Resolve all errors (90% prevention)
- **52**: Agent spawn governance
- **53**: Subagent spawning prevention
- **54**: Concurrent agent limits
- **59**: Multi-agent coordination
- **60**: Regression analysis integration

**Example Invocations:**
```bash
# Coordinate complex feature implementation
@orchestrator implement user authentication system

# Multi-agent code review
@orchestrator coordinate comprehensive code review

# Resolve architectural conflicts
@orchestrator resolve design disagreements between services

# Enterprise refactoring
@orchestrator refactor monolith to microservices

# Complex debugging
@orchestrator debug production outage with multiple teams
```

**Integration Points:**
- **All 27 agents**: Coordinates multi-agent teams
- **TaskSkillRouter**: Manages agent routing
- **MCP Client**: Parallel tool execution
- **Enforcer**: Validates coordination against governance rules

**Dependencies:**
- All other agents (as subagents)
- Enforcer (for governance compliance)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `background_task`, `call_omo_agent`
- All skill invocation tools
- Session management tools

**Status**: ✅ Production Ready  
**Notes**: Only agent that can spawn multiple subagents for consensus

---

#### @bug-triage-specialist
**Version**: 1.9.0  
**Role**: Error investigation & fixes  
**Complexity Threshold**: Debug operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in debugging, error analysis, and root cause investigation. Triages bugs, identifies root causes, and implements fixes with minimal disruption.

**Capabilities:**
- Error log analysis and pattern detection
- Root cause investigation
- Stack trace analysis
- Memory leak detection
- Race condition identification
- Automated debugging strategies

**Codex Terms Integrated:**
- **5**: Surgical fixes where needed
- **7**: Resolve all errors (90% prevention)
- **12**: Early returns and guard clauses
- **13**: Error boundaries and graceful degradation
- **32**: Proper error handling

**Example Invocations:**
```bash
# Debug an error
@bug-triage-specialist investigate error in auth module

# Analyze stack trace
@bug-triage-specialist analyze this stack trace and find root cause

# Find memory leak
@bug-triage-specialist detect memory leak in data processing

# Fix race condition
@bug-triage-specialist identify and fix race condition in async code

# Debug production issue
@bug-triage-specialist debug why users can't login
```

**Integration Points:**
- **TaskSkillRouter**: Routes debugging tasks
- **Log Monitor**: Analyzes application logs
- **MCP Client**: Uses debugging tools
- **Enforcer**: Validates fixes against codex

**Dependencies:**
- Log Monitor MCP server
- Enforcer (for fix validation)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `ast_grep_*`
- `skill-code-review`, `skill-log-monitor`

**Status**: ✅ Production Ready

---

#### @code-reviewer
**Version**: 1.9.0  
**Role**: Quality assessment & standards  
**Complexity Threshold**: All code changes  
**Primary Pipeline**: Rule Enforcement

**Description**:  
Provides comprehensive code review services, assessing code quality, maintainability, and adherence to best practices. Integrates with enforcer for codex compliance.

**Capabilities:**
- Code quality assessment
- Best practice validation
- Maintainability scoring
- Security smell detection
- Performance issue identification
- Style guide compliance checking

**Codex Terms Integrated:**
- **1**: Progressive prod-ready code
- **2**: No patches/boiler/stubs
- **11**: Type safety first
- **14**: Immutability where possible
- **16**: DRY - Don't repeat yourself
- **18**: Meaningful naming
- **19**: Small, focused functions
- **20**: Consistent code style

**Example Invocations:**
```bash
# Review pull request
@code-reviewer review PR #123

# Review specific file
@code-reviewer review src/auth.ts

# Comprehensive review
@code-reviewer perform full code review

# Check style compliance
@code-reviewer check code style in src/components/

# Review API design
@code-reviewer review REST API design
```

**Integration Points:**
- **Enforcer**: Validates against codex rules
- **TaskSkillRouter**: Routes review requests
- **MCP Client**: Uses code-review skill server
- **Security Auditor**: Flags security issues

**Dependencies:**
- Enforcer (for codex validation)
- Security Auditor (for security review)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `lsp_diagnostics`
- `skill-code-review`, `skill-refactoring-strategies`

**Status**: ✅ Production Ready

---

#### @security-auditor
**Version**: 1.9.0  
**Role**: Vulnerability detection  
**Complexity Threshold**: Security operations  
**Primary Pipeline**: Security & Monitoring

**Description**:  
Performs comprehensive security audits, vulnerability scanning, and compliance validation. Identifies security risks and provides remediation guidance.

**Capabilities:**
- Vulnerability scanning (OWASP Top 10)
- Dependency security audit
- Secrets detection
- Compliance validation (PCI-DSS, GDPR, SOC2)
- Security best practice review
- Penetration testing guidance

**Codex Terms Integrated:**
- **29**: Security by design
- **32**: Proper error handling
- **38**: Functionality retention
- **43**: Deployment safety

**Example Invocations:**
```bash
# Full security audit
@security-auditor perform full security audit

# Scan for vulnerabilities
@security-auditor scan for vulnerabilities in dependencies

# Check for secrets
@security-auditor scan for exposed secrets in codebase

# Compliance check
@security-auditor validate GDPR compliance

# Review authentication
@security-auditor review authentication implementation
```

**Integration Points:**
- **Security Scan MCP Server**: Uses security scanning tools
- **Enforcer**: Validates security rules
- **TaskSkillRouter**: Routes security tasks
- **MCP Client**: Uses security-audit skill server

**Dependencies:**
- Security Scanner MCP server
- Enforcer (for security policy validation)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `grep_app_searchGitHub`
- `skill-security-audit`, `skill-security-scan`

**Status**: ✅ Production Ready  
**Notes**: Critical security findings block commits

---

#### @refactorer
**Version**: 1.9.0  
**Role**: Technical debt elimination  
**Complexity Threshold**: Refactor operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in code refactoring, technical debt elimination, and code modernization. Transforms legacy code into clean, maintainable implementations.

**Capabilities:**
- Code refactoring and modernization
- Technical debt elimination
- Design pattern implementation
- Code consolidation (DRY enforcement)
- Performance optimization refactoring
- Legacy code migration

**Codex Terms Integrated:**
- **5**: Surgical fixes where needed
- **16**: DRY - Don't repeat yourself
- **17**: YAGNI - You aren't gonna need it
- **25**: Code rot prevention
- **40**: Modular design

**Example Invocations:**
```bash
# Refactor legacy code
@refactorer refactor this legacy authentication module

# Eliminate technical debt
@refactorer eliminate technical debt in payment service

# Consolidate duplicate code
@refactorer find and consolidate duplicate code in src/

# Modernize codebase
@refactorer modernize JavaScript to TypeScript

# Extract common patterns
@refactorer extract common patterns into reusable utilities
```

**Integration Points:**
- **TaskSkillRouter**: Routes refactoring tasks
- **MCP Client**: Uses refactoring-strategies skill server
- **Enforcer**: Validates refactored code
- **Code Reviewer**: Reviews refactoring changes

**Dependencies:**
- Enforcer (for codex compliance)
- Code Reviewer (for quality validation)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `ast_grep_*`, `lsp_rename`
- `skill-refactoring-strategies`, `skill-code-review`

**Status**: ✅ Production Ready

---

#### @testing-lead
**Version**: 1.9.0  
**Role**: Testing strategy & coverage  
**Complexity Threshold**: Test operations  
**Primary Pipeline**: Rule Enforcement

**Description**:  
Designs comprehensive testing strategies, ensures test coverage targets are met, and implements automated testing solutions.

**Capabilities:**
- Test strategy design
- Test coverage analysis (>85% target)
- Unit test implementation
- Integration test planning
- E2E test strategy
- Test automation framework setup

**Codex Terms Integrated:**
- **26**: Test coverage >85%
- **27**: Fast feedback loops
- **38**: Functionality retention
- **45**: Test execution optimization
- **48**: Regression prevention

**Example Invocations:**
```bash
# Design test strategy
@testing-lead design test strategy for new feature

# Analyze coverage
@testing-lead analyze test coverage gaps

# Implement missing tests
@testing-lead implement tests for authentication module

# Set up test framework
@testing-lead set up Jest testing framework

# Plan integration tests
@testing-lead plan integration tests for microservices
```

**Integration Points:**
- **TaskSkillRouter**: Routes testing tasks
- **MCP Client**: Uses testing-strategy skill server
- **Enforcer**: Validates test compliance
- **Test Execution Processor**: Runs test suites

**Dependencies:**
- Test execution framework
- Enforcer (for coverage validation)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`, `run_terminal_cmd`
- `skill-testing-strategy`, `skill-testing-best-practices`

**Status**: ✅ Production Ready

---

#### @researcher
**Version**: 1.9.0  
**Role**: Codebase exploration & documentation  
**Complexity Threshold**: Analysis operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Explores and analyzes codebases, finds implementations, and creates comprehensive documentation. Works independently without conflict resolution needs.

**Capabilities:**
- Codebase exploration and analysis
- Implementation pattern discovery
- Documentation generation
- Architecture analysis
- Dependency mapping
- Code metric analysis

**Codex Terms Integrated:**
- **6**: Batched introspection cycles
- **10**: Single source of truth
- **34**: Documentation updates

**Example Invocations:**
```bash
# Explore codebase
@researcher explore codebase and find authentication implementation

# Analyze architecture
@researcher analyze the microservices architecture

# Generate documentation
@researcher generate API documentation

# Find implementation patterns
@researcher find all database connection patterns

# Map dependencies
@researcher create dependency graph of services
```

**Integration Points:**
- **TaskSkillRouter**: Routes research tasks
- **MCP Client**: Uses project-analysis skill server
- **Knowledge Skills**: Architecture patterns, refactoring strategies

**Dependencies:**
- Project analysis MCP servers
- Knowledge skill servers

**Tools Access:**
- `project-analysis_*`, `read`, `grep`, `lsp_*`
- `skill-project-analysis`, `skill-architecture-patterns`

**Status**: ✅ Production Ready  
**Notes**: Solo agent - no conflict resolution needed

---

### 3.2 Specialized Engineering Agents (9)

These agents specialize in specific engineering domains and technical areas.

---

#### @tech-writer
**Version**: 1.9.0  
**Role**: Technical documentation specialist  
**Complexity Threshold**: Documentation operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Creates comprehensive technical documentation including API docs, user guides, READMEs, and technical specifications. Ensures documentation is clear, accurate, and up-to-date.

**Capabilities:**
- API documentation generation
- User guide creation
- Technical specification writing
- Code documentation (inline comments, JSDoc)
- README and getting-started guides
- Process documentation

**Codex Terms Integrated:**
- **34**: Documentation updates
- **18**: Meaningful naming (applies to documentation)
- **20**: Consistent code style (documentation style)

**Example Invocations:**
```bash
# Write API documentation
@tech-writer write API documentation for REST endpoints

# Create user guide
@tech-writer create user guide for authentication system

# Document code
@tech-writer add JSDoc comments to utility functions

# Write README
@tech-writer write comprehensive README for the project

# Create technical spec
@tech-writer write technical specification for new feature
```

**Integration Points:**
- **MCP Client**: Uses documentation-generation skill server
- **Researcher**: Gathers codebase information
- **Enforcer**: Validates documentation standards

**Dependencies:**
- Researcher (for codebase analysis)
- Documentation generation MCP server

**Tools Access:**
- `read`, `grep`, `write`
- `skill-documentation-generation`

**Status**: ✅ Production Ready

---

#### @frontend-ui-ux-engineer
**Version**: 1.9.0  
**Role**: Frontend development and UI/UX implementation  
**Complexity Threshold**: Frontend operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in frontend development, UI implementation, and user experience design. Expert in React, TypeScript, and modern frontend frameworks.

**Capabilities:**
- React component development
- TypeScript frontend implementation
- UI/UX design implementation
- Accessibility (WCAG) compliance
- Responsive design implementation
- State management (Redux, Context, Zustand)

**Codex Terms Integrated:**
- **9**: Use shared global state where possible
- **13**: Error boundaries and graceful degradation
- **30**: Accessibility first
- **41**: State management patterns

**Example Invocations:**
```bash
# Build React component
@frontend-ui-ux-engineer create login form component with validation

# Implement design
@frontend-ui-ux-engineer implement responsive navigation from Figma

# Add accessibility
@frontend-ui-ux-engineer add ARIA labels and keyboard navigation

# Optimize state management
@frontend-ui-ux-engineer refactor to use Redux Toolkit

# Create dashboard
@frontend-ui-ux-engineer build admin dashboard with charts
```

**Integration Points:**
- **MCP Client**: Uses ui-ux-design skill server
- **Architect**: Reviews frontend architecture
- **Enforcer**: Validates accessibility and state management

**Dependencies:**
- Architect (for frontend architecture)
- UI/UX design skill server

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`
- `skill-ui-ux-design`

**Status**: ✅ Production Ready

---

#### @backend-engineer
**Version**: 1.9.0  
**Role**: Backend development specialist  
**Complexity Threshold**: Backend operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in backend development, API implementation, server-side logic, and service architecture. Expert in Node.js, Python, Go, and other backend technologies.

**Capabilities:**
- RESTful API development
- GraphQL API implementation
- Server-side business logic
- Authentication/authorization implementation
- Middleware development
- Microservices architecture

**Codex Terms Integrated:**
- **15**: Separation of concerns
- **21**: Dependency injection
- **29**: Security by design
- **32**: Proper error handling

**Example Invocations:**
```bash
# Build API endpoint
@backend-engineer create REST API for user management

# Implement middleware
@backend-engineer add authentication middleware

# Design service
@backend-engineer design payment processing service

# Add caching
@backend-engineer implement Redis caching layer

# Create webhook handler
@backend-engineer build webhook handler for Stripe events
```

**Integration Points:**
- **MCP Client**: Uses api-design skill server
- **Architect**: Reviews backend architecture
- **Security Auditor**: Validates security implementation

**Dependencies:**
- Architect (for service design)
- API designer (for endpoint design)

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`
- `skill-api-design`, `skill-backend-patterns`

**Status**: ✅ Production Ready

---

#### @database-engineer
**Version**: 1.9.0  
**Role**: Database design and optimization  
**Complexity Threshold**: Database operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in database design, query optimization, and data architecture. Expert in SQL, NoSQL, and database performance tuning.

**Capabilities:**
- Database schema design
- Query optimization
- Index design and optimization
- Migration strategy
- Data modeling
- Performance tuning

**Codex Terms Integrated:**
- **10**: Single source of truth
- **24**: Single responsibility principle
- **28**: Performance budget enforcement

**Example Invocations:**
```bash
# Design schema
@database-engineer design database schema for e-commerce

# Optimize query
@database-engineer optimize slow query in reports

# Add indexes
@database-engineer add indexes for user search queries

# Create migration
@database-engineer create migration for new orders table

# Review data model
@database-engineer review normalized data model
```

**Integration Points:**
- **MCP Client**: Uses database-design skill server
- **Architect**: Reviews data architecture
- **Performance Engineer**: Optimizes query performance

**Dependencies:**
- Architect (for data architecture)
- Database design skill server

**Tools Access:**
- `read`, `grep`, `bash`
- `skill-database-design`

**Status**: ✅ Production Ready

---

#### @devops-engineer
**Version**: 1.9.0  
**Role**: DevOps and infrastructure  
**Complexity Threshold**: Infrastructure operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in DevOps practices, CI/CD pipelines, infrastructure as code, and deployment automation. Expert in Docker, Kubernetes, Terraform, and cloud platforms.

**Capabilities:**
- CI/CD pipeline design
- Docker containerization
- Kubernetes orchestration
- Infrastructure as Code (Terraform, CloudFormation)
- Deployment automation
- Monitoring and observability setup

**Codex Terms Integrated:**
- **36**: Continuous integration
- **43**: Deployment safety
- **44**: Infrastructure as code validation

**Example Invocations:**
```bash
# Set up CI/CD
@devops-engineer set up GitHub Actions CI/CD pipeline

# Create Dockerfile
@devops-engineer create optimized Dockerfile for Node.js app

# Write Terraform
@devops-engineer write Terraform for AWS infrastructure

# Configure K8s
@devops-engineer create Kubernetes deployment manifests

# Set up monitoring
@devops-engineer configure Prometheus and Grafana monitoring
```

**Integration Points:**
- **MCP Client**: Uses devops-deployment skill server
- **Git Specialist**: Manages version control workflows
- **Security Auditor**: Validates infrastructure security

**Dependencies:**
- Git Specialist (for version control)
- DevOps deployment skill server

**Tools Access:**
- `read`, `grep`, `bash`
- `skill-devops-deployment`, `skill-git-workflow`

**Status**: ✅ Production Ready

---

#### @performance-engineer
**Version**: 1.9.0  
**Role**: Performance optimization  
**Complexity Threshold**: Performance operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in performance optimization, bottleneck identification, and scalability improvements. Ensures applications meet performance budgets and SLAs.

**Capabilities:**
- Performance bottleneck analysis
- Load testing and profiling
- Memory leak detection
- Bundle size optimization
- Database query optimization
- Caching strategy implementation

**Codex Terms Integrated:**
- **28**: Performance budget enforcement
- **27**: Fast feedback loops
- **48**: Regression prevention

**Example Invocations:**
```bash
# Analyze performance
@performance-engineer analyze API response times

# Optimize bundle
@performance-engineer optimize JavaScript bundle size

# Find bottlenecks
@performance-engineer find performance bottlenecks in checkout flow

# Load test
@performance-engineer create load tests for Black Friday traffic

# Profile memory
@performance-engineer profile memory usage in data processing
```

**Integration Points:**
- **MCP Client**: Uses performance-optimization skill server
- **Database Engineer**: Optimizes query performance
- **Refactorer**: Implements performance improvements

**Dependencies:**
- Performance analysis MCP servers
- Refactorer (for implementation)

**Tools Access:**
- `read`, `grep`, `bash`, `run_terminal_cmd`
- `skill-performance-optimization`

**Status**: ✅ Production Ready

---

#### @security-specialist
**Version**: 1.9.0  
**Role**: Advanced security operations  
**Complexity Threshold**: Security operations  
**Primary Pipeline**: Security & Monitoring

**Description**:  
Advanced security specialist focusing on threat modeling, secure architecture design, and security hardening beyond basic vulnerability scanning.

**Capabilities:**
- Threat modeling
- Secure architecture design
- Security hardening
- Penetration testing guidance
- Security policy development
- Incident response planning

**Codex Terms Integrated:**
- **29**: Security by design
- **43**: Deployment safety
- **44**: Infrastructure as code validation

**Example Invocations:**
```bash
# Threat model
@security-specialist create threat model for payment system

# Design secure architecture
@security-specialist design zero-trust architecture

# Harden system
@security-specialist harden Kubernetes cluster security

# Review security policy
@security-specialist review and improve security policies

# Plan incident response
@security-specialist create incident response plan
```

**Integration Points:**
- **Security Auditor**: Basic vulnerability scanning
- **MCP Client**: Uses security-scan skill server
- **Architect**: Reviews secure architecture

**Dependencies:**
- Security Auditor (for baseline scanning)
- Security scan MCP servers

**Tools Access:**
- `read`, `grep`, `bash`
- `skill-security-audit`, `skill-security-scan`

**Status**: ✅ Production Ready

---

#### @api-designer
**Version**: 1.9.0  
**Role**: RESTful API design and validation  
**Complexity Threshold**: API operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in API design, RESTful principles, GraphQL schema design, and API documentation. Ensures APIs are intuitive, consistent, and well-documented.

**Capabilities:**
- RESTful API design
- GraphQL schema design
- OpenAPI/Swagger specification
- API versioning strategy
- Rate limiting design
- API documentation

**Codex Terms Integrated:**
- **22**: Interface segregation
- **34**: Documentation updates
- **4**: Fit for purpose and prod-level code

**Example Invocations:**
```bash
# Design REST API
@api-designer design REST API for inventory management

# Create OpenAPI spec
@api-designer create OpenAPI specification for existing API

# Design GraphQL schema
@api-designer design GraphQL schema for social network

# Review API design
@api-designer review API design for consistency

# Plan API versioning
@api-designer create API versioning strategy
```

**Integration Points:**
- **MCP Client**: Uses api-design skill server
- **Backend Engineer**: Implements API endpoints
- **Tech Writer**: Creates API documentation

**Dependencies:**
- Backend Engineer (for implementation)
- API design skill server

**Tools Access:**
- `read`, `grep`, `write`
- `skill-api-design`

**Status**: ✅ Production Ready

---

#### @mobile-developer
**Version**: 1.9.0  
**Role**: Mobile application development  
**Complexity Threshold**: Mobile operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in mobile application development for iOS and Android using React Native, Flutter, or native technologies.

**Capabilities:**
- React Native app development
- Flutter app development
- Mobile UI/UX implementation
- Mobile state management
- Push notification implementation
- Mobile API integration

**Codex Terms Integrated:**
- **28**: Performance budget enforcement
- **30**: Accessibility first
- **41**: State management patterns

**Example Invocations:**
```bash
# Build mobile screen
@mobile-developer create login screen in React Native

# Implement navigation
@mobile-developer set up React Navigation

# Add push notifications
@mobile-developer implement push notifications with Firebase

# Optimize performance
@mobile-developer optimize app startup time

# Create offline support
@mobile-developer implement offline data synchronization
```

**Integration Points:**
- **MCP Client**: Uses mobile development patterns
- **Frontend UI/UX Engineer**: Shared UI patterns
- **Backend Engineer**: API integration

**Dependencies:**
- Frontend UI/UX Engineer (for UI patterns)
- Mobile development skill resources

**Tools Access:**
- `read`, `grep`, `lsp_*`, `bash`

**Status**: ✅ Production Ready

---

### 3.3 Strategy & Content Agents (9)

These agents focus on strategic planning, content creation, and specialized analysis.

---

#### @storyteller
**Version**: 1.9.0  
**Role**: Narrative deep reflections  
**Complexity Threshold**: Documentation operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Creates narrative-style deep reflections, technical sagas, and journey documents. Captures the human/AI experience of development with emotional resonance and philosophical depth.

**Story Types:**
- **Reflection**: Technical deep reflections on development process
- **Saga**: Long-form technical saga spanning multiple sessions
- **Journey**: Investigation/learning journey
- **Narrative**: Technical narrative - telling the story of code

**Capabilities:**
- Technical deep reflections
- Development journey documentation
- Narrative-style incident reports
- Philosophical exploration of technical decisions
- Institutional knowledge preservation

**Codex Terms Integrated:**
- **34**: Documentation updates
- **6**: Batched introspection cycles

**Example Invocations:**
```bash
# Write reflection
@storyteller write a reflection about fixing the memory leak

# Create saga
@storyteller write a saga about the microservices migration

# Document journey
@storyteller write a journey about learning GraphQL

# Tell code story
@storyteller write a narrative about the authentication system evolution
```

**Integration Points:**
- **Researcher**: Gathers technical details
- **Tech Writer**: Collaborates on documentation

**Dependencies:**
- Researcher (for technical context)

**Tools Access:**
- `read`, `write`

**Status**: ✅ Production Ready

---

#### @strategist
**Version**: 1.9.0  
**Role**: Strategic planning and decision making  
**Complexity Threshold**: Strategy operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Provides strategic guidance, roadmap planning, and decision-making support for technical initiatives and product direction.

**Capabilities:**
- Technical roadmap planning
- Strategic decision analysis
- Risk assessment
- Resource allocation guidance
- Technology stack evaluation
- Migration planning

**Codex Terms Integrated:**
- **4**: Fit for purpose and prod-level code
- **17**: YAGNI - You aren't gonna need it

**Example Invocations:**
```bash
# Plan roadmap
@strategist create 6-month technical roadmap

# Evaluate technology
@strategist evaluate migration from REST to GraphQL

# Assess risks
@strategist assess risks of microservices migration

# Make decision
@strategist help decide between monolith and microservices

# Plan resources
@strategist plan team allocation for Q3 initiatives
```

**Integration Points:**
- **Architect**: Technical feasibility
- **Researcher**: Market research

**Dependencies:**
- Architect (for technical feasibility)

**Tools Access:**
- `read`, `grep`, `webfetch`

**Status**: ✅ Production Ready

---

#### @growth-strategist
**Version**: 1.9.0  
**Role**: Growth and expansion planning  
**Complexity Threshold**: Growth operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Focuses on growth strategies, scaling systems, and expansion planning. Helps teams prepare for increased load and user growth.

**Capabilities:**
- Scalability planning
- Growth infrastructure design
- Performance at scale analysis
- Capacity planning
- Scaling strategy development

**Codex Terms Integrated:**
- **28**: Performance budget enforcement
- **48**: Regression prevention

**Example Invocations:**
```bash
# Plan for growth
@growth-strategist plan infrastructure for 10x user growth

# Scale system
@growth-strategist design scaling strategy for Black Friday

# Capacity plan
@growth-strategist create capacity plan for next year

# Optimize for scale
@growth-strategist optimize database for high traffic
```

**Integration Points:**
- **Performance Engineer**: Technical scaling
- **DevOps Engineer**: Infrastructure scaling

**Dependencies:**
- Performance Engineer
- DevOps Engineer

**Tools Access:**
- `read`, `grep`, `bash`

**Status**: ✅ Production Ready

---

#### @seo-consultant
**Version**: 1.9.0  
**Role**: SEO optimization and strategy  
**Complexity Threshold**: SEO operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in search engine optimization, content strategy for SEO, and technical SEO implementation.

**Capabilities:**
- Technical SEO audit
- Content optimization for search
- Schema markup implementation
- Performance optimization for SEO
- Keyword strategy

**Codex Terms Integrated:**
- **28**: Performance budget enforcement
- **30**: Accessibility first (SEO benefits)

**Example Invocations:**
```bash
# SEO audit
@seo-consultant perform technical SEO audit

# Optimize content
@seo-consultant optimize blog posts for target keywords

# Implement schema
@seo-consultant add JSON-LD schema markup

# Improve performance
@seo-consultant optimize Core Web Vitals
```

**Integration Points:**
- **Frontend UI/UX Engineer**: Technical implementation
- **Content Creator**: Content optimization

**Dependencies:**
- Frontend UI/UX Engineer (for implementation)

**Tools Access:**
- `read`, `grep`, `webfetch`

**Status**: ✅ Production Ready

---

#### @content-creator
**Version**: 1.9.0  
**Role**: Content creation and management  
**Complexity Threshold**: Content operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Creates various types of content including blog posts, documentation, tutorials, and marketing materials.

**Capabilities:**
- Technical blog posts
- Tutorial creation
- Documentation writing
- Marketing content
- Video scripts

**Codex Terms Integrated:**
- **34**: Documentation updates
- **18**: Meaningful naming (clear writing)

**Example Invocations:**
```bash
# Write blog post
@content-creator write blog post about new feature

# Create tutorial
@content-creator create step-by-step tutorial for API

# Write docs
@content-creator write getting started guide

# Create marketing content
@content-creator write product announcement
```

**Integration Points:**
- **Tech Writer**: Technical documentation
- **Storyteller**: Narrative content

**Dependencies:**
- Tech Writer (for technical accuracy)

**Tools Access:**
- `read`, `write`, `webfetch`

**Status**: ✅ Production Ready

---

#### @multimodal-looker
**Version**: 1.9.0  
**Role**: Visual content analysis  
**Complexity Threshold**: Visual analysis operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Analyzes visual content including diagrams, screenshots, UI mockups, and other media files for technical content and insights.

**Capabilities:**
- Diagram analysis and interpretation
- Screenshot analysis
- UI/UX mockup review
- Technical diagram understanding
- Visual pattern recognition

**Codex Terms Integrated:**
- **4**: Fit for purpose and prod-level code
- **34**: Documentation updates (for visual docs)

**Example Invocations:**
```bash
# Analyze diagram
@multimodal-looker analyze this architecture diagram

# Review UI mockup
@multimodal-looker review these UI mockups for usability

# Interpret screenshot
@multimodal-looker analyze this error screenshot

# Check accessibility
@multimodal-looker check color contrast in design mockups
```

**Integration Points:**
- **Frontend UI/UX Engineer**: UI implementation
- **Architect**: Architecture diagrams

**Dependencies:**
- Image analysis capabilities

**Tools Access:**
- `read` (for image files)

**Status**: ✅ Production Ready

---

#### @log-monitor
**Version**: 1.9.0  
**Role**: Log analysis and monitoring  
**Complexity Threshold**: Monitoring operations  
**Primary Pipeline**: Security & Monitoring

**Description**:  
Specializes in log analysis, pattern detection, and monitoring system setup. Identifies issues through log analysis and creates alerting rules.

**Capabilities:**
- Log pattern analysis
- Anomaly detection
- Alert rule creation
- Log aggregation setup
- Error trend analysis
- Monitoring dashboard creation

**Codex Terms Integrated:**
- **7**: Resolve all errors (90% prevention)
- **32**: Proper error handling
- **33**: Logging and monitoring

**Example Invocations:**
```bash
# Analyze logs
@log-monitor analyze error logs for patterns

# Set up monitoring
@log-monitor create alerts for 500 errors

# Find anomalies
@log-monitor detect anomalies in application logs

# Create dashboard
@log-monitor set up Grafana dashboard for logs
```

**Integration Points:**
- **Bug Triage Specialist**: Error investigation
- **DevOps Engineer**: Monitoring infrastructure

**Dependencies:**
- Bug Triage Specialist (for error investigation)
- Monitoring tools access

**Tools Access:**
- `read`, `grep`, `bash`
- Log analysis tools

**Status**: ✅ Production Ready

---

#### @test-architect
**Version**: 1.9.0  
**Role**: Test architecture and strategy  
**Complexity Threshold**: Test architecture operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Focuses on high-level test architecture, testing frameworks, and comprehensive testing strategies beyond individual test implementation.

**Capabilities:**
- Test framework architecture
- Testing pyramid design
- Test data management strategy
- Mock/stub architecture
- CI/CD test integration
- Test environment design

**Codex Terms Integrated:**
- **26**: Test coverage >85%
- **36**: Continuous integration
- **45**: Test execution optimization

**Example Invocations:**
```bash
# Design test architecture
@test-architect design test architecture for microservices

# Set up framework
@test-architect set up testing framework with mocks

# Plan test data
@test-architect design test data management strategy

# Integrate CI/CD
@test-architect integrate tests into CI/CD pipeline
```

**Integration Points:**
- **Testing Lead**: Test implementation
- **DevOps Engineer**: CI/CD integration

**Dependencies:**
- Testing Lead (for test implementation)
- DevOps Engineer (for CI/CD)

**Tools Access:**
- `read`, `grep`, `bash`
- `skill-testing-strategy`, `skill-testing-best-practices`

**Status**: ✅ Production Ready

---

#### @git-specialist
**Version**: 1.9.0  
**Role**: Git workflow and version control  
**Complexity Threshold**: Version control operations  
**Primary Pipeline**: Agent Delegation

**Description**:  
Specializes in Git workflows, branching strategies, and version control best practices. Helps teams optimize their Git usage and resolve Git-related issues.

**Capabilities:**
- Git workflow design
- Branching strategy implementation
- Merge conflict resolution
- Git history optimization
- Repository organization
- Git hook implementation

**Codex Terms Integrated:**
- **35**: Version control best practices
- **42**: Code review standards

**Example Invocations:**
```bash
# Design workflow
@git-specialist design Git workflow for team

# Resolve conflicts
@git-specialist help resolve merge conflicts

# Optimize history
@git-specialist clean up Git history before merge

# Set up hooks
@git-specialist set up pre-commit hooks

# Organize repo
@git-specialist reorganize monorepo structure
```

**Integration Points:**
- **DevOps Engineer**: CI/CD integration
- **Enforcer**: Pre-commit validation

**Dependencies:**
- DevOps Engineer (for CI/CD)

**Tools Access:**
- `read`, `grep`, `bash`
- `skill-git-workflow`

**Status**: ✅ Production Ready

---

## Agent Summary Matrix

| # | Agent | Role | Complexity | Pipeline | Tools |
|---|-------|------|------------|----------|-------|
| 1 | @enforcer | Codex compliance | All | Rule Enforcement | All validation tools |
| 2 | @architect | System design | >25 | Agent Delegation | Design tools |
| 3 | @orchestrator | Multi-agent coord | >95 | Agent Delegation | call_omo_agent |
| 4 | @bug-triage-specialist | Error investigation | Debug | Agent Delegation | ast_grep_* |
| 5 | @code-reviewer | Quality assessment | All changes | Rule Enforcement | lsp_diagnostics |
| 6 | @security-auditor | Vulnerability detection | Security | Security | grep_app_searchGitHub |
| 7 | @refactorer | Technical debt | Refactor | Agent Delegation | ast_grep_*, rename |
| 8 | @testing-lead | Testing strategy | Test ops | Rule Enforcement | run_terminal_cmd |
| 9 | @researcher | Codebase exploration | Analysis | Agent Delegation | project-analysis_* |
| 10 | @tech-writer | Technical docs | Documentation | Agent Delegation | write |
| 11 | @frontend-ui-ux-engineer | Frontend dev | Frontend | Agent Delegation | lsp_*, bash |
| 12 | @backend-engineer | Backend dev | Backend | Agent Delegation | bash |
| 13 | @database-engineer | Database design | Database | Agent Delegation | bash |
| 14 | @devops-engineer | DevOps | Infrastructure | Agent Delegation | bash |
| 15 | @performance-engineer | Performance | Performance | Agent Delegation | profiling |
| 16 | @security-specialist | Advanced security | Security | Security | security tools |
| 17 | @api-designer | API design | API | Agent Delegation | write |
| 18 | @mobile-developer | Mobile dev | Mobile | Agent Delegation | lsp_* |
| 19 | @storyteller | Narrative docs | Documentation | Agent Delegation | write |
| 20 | @strategist | Strategic planning | Strategy | Agent Delegation | webfetch |
| 21 | @growth-strategist | Growth planning | Growth | Agent Delegation | analysis |
| 22 | @seo-consultant | SEO optimization | SEO | Agent Delegation | webfetch |
| 23 | @content-creator | Content creation | Content | Agent Delegation | write |
| 24 | @multimodal-looker | Visual analysis | Visual | Agent Delegation | read (images) |
| 25 | @log-monitor | Log analysis | Monitoring | Security | grep |
| 26 | @test-architect | Test architecture | Test arch | Agent Delegation | bash |
| 27 | @git-specialist | Version control | Git | Agent Delegation | bash |

---

## 4. Architecture Deep Dive

### 4.1 RuleEnforcer Module System

The **RuleEnforcer** has been transformed from a 2,714-line monolith into a 416-line facade with 6 focused modules.

#### Module Structure

```
src/enforcement/
├── rule-enforcer.ts          # 416-line facade (public API)
├── modules/
│   ├── registry.ts           # Rule registration and lookup
│   ├── executor.ts           # Rule execution engine
│   ├── hierarchy.ts          # Rule inheritance and override
│   ├── fixer.ts              # Automated violation fixes
│   ├── loaders.ts            # Configuration loading from multiple sources
│   └── validators.ts         # Input/output validation
└── types/
    ├── rule-types.ts         # Rule type definitions
    └── validation-types.ts   # Validation result types
```

#### Module Responsibilities

**Registry Module (`registry.ts`)**
- Maintains rule registry with 60+ codex terms
- Provides rule lookup by ID, category, or term number
- Manages rule metadata and descriptions
- Implements rule caching for performance

```typescript
// Registry interface
interface IRuleRegistry {
  register(rule: Rule): void;
  get(id: string): Rule | undefined;
  getByCategory(category: string): Rule[];
  getByTermNumber(number: number): Rule | undefined;
  getAll(): Rule[];
}
```

**Executor Module (`executor.ts`)**
- Executes validation rules against code/context
- Handles rule dependencies and ordering
- Manages execution timeouts
- Provides execution results with violations

```typescript
// Executor interface
interface IRuleExecutor {
  execute(rule: Rule, context: ValidationContext): Promise<ExecutionResult>;
  executeAll(rules: Rule[], context: ValidationContext): Promise<ExecutionResult[]>;
  executeByCategory(category: string, context: ValidationContext): Promise<ExecutionResult[]>;
}
```

**Hierarchy Module (`hierarchy.ts`)**
- Manages rule inheritance chains
- Handles rule overrides and extensions
- Resolves rule conflicts
- Implements rule composition

**Fixer Module (`fixer.ts`)**
- Automatically fixes common violations
- Provides fix suggestions for manual resolution
- Tracks fix success rates
- Integrates with specialized agents for complex fixes

**Loaders Module (`loaders.ts`)**
- Loads rules from `.opencode/strray/codex.json`
- Supports multiple configuration sources
- Handles hot-reloading of rules
- Validates rule definitions

**Validators Module (`validators.ts`)**
- Validates rule definitions
- Validates execution inputs/outputs
- Provides schema validation
- Ensures type safety

#### Facade API

The facade provides a simplified interface:

```typescript
class RuleEnforcer {
  // Core validation
  validate(context: ValidationContext): Promise<ValidationResult>;
  validateByTerm(termNumber: number, context: ValidationContext): Promise<ValidationResult>;
  validateByCategory(category: string, context: ValidationContext): Promise<ValidationResult>;
  
  // Rule management
  getRule(id: string): Rule | undefined;
  getAllRules(): Rule[];
  reloadRules(): Promise<void>;
  
  // Fix operations
  fixViolations(violations: Violation[]): Promise<FixResult[]>;
  suggestFixes(violations: Violation[]): FixSuggestion[];
}
```

### 4.2 TaskSkillRouter Module System

The **TaskSkillRouter** has been transformed from a 1,933-line monolith into a 490-line facade with 12 mapping modules.

#### Module Structure

```
src/routing/
├── task-skill-router.ts      # 490-line facade (public API)
├── modules/
│   ├── config.ts             # Route configuration management
│   ├── analytics.ts          # Usage pattern analysis
│   ├── routing.ts            # Intelligent task distribution
│   ├── mapping/
│   │   ├── agent-mapping.ts      # Agent-to-task mappings
│   │   ├── skill-mapping.ts      # Skill-to-agent mappings
│   │   ├── complexity-mapping.ts # Complexity-to-strategy mappings
│   │   ├── rule-mapping.ts       # Rule-to-agent mappings
│   │   ├── tool-mapping.ts       # Tool-to-agent mappings
│   │   └── pipeline-mapping.ts   # Pipeline-to-processor mappings
│   └── optimization/
│       ├── load-balancer.ts      # Agent load balancing
│       ├── cache-manager.ts      # Route caching
│       └── performance-monitor.ts # Routing performance
└── types/
    ├── route-types.ts        # Routing type definitions
    └── mapping-types.ts      # Mapping type definitions
```

#### Module Responsibilities

**Config Module (`config.ts`)**
- Manages routing configuration
- Supports environment-specific routes
- Handles configuration validation
- Implements hot-reloading

**Analytics Module (`analytics.ts`)**
- Tracks routing patterns
- Analyzes agent utilization
- Measures routing performance
- Generates routing reports

**Routing Module (`routing.ts`)**
- Executes intelligent task routing
- Implements routing algorithms
- Handles routing errors
- Provides fallback strategies

**Mapping Modules (`mapping/*.ts`)**
- Define mappings between different domains:
  - Agents to tasks they can handle
  - Skills to agents that provide them
  - Complexity scores to routing strategies
  - Rules to agents for violation fixes
  - Tools to agents with access permissions
  - Pipelines to processors for execution

#### Facade API

```typescript
class TaskSkillRouter {
  // Task routing
  routeTask(task: Task): Promise<RouteResult>;
  routeToAgent(task: Task, agentType: string): Promise<RouteResult>;
  routeByComplexity(task: Task, complexity: number): Promise<RouteResult>;
  
  // Skill management
  getSkillProviders(skillName: string): string[];
  invokeSkill(skillName: string, args: unknown): Promise<unknown>;
  
  // Configuration
  configure(config: RouterConfig): void;
  getConfiguration(): RouterConfig;
}
```

### 4.3 MCP Client Module System

The **MCP Client** has been transformed from a 1,413-line monolith into a 312-line facade with 8 specialized modules.

#### Module Structure

```
src/mcp/
├── mcp-client.ts             # 312-line facade (public API)
├── modules/
│   ├── types.ts              # TypeScript interfaces and types
│   ├── config.ts             # Connection configuration
│   ├── connection.ts         # Server connection management
│   ├── tools.ts              # Tool discovery and invocation
│   ├── simulation.ts         # Testing and development support
│   ├── health.ts             # Connection health monitoring
│   ├── pool.ts               # Connection pooling
│   └── discovery.ts          # Server discovery
└── types/
    ├── mcp-types.ts          # MCP protocol types
    └── client-types.ts       # Client-specific types
```

#### Module Responsibilities

**Types Module (`types.ts`)**
- Defines TypeScript interfaces for MCP protocol
- Provides type guards and validators
- Ensures type safety across client

**Config Module (`config.ts`)**
- Manages MCP server configurations
- Loads configuration from `.mcp.json`
- Validates server configurations
- Supports multiple environment configs

**Connection Module (`connection.ts`)**
- Manages server connections
- Handles connection lifecycle
- Implements reconnection logic
- Provides connection pooling

**Tools Module (`tools.ts`)**
- Discovers available tools from servers
- Invokes tools with proper error handling
- Caches tool definitions
- Manages tool permissions

**Simulation Module (`simulation.ts`)**
- Provides mock MCP servers for testing
- Simulates tool responses
- Enables offline development
- Supports test fixtures

**Health Module (`health.ts`)**
- Monitors connection health
- Detects server failures
- Triggers reconnections
- Reports health metrics

**Pool Module (`pool.ts`)**
- Manages connection pools
- Implements connection reuse
- Handles pool sizing
- Provides load balancing

**Discovery Module (`discovery.ts`)**
- Discovers available MCP servers
- Scans for new servers
- Registers discovered servers
- Maintains server registry

#### Facade API

```typescript
class MCPClient {
  // Connection management
  connect(serverName: string): Promise<Connection>;
  disconnect(serverName: string): Promise<void>;
  isConnected(serverName: string): boolean;
  
  // Tool operations
  discoverTools(serverName: string): Promise<Tool[]>;
  callTool(serverName: string, toolName: string, args: unknown): Promise<ToolResult>;
  
  // Server management
  registerServer(config: ServerConfig): void;
  unregisterServer(serverName: string): void;
  listServers(): string[];
  
  // Health monitoring
  checkHealth(serverName: string): Promise<HealthStatus>;
  getConnectionStatus(): Map<string, ConnectionStatus>;
}
```

---

## 5. Technical Reference

### 5.1 Internal APIs

#### RuleEnforcer Facade API

```typescript
// Validation
async validate(context: ValidationContext): Promise<ValidationResult>
async validateByTerm(termNumber: number, context: ValidationContext): Promise<ValidationResult>
async validateByCategory(category: string, context: ValidationContext): Promise<ValidationResult>
async validateOperation(operation: string, context: ValidationContext): Promise<ValidationResult>

// Rule Management
getRule(id: string): Rule | undefined
getRulesByCategory(category: string): Rule[]
getAllRules(): Rule[]
reloadRules(): Promise<void>

// Fix Operations
async fixViolations(violations: Violation[]): Promise<FixResult[]>
suggestFixes(violations: Violation[]): FixSuggestion[]

// Configuration
configure(config: EnforcerConfig): void
getConfiguration(): EnforcerConfig
```

#### TaskSkillRouter Facade API

```typescript
// Task Routing
async routeTask(task: Task): Promise<RouteResult>
async routeToAgent(task: Task, agentType: string): Promise<RouteResult>
async routeByComplexity(task: Task, complexity: number): Promise<RouteResult>

// Skill Management
getSkillProviders(skillName: string): string[]
async invokeSkill(skillName: string, args: unknown): Promise<unknown>
getAvailableSkills(): string[]

// Agent Management
registerAgent(agentType: string, capabilities: Capability[]): void
getAgentCapabilities(agentType: string): Capability[]

// Analytics
getRoutingStats(): RoutingStats
getAgentUtilization(): Map<string, number>
```

#### MCP Client Facade API

```typescript
// Connection Management
async connect(serverName: string): Promise<Connection>
async disconnect(serverName: string): Promise<void>
isConnected(serverName: string): boolean

// Tool Operations
async discoverTools(serverName: string): Promise<Tool[]>
async callTool(serverName: string, toolName: string, args: unknown): Promise<ToolResult>
async callServerTool(serverName: string, toolName: string, args: unknown): Promise<ToolResult>

// Server Management
registerServer(config: ServerConfig): void
unregisterServer(serverName: string): void
listServers(): string[]
getServerConfig(serverName: string): ServerConfig | undefined

// Health & Monitoring
async checkHealth(serverName: string): Promise<HealthStatus>
getConnectionStatus(): Map<string, ConnectionStatus>
```

#### Module Interfaces

```typescript
// Base Module Interface
interface IModule {
  initialize(config: ModuleConfig): Promise<void>
  shutdown(): Promise<void>
  getStatus(): ModuleStatus
  getName(): string
}

// Rule Module Interface
interface IRuleModule extends IModule {
  validate(input: unknown, context: ValidationContext): Promise<ValidationResult>
  getRules(): Rule[]
}

// Routing Module Interface
interface IRoutingModule extends IModule {
  route(task: Task): Promise<RouteResult>
  getCapabilities(): Capability[]
}

// MCP Module Interface
interface IMCPModule extends IModule {
  connect(): Promise<Connection>
  disconnect(): Promise<void>
  isHealthy(): boolean
}
```

### 5.2 Configuration Reference

#### `.opencode/strray/config.json`

```json
{
  "framework": {
    "version": "1.10.0",
    "mode": "production",
    "logging": {
      "level": "info",
      "jobIdTracking": true,
      "activityLogPath": "logs/framework/activity.log",
      "maxLogSize": "100MB",
      "retentionDays": 30
    }
  },
  "codex": {
    "enabled": true,
    "termCount": 60,
    "enforcement": "strict",
    "autoFix": true,
    "violationThreshold": "blocking"
  },
  "performance": {
    "bundleSizeLimit": "2MB",
    "responseTimeTarget": "5s",
    "errorPreventionTarget": "99.6%",
    "maxConcurrentAgents": 8,
    "timeoutSeconds": 300
  },
  "routing": {
    "complexityThresholds": {
      "singleAgent": 25,
      "multiAgent": 95
    },
    "loadBalancing": "round-robin",
    "cacheEnabled": true,
    "cacheTTL": 3600
  },
  "modules": {
    "ruleEnforcer": {
      "registryCacheSize": 1000,
      "executionTimeout": 5000,
      "autoReload": true
    },
    "taskSkillRouter": {
      "analyticsEnabled": true,
      "routeCacheEnabled": true,
      "fallbackEnabled": true
    },
    "mcpClient": {
      "connectionPoolSize": 10,
      "healthCheckInterval": 30000,
      "reconnectAttempts": 3
    }
  }
}
```

#### `.opencode/opencode.json`

```json
{
  "model_routing": {
    "enforcer": "openrouter/xai-grok-2-1212-fast-1",
    "architect": "openrouter/xai-grok-2-1212-fast-1",
    "orchestrator": "openrouter/xai-grok-2-1212-fast-1",
    "bug-triage-specialist": "openrouter/xai-grok-2-1212-fast-1",
    "code-reviewer": "openrouter/xai-grok-2-1212-fast-1",
    "security-auditor": "openrouter/xai-grok-2-1212-fast-1",
    "refactorer": "openrouter/xai-grok-2-1212-fast-1",
    "testing-lead": "openrouter/xai-grok-2-1212-fast-1",
    "researcher": "openrouter/xai-grok-2-1212-fast-1"
  },
  "framework": {
    "version": "1.10.0",
    "codexEnforcement": true,
    "jobIdLogging": true,
    "consoleLogRule": true
  },
  "pipelines": {
    "maxConcurrentAgents": 8,
    "complexityThresholds": {
      "singleAgent": 25,
      "multiAgent": 95
    }
  }
}
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STRRAY_MODE` | `production` | Framework mode: `development` or `production` |
| `STRRAY_LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `STRRAY_NO_TELEMETRY` | `false` | Disable analytics and telemetry |
| `STRRAY_MAX_AGENTS` | `8` | Maximum concurrent agents |
| `STRRAY_CODEX_STRICT` | `true` | Enable strict codex enforcement |
| `STRRAY_MCP_TIMEOUT` | `30000` | MCP server timeout in milliseconds |

#### Feature Flags

```json
{
  "features": {
    "token_optimization": {
      "enabled": true,
      "max_context_tokens": 8000
    },
    "agent_spawn": {
      "enabled": true,
      "max_concurrent": 8,
      "max_per_type": 3
    },
    "complexity_analysis": {
      "enabled": true,
      "cache_results": true
    },
    "auto_fix": {
      "enabled": true,
      "confidence_threshold": 0.8
    },
    "reporting": {
      "enabled": true,
      "complexity_threshold": 100
    }
  }
}
```

### 5.3 Advanced Usage Patterns

#### Custom Agent Creation

```typescript
// Create custom agent
// File: .opencode/agents/my-custom-agent.ts

import { Agent, AgentConfig, AgentContext } from 'strray-ai';

export class MyCustomAgent extends Agent {
  constructor(config: AgentConfig) {
    super({
      name: 'my-custom-agent',
      description: 'My custom agent description',
      capabilities: ['custom-task'],
      ...config
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Custom agent logic
    const result = await this.performCustomTask(context);
    
    return {
      success: true,
      data: result,
      metadata: {
        executionTime: Date.now() - context.startTime
      }
    };
  }

  private async performCustomTask(context: AgentContext): Promise<unknown> {
    // Implementation
    return {};
  }
}

// Register agent
export default MyCustomAgent;
```

#### Custom Rule Creation

```typescript
// Create custom rule
// File: .opencode/strray/custom-rules.ts

import { Rule, RuleContext, RuleResult } from 'strray-ai';

export const customRule: Rule = {
  id: 'custom-rule-id',
  name: 'My Custom Rule',
  description: 'Description of what this rule checks',
  category: 'custom',
  severity: 'error',
  
  async validate(context: RuleContext): Promise<RuleResult> {
    const violations = [];
    
    // Custom validation logic
    if (context.code.includes('forbidden-pattern')) {
      violations.push({
        message: 'Forbidden pattern detected',
        line: context.lineNumber,
        column: context.columnNumber,
        severity: 'error'
      });
    }
    
    return {
      valid: violations.length === 0,
      violations
    };
  },
  
  async fix(violation: Violation): Promise<FixResult> {
    // Auto-fix logic
    return {
      fixed: true,
      changes: [
        {
          location: violation.location,
          replacement: 'fixed-code'
        }
      ]
    };
  }
};
```

#### Direct Module Usage (Bypassing Facades)

```typescript
// Access modules directly for advanced use cases
import { 
  RuleRegistry, 
  RuleExecutor,
  TaskRouter,
  MCPConnection 
} from 'strray-ai/modules';

// Direct registry access
const registry = new RuleRegistry();
const rules = registry.getByCategory('security');

// Direct executor access
const executor = new RuleExecutor(registry);
const result = await executor.execute(rules[0], context);

// Direct routing
const router = new TaskRouter();
const route = await router.route(task);

// Direct MCP connection
const connection = new MCPConnection(serverConfig);
await connection.connect();
const tools = await connection.discoverTools();
```

#### Creating Custom Processors

```typescript
// Custom processor for pipeline
// File: src/processors/custom-processor.ts

import { Processor, ProcessorContext, ProcessorResult } from 'strray-ai';

export class CustomProcessor implements Processor {
  name = 'custom-processor';
  priority = 50; // Execution order

  async execute(context: ProcessorContext): Promise<ProcessorResult> {
    // Pre-processing or post-processing logic
    const modifiedContext = await this.transform(context);
    
    return {
      success: true,
      context: modifiedContext,
      metadata: {
        processor: this.name,
        timestamp: new Date().toISOString()
      }
    };
  }

  private async transform(context: ProcessorContext): Promise<ProcessorContext> {
    // Transformation logic
    return context;
  }
}

// Register processor
import { ProcessorManager } from 'strray-ai';
const manager = new ProcessorManager();
manager.register(new CustomProcessor());
```

---

## 6. Examples & Usage Patterns

### 6.1 Simple: Single Agent Invocation

```bash
# Direct agent invocation for simple tasks
@enforcer check for console.log in src/

# Review single file
@code-reviewer review src/auth.ts

# Quick security scan
@security-auditor scan src/auth.ts
```

**What Happens:**
1. User invokes agent directly
2. Agent receives request with full context
3. Complexity analysis (score < 25)
4. Single-agent execution
5. Rule validation
6. Response to user

### 6.2 Moderate: Agent with Background Tasks

```bash
# Analysis that benefits from parallel processing
@architect analyze codebase architecture with background tasks
```

**Implementation:**
```typescript
// Architect uses background tasks for parallel analysis
task(
  description="Analyze service dependencies",
  prompt="Analyze all service dependencies in src/services/",
  subagent_type="researcher"
);

task(
  description="Analyze data models",
  prompt="Analyze all database models in src/models/",
  subagent_type="researcher"
);

// Consolidate results
const architecture = consolidateResults([servicesAnalysis, modelsAnalysis]);
```

### 6.3 Complex: Multi-Agent Coordination via Orchestrator

```bash
# Enterprise-level task requiring coordination
@orchestrator implement complete user authentication system
```

**Orchestrator Workflow:**
```
User: @orchestrator implement authentication system
  ↓
Complexity Analysis: Score 120 (Enterprise)
  ↓
Orchestrator coordinates team:
  ├─ @architect: Design auth architecture
  ├─ @backend-engineer: Implement API endpoints
  ├─ @frontend-ui-ux-engineer: Create login UI
  ├─ @database-engineer: Design user schema
  ├─ @security-auditor: Security review
  └─ @testing-lead: Test strategy
  ↓
Parallel execution with jobId tracking
  ↓
Result consolidation with consensus
  ↓
Final response to user
```

### 6.4 Enterprise: Custom Workflow with Multiple Agents

```typescript
// Custom enterprise workflow
const workflow = {
  name: 'enterprise-refactoring',
  stages: [
    {
      name: 'analysis',
      agent: 'researcher',
      task: 'Analyze monolith architecture'
    },
    {
      name: 'design',
      agent: 'architect',
      task: 'Design microservices architecture',
      dependsOn: ['analysis']
    },
    {
      name: 'security-review',
      agent: 'security-auditor',
      task: 'Security review of new architecture',
      dependsOn: ['design'],
      parallel: true
    },
    {
      name: 'implementation',
      agent: 'refactorer',
      task: 'Implement microservices migration',
      dependsOn: ['design', 'security-review']
    },
    {
      name: 'testing',
      agent: 'testing-lead',
      task: 'Comprehensive test implementation',
      dependsOn: ['implementation']
    }
  ]
};

// Execute workflow
await orchestrator.executeWorkflow(workflow);
```

---

## 7. Migration Guide: Monolithic to Modular

### 7.1 What Changed Internally

#### RuleEnforcer Transformation

**Before (v1.7.x):**
```
src/enforcement/
└── rule-enforcer.ts (2,714 lines, 58 methods)
    ├── validateOperation() - 200 lines
    ├── validateRules() - 180 lines
    ├── loadRules() - 150 lines
    ├── executeFix() - 120 lines
    ├── checkHierarchy() - 100 lines
    └── ... 53 more methods
```

**After (v1.9.0):**
```
src/enforcement/
├── rule-enforcer.ts (416 lines) - Facade
└── modules/
    ├── registry.ts (150 lines) - Rule registration
    ├── executor.ts (180 lines) - Rule execution
    ├── hierarchy.ts (120 lines) - Rule inheritance
    ├── fixer.ts (140 lines) - Automated fixes
    ├── loaders.ts (100 lines) - Config loading
    └── validators.ts (90 lines) - Input validation

Total: 1,196 lines (56% reduction)
```

#### TaskSkillRouter Transformation

**Before (v1.7.x):**
```
src/routing/
└── task-skill-router.ts (1,933 lines)
```

**After (v1.9.0):**
```
src/routing/
├── task-skill-router.ts (490 lines) - Facade
└── modules/
    ├── config.ts (80 lines)
    ├── analytics.ts (120 lines)
    ├── routing.ts (200 lines)
    └── mapping/ (12 modules, ~800 lines)

Total: 1,690 lines (13% reduction, but much better organization)
```

#### MCP Client Transformation

**Before (v1.7.x):**
```
src/mcp/
└── mcp-client.ts (1,413 lines)
```

**After (v1.9.0):**
```
src/mcp/
├── mcp-client.ts (312 lines) - Facade
└── modules/
    ├── types.ts (100 lines)
    ├── config.ts (80 lines)
    ├── connection.ts (150 lines)
    ├── tools.ts (180 lines)
    ├── simulation.ts (120 lines)
    ├── health.ts (90 lines)
    ├── pool.ts (110 lines)
    └── discovery.ts (100 lines)

Total: 1,142 lines (19% reduction)
```

### 7.2 What Stayed the Same (Public APIs)

✅ **100% Backward Compatibility**

| Aspect | Status | Notes |
|--------|--------|-------|
| `@agent-name` syntax | ✅ Unchanged | All existing invocations work |
| CLI commands | ✅ Unchanged | `npx strray-ai` commands identical |
| Configuration files | ✅ Unchanged | Same JSON structure |
| Agent registration | ✅ Unchanged | Same process for custom agents |
| Public API signatures | ✅ Unchanged | All public methods preserved |
| MCP server protocol | ✅ Unchanged | No protocol changes |
| Codex terms | ✅ Unchanged | All 60 terms maintained |

### 7.3 Benefits of New Architecture

#### Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Framework startup | ~3.2s | ~1.9s | **41% faster** |
| Memory footprint | 145MB | 98MB | **32% reduction** |
| Agent spawn time | 850ms | 520ms | **39% faster** |
| Rule validation | 120ms | 75ms | **38% faster** |
| Test execution | 45s | 32s | **29% faster** |

#### Maintainability Improvements

**Code Organization:**
- **Before**: 3 files with 9,230 lines of intermixed logic
- **After**: 75+ files with clear separation of concerns

**Testing Benefits:**
- **Unit Testing**: Individual modules testable in isolation
- **Mocking**: Easy to mock module dependencies
- **Coverage**: Improved from 72% to 87%
- **Debugging**: Clear module boundaries simplify troubleshooting

**Development Benefits:**
- **Parallel Development**: Teams can work on different modules simultaneously
- **Code Reviews**: Smaller, focused files easier to review
- **Onboarding**: New developers understand system faster
- **Refactoring**: Changes isolated to specific modules

#### Scalability Improvements

**Agent Coordination:**
- **Before**: Single-threaded agent coordination
- **After**: Parallel module loading and execution
- **Concurrent Agents**: Increased from 5 to 8
- **Load Balancing**: Intelligent routing across modules

**Resource Management:**
- **Connection Pooling**: MCP connections pooled for reuse
- **Module Caching**: Hot modules cached for faster access
- **Lazy Loading**: Modules loaded on-demand
- **Memory Management**: Better garbage collection with isolated modules

#### Extensibility Improvements

**Adding New Rules:**
```typescript
// Before: Modify monolithic rule-enforcer.ts
// After: Add to registry module
registry.register({
  id: 'new-rule',
  name: 'New Rule',
  // ...
});
```

**Adding New Agents:**
```typescript
// Same process as before, but cleaner integration
// Agent automatically uses modular routing system
router.registerAgent('new-agent', capabilities);
```

**Adding New Processors:**
```typescript
// Register with processor manager
processorManager.register(new CustomProcessor());
// Automatically integrated into pipeline
```

### 7.4 Test Coverage Improvements

**Before Modular Architecture:**
- Overall coverage: 72%
- RuleEnforcer: 65% (difficult to test monolith)
- TaskSkillRouter: 68%
- MCP Client: 71%

**After Modular Architecture:**
- Overall coverage: 87% (+15%)
- RuleEnforcer modules: 91% (isolated testing)
- TaskSkillRouter modules: 89%
- MCP Client modules: 86%

**Testing Strategy:**
1. **Unit Tests**: Each module tested independently
2. **Integration Tests**: Facade + module combinations
3. **E2E Tests**: Full framework workflows
4. **Mock Tests**: Module dependencies easily mocked

---

## 8. Appendices

### Appendix A: Complete Agent Codex Term Matrix

| Agent | Core (1-20) | Arch (21-30) | Testing (26-27) | Security (29) | Govern (52-60) |
|-------|-------------|--------------|-----------------|---------------|----------------|
| @enforcer | All | All | All | ✅ | All |
| @architect | 3,4,15,17 | 21-25,40,41 | - | - | - |
| @orchestrator | 6,7 | - | - | - | 52-54,59,60 |
| @bug-triage-specialist | 5,7,12,13 | - | - | - | - |
| @code-reviewer | 1,2,11,14,16,18-20 | - | - | - | - |
| @security-auditor | 29,32 | - | - | ✅ | - |
| @refactorer | 5,16,17 | 25,40 | - | - | - |
| @testing-lead | 26,27 | - | ✅ | - | - |
| @researcher | 6,10 | - | - | - | 34 |
| @tech-writer | 18,20 | - | - | - | 34 |
| @frontend-ui-ux-engineer | 9,13 | 30,41 | - | - | - |
| @backend-engineer | 15,21,29,32 | - | - | ✅ | - |
| @database-engineer | 10,24 | - | - | - | 28 |
| @devops-engineer | 35-36,43-44 | - | - | - | - |
| @performance-engineer | 27-28 | - | - | - | 48 |
| @security-specialist | 29,43-44 | - | - | ✅ | - |
| @api-designer | 4,18,22 | - | - | - | 34 |
| @mobile-developer | 28,30,41 | - | - | - | - |
| @storyteller | 6 | - | - | - | 34 |
| @strategist | 4,17 | - | - | - | - |
| @growth-strategist | 28 | - | - | - | 48 |
| @seo-consultant | 28,30 | - | - | - | - |
| @content-creator | 18,20 | - | - | - | 34 |
| @multimodal-looker | 4,34 | - | - | - | - |
| @log-monitor | 7,32-33 | - | - | - | - |
| @test-architect | 26,36 | - | ✅ | - | 45 |
| @git-specialist | 18,35 | - | - | - | 42 |

### Appendix B: Module Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                    MODULE DEPENDENCIES                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐                                          │
│  │  RuleEnforcer   │                                          │
│  │    Facade       │                                          │
│  └────────┬────────┘                                          │
│           │                                                   │
│     ┌─────┼─────┬────────┬────────┬────────┐                 │
│     ▼     ▼     ▼        ▼        ▼        ▼                 │
│  ┌────┐┌────┐┌────┐ ┌────────┐ ┌──────┐ ┌─────────┐         │
│  │Reg-││Exec││Hier│ │ Fixer  │ │Loaders│ │Validators│         │
│  │istry││utor││archy│ │        │ │       │ │         │         │
│  └────┘└────┘└────┘ └────────┘ └──────┘ └─────────┘         │
│                                                               │
│  ┌─────────────────┐                                          │
│  │ TaskSkillRouter │                                          │
│  │     Facade      │                                          │
│  └────────┬────────┘                                          │
│           │                                                   │
│     ┌─────┼─────┬────────┬────────┬────────┐                 │
│     ▼     ▼     ▼        ▼        ▼        ▼                 │
│  ┌────┐┌────┐┌────┐ ┌────────┐ ┌──────┐ ┌─────────┐         │
│  │Conf││Anal││Rout│ │Mapping │ │Load  │ │Metrics  │         │
│  │ig  ││ytics││ing │ │Modules │ │Bal   │ │         │         │
│  └────┘└────┘└────┘ └────────┘ └──────┘ └─────────┘         │
│                                                               │
│  ┌─────────────────┐                                          │
│  │    MCPClient    │                                          │
│  │     Facade      │                                          │
│  └────────┬────────┘                                          │
│           │                                                   │
│     ┌─────┼─────┬────────┬────────┬────────┐                 │
│     ▼     ▼     ▼        ▼        ▼        ▼                 │
│  ┌────┐┌────┐┌────┐ ┌────────┐ ┌──────┐ ┌─────────┐         │
│  │Type││Conf││Conn│ │ Tools  │ │Health │ │ Discovery│         │
│  │s   ││ig  ││ect │ │        │ │       │ │          │         │
│  └────┘└────┘└────┘ └────────┘ └──────┘ └─────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Appendix C: Troubleshooting Guide

#### Common Issues After Migration

| Issue | Symptom | Solution |
|-------|---------|----------|
| Module not found | Import errors | Check module path, ensure module is exported |
| Facade method missing | API incompatibility | Use direct module access or update to facade API |
| Configuration not loading | Default config used | Verify config file location and format |
| Performance regression | Slower than before | Check module caching, enable lazy loading |
| Test failures | Module mocking issues | Update mocks to use new module structure |

#### Diagnostic Commands

```bash
# Check module status
npx strray-ai modules status

# Validate module configuration
npx strray-ai modules validate

# List loaded modules
npx strray-ai modules list

# Check module health
npx strray-ai modules health

# Performance profiling
npx strray-ai profile --modules
```

#### Migration Checklist

- [ ] Update imports to use new module paths
- [ ] Verify configuration file format
- [ ] Run full test suite
- [ ] Check custom agent compatibility
- [ ] Validate custom rules still work
- [ ] Update CI/CD pipelines if needed
- [ ] Document any breaking changes in internal APIs
- [ ] Train team on new architecture

---

## Framework Status

**Version**: 1.9.0  
**Status**: Production Ready ✅  
**Architecture**: Modular with Facade Pattern  
**Components**: 
- 27 specialized agents
- 14 MCP servers  
- 75+ modular files
- 60 codex terms
- 87% test coverage

**Error Prevention**: 99.6% systematic validation  
**Backward Compatibility**: 100% maintained  
**Performance**: 40% faster startup, 32% less memory

---

*Last Updated: 2026-03-12*  
*Framework: StringRay AI v1.9.0*
