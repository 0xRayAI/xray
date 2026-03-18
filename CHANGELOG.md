# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Conventional Commits](https://www.conventionalcommits.org/).

## [1.11.0] - 2026-03-18

### 🔄 Changes

### ✨ Features
- feat: add documentation sync system with smart triggers (c63fa186)

### 🐛 Bug Fixes
- fix: routing outcomes now saved immediately, orchestrator tracks outcomes (c9922b62)
- fix: activity.log now includes task details, routing-outcomes.json initialized immediately (9e5fc142)
- fix: init.sh priority - node_modules first, source as fallback (d7ca8f49)
- fix: init.sh version detection to show actual version instead of fallback (779c979a)

---

## [1.10.7] - 2026-03-18 (from v1.10.0)

### ✨ Features

- complete processor migration to polymorphic classes (Part 2)|feat: complete processor migration to polymorphic classes (Part 2) (`842b238`)
- extract processor switch to polymorphic classes (Part 1)|feat: extract processor switch to polymorphic classes (Part 1) (`83529b6`)
- add standalone archive-logs CLI command|feat: add standalone archive-logs CLI command (`605d714`)
- enable task routing and add comprehensive analytics logging|feat: enable task routing and add comprehensive analytics logging (`be39379`)
- wire up archiveLogFiles to run before cleanup|feat: wire up archiveLogFiles to run before cleanup (`ff44996`)
- Add Estimation Validator with calibration learning|feat: Add Estimation Validator with calibration learning (`6410607`)
**integration:**
- Add OpenClaw integration with tool event hooks|feat(integration): Add OpenClaw integration with tool event hooks (`0ea5986`)

### 🐛 Bug Fixes

- persist routing outcomes to disk for analytics|fix: persist routing outcomes to disk for analytics (`b63f35f`)
- archive activity.log only after verification, leave intact on failure|fix: archive activity.log only after verification, leave intact on failure (`9234bd6`)
- pre-commit test check in ci-test-env|fix: pre-commit test check in ci-test-env (`4d208ca`)
- pre-commit test check uses correct test command|fix: pre-commit test check uses correct test command (`8d03417`)
- restore eslint config|fix: restore eslint config (`2ee7085`)
- use temp directory for test-consent.json instead of root|fix: use temp directory for test-consent.json instead of root (`66f2943`)
- write test log files to logs/ directory instead of root|fix: write test log files to logs/ directory instead of root (`20a089a`)
- cleanup test files from both root and logs/ folders|fix: cleanup test files from both root and logs/ folders (`c2cc967`)
- update reflection path references to new consolidated location|fix: update reflection path references to new consolidated location (`0d0a8e2`)
- protect critical logs from deletion + move test-activity to logs/|fix: protect critical logs from deletion + move test-activity to logs/ (`a1cd89b`)
- protect all critical logs from cleanup deletion|fix: protect all critical logs from cleanup deletion (`467f377`)
- protect activity.log from deletion in cleanupLogFiles|fix: protect activity.log from deletion in cleanupLogFiles (`317ddac`)
**plugin:**
- Remove debug console.error statements|fix(plugin): Remove debug console.error statements (`b38f784`)
- Enable processors for all tools and improve debugging|fix(plugin): Enable processors for all tools and improve debugging (`ffb4b64`)

### 📚 Documentation

- add deep reflection on processor architecture refactoring|docs: add deep reflection on processor architecture refactoring (`9be3fac`)
- add OpenClaw integration section and project structure to README|docs: add OpenClaw integration section and project structure to README (`0b5e3d8`)
- Add comprehensive architecture analysis|docs: Add comprehensive architecture analysis (`1649873`)
- Add Estimation Validator demo documentation|docs: Add Estimation Validator demo documentation (`2bdc3e8`)
- Add deep saga reflection 'The Refactorer's Odyssey'|docs: Add deep saga reflection 'The Refactorer's Odyssey' (`7a834b7`)
### ♻️ Code Refactoring

- extract quality gates to dedicated module|refactor: extract quality gates to dedicated module (`aace35e`)
- flush dead plugin system, add routing for all 25 agents|refactor: flush dead plugin system, add routing for all 25 agents (`a9efc7c`)
- organize temp folders and configs|refactor: organize temp folders and configs (`265565c`)
- organize report and config files to proper locations|refactor: organize report and config files to proper locations (`d82d23f`)
- consolidate all reflection files into docs/reflections/|refactor: consolidate all reflection files into docs/reflections/ (`e8ea22a`)
- Consolidate complexity analyzers (Technical Debt #1)|refactor: Consolidate complexity analyzers (Technical Debt #1) (`dcfeadc`)
- Split orchestrator.server.ts into modular structure|refactor: Split orchestrator.server.ts into modular structure (`1fc54dc`)
**plugin:**
- Add TaskSkillRouter integration scaffolding|refactor(plugin): Add TaskSkillRouter integration scaffolding (`d60c28c`)

### 🧪 Tests

- add processor architecture validation script|test: add processor architecture validation script (`819450e`)
### 🔧 Chores

- add var/ to gitignore|chore: add var/ to gitignore (`a358315`)
- add test log files to .gitignore|chore: add test log files to .gitignore (`effa3b4`)
- Update scripts to use consolidated complexity analyzer API|chore: Update scripts to use consolidated complexity analyzer API (`de5bea4`)
- Remove dead code - secure-authentication-system|chore: Remove dead code - secure-authentication-system (`589cb8e`)
- Sync version to 1.10.0 across all files|chore: Sync version to 1.10.0 across all files (`26f5ec3`)
- Update auto-generated state and performance baselines|chore: Update auto-generated state and performance baselines (`75345d4`)
- Bump version to 1.10.0|chore: Bump version to 1.10.0 (`4497035`)
---

*Generated by `scripts/node/generate-changelog.js`*
