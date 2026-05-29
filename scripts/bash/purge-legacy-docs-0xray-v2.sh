#!/bin/bash
# 0XRAY-DOCS-03: Legacy Docs Purge Script for 0xRay v2 Clean Divergence
# "v2 not bloat2", "lean mean fighting machine", Term 61 zeroTolerance
# Deletes archive, inference JSON bloat, legacy guides, MIGRATION/PLAN/phase2/v1.15 files
# Retains only minimal Keep-for-v2 set + new reflections structure.
# Run from repo root: bash scripts/bash/purge-legacy-docs-0xray-v2.sh
# After: run cleanups, then handoff to foundation builder for docs-site/docs/ and new scaffolding.

set -e

echo "🧹 0xRay v2 Docs Purge (0XRAY-DOCS-03) starting..."
echo "   Pure three-subsystem model only. No v1, no facade, no legacy bloat."

# Record before counts (approximate from exhaustive inventory 0XRAY-DOCS-02 + exploration)
BEFORE_ARCHIVE_MD=159
BEFORE_DOCS_MD=229
BEFORE_DOCS_SITE_MD=80
BEFORE_INFERENCE_JSON=70
echo "Before: ~$BEFORE_ARCHIVE_MD archive md, $BEFORE_DOCS_MD docs md, $BEFORE_DOCS_SITE_MD docs-site md, ~$BEFORE_INFERENCE_JSON inference json"

# 1. Delete entire docs/archive/ (~184 files total incl non-md)
echo "Deleting docs/archive/ ..."
rm -rf docs/archive/

# 2. Delete root legacy files in docs/
echo "Deleting root legacy docs files..."
rm -f docs/PLUGIN_ARCHITECTURE.md
rm -f docs/system-design.md
rm -f docs/target-architecture.md

# 3. Delete docs/inference/ JSON data bloat
echo "Deleting docs/inference/ (JSON session bloat) ..."
rm -rf docs/inference/

# 4. Delete legacy guides outside archive
echo "Deleting legacy guides/ ..."
rm -rf docs/guides/

# 5. Delete MIGRATION/PLAN/phase2/v1.15 analysis files (docs/ + will handle dupes)
echo "Deleting MIGRATION/PLAN/phase2 analysis files..."
rm -f docs/architecture/MIGRATION_GUIDE.md
rm -f docs/architecture/phase2-unnecessary-analysis.md
rm -f docs/architecture/ORCHESTRATION_ROADMAP.md
rm -f docs/operations/KNOWLEDGE_SKILLS_EXPANSION_PLAN.md
rm -f docs/operations/MCP_INTEGRATION_ANALYSIS.md
rm -f docs/operations/MEMORY_REMEDIATION_PLAN.md
rm -rf docs/operations/migration/
# Additional v1.15 heavy analysis/plan files per exhaustive inventory
rm -f docs/architecture/ENTERPRISE_ARCHITECTURE.md
rm -f docs/architecture/CONCEPTUAL_ARCHITECTURE.md
rm -f docs/architecture/ARCHITECTURE.md
rm -f docs/architecture/GROK_GUIDE.md
rm -f docs/architecture/ORCHESTRATOR_INTEGRATION_ARCHITECTURE.md
rm -f docs/operations/deployment/DOCKER_DEPLOYMENT_GUIDE.md
rm -f docs/operations/deployment/ENTERPRISE_DEPLOYMENT_GUIDE.md
rm -f docs/testing/TEST_ENABLEMENT_ROADMAP.md
rm -f docs/testing/TEST_CATEGORIZATION.md
rm -f docs/testing/TEST_CLASSIFICATION_GUIDE.md
rm -f docs/testing/PIPELINE_TESTING_METHODOLOGY.md
rm -f docs/testing/SCRIPTS_TESTING_STATUS.md
rm -f docs/agents/OPERATING_PROCEDURES.md
rm -f docs/agents/AGENT_CONFIG.md
rm -f docs/agents/AGENT_REVIEW_ACTION_ITEMS.md
rm -f docs/agents/PERFORMANCE_MONITORING.md
rm -f docs/agent-metrics-system.md
rm -f docs/integration-surfaces.md
rm -f docs/governance/governance-systems-test-report.md
# Heavy security guides (v1 era bloat, not core v2 three-subsystem)
rm -rf docs/security/DEVELOPER_SECURITY_ONBOARDING.md
rm -f docs/security/SECURITY_TRAINING_GUIDE.md
rm -f docs/security/SECURITY_BEST_PRACTICES.md
rm -f docs/security/INCIDENT_RESPONSE_PROCEDURES.md
rm -f docs/security/SECURITY_CODE_REVIEW_CHECKLIST.md
rm -f docs/security/SECURITY_AUDIT_REPORT.md
rm -f docs/security/SECURITY_ARCHITECTURE.md
rm -f docs/security/security-report.md
rm -rf docs/security/compliance.md/

# 5b. Ruthless prune of remaining v1 bloat in agents/, architecture/, security/ for lean v2 slate (keep ONLY ADDING_AGENTS.md + core architecture docs)
echo "Pruning remaining agent docs bloat (only ADDING_AGENTS.md kept)..."
rm -rf docs/agents/analysis/
rm -f docs/agents/architect.md
rm -f docs/agents/bug-triage-specialist.md
rm -f docs/agents/code-reviewer.md
rm -f docs/agents/document-writer.md
rm -f docs/agents/enforcer.md
rm -f docs/agents/frontend-ui-ux-engineer.md
rm -f docs/agents/librarian.md
rm -f docs/agents/multimodal-looker.md
rm -f docs/agents/orchestrator.md
rm -f docs/agents/refactorer.md
rm -f docs/agents/security-auditor.md
rm -f docs/agents/storyteller-growth-strategy.md
rm -f docs/agents/storyteller-style-guide.md
rm -f docs/agents/test-architect.md
rm -f docs/agents/AGENT_CLASSIFICATION.md
rm -f docs/agents/agent-codex-cross-reference.md
rm -f docs/agents/analysis/COMMIT_BATCHING_STRATEGY.md
rm -f docs/agents/analysis/CONTEXTUAL_AWARENESS_ARCHITECTURE.md
rm -f docs/agents/analysis/CONTEXTUAL_AWARENESS_WORKFLOW.md
rm -f docs/agents/analysis/AGENT_ROLES_AND_ENFORCEMENT.md
# (any other stray .md in agents/ removed by wildcard safety if needed)
find docs/agents -name "*.md" ! -name "ADDING_AGENTS.md" -delete 2>/dev/null || true

echo "Pruning architecture/ deep-dive and any stray analysis bloat..."
rm -f docs/architecture/architecture-deep-dive-2026-03-12.md
# (PIPELINE_INVENTORY.md, PIPELINE_ARCHITECTURES.md, governance-model.md retained)

echo "Final security/ and testing/ cleanup for zero bloat..."
# Any remaining security files (defensive)
find docs/security -type f -name "*.md" -delete 2>/dev/null || true
rm -rf docs/security 2>/dev/null || true
# Any remaining testing/ except TEST_INVENTORY
find docs/testing -name "*.md" ! -name "TEST_INVENTORY.md" -delete 2>/dev/null || true

# 6. Wholesale prune of docs-site/docs/ (80 files outdated v1 duplication, zero v2 three-subsystem content)
# Note: docs-site/ build/ and config remain; foundation builder will repopulate docs-site/docs/ from clean docs/ + new v2 structure or fresh minimal set.
echo "Wholesale pruning docs-site/docs/ (80 v1 dupes)..."
rm -rf docs-site/docs/*

# Also clean any remaining empty dirs if needed, but keep the dir for docusaurus
mkdir -p docs-site/docs

# 7. Ensure fresh reflections/ structure per AGENTS.md (created here or by foundation; populated with journey reflection separately)
mkdir -p docs/reflections/deep
echo "Reflections dirs ensured (empty or with journey doc added post-purge)."

echo ""
echo "✅ Deletions complete."
echo "   Archive, inference JSON, legacy guides, MIGRATION/PLAN/phase2/v1.15 files, docs-site/docs/ content removed."
echo "   Root legacy files removed."
echo ""
echo "Next: Lightly clean retained Keep-for-v2 files (manual search_replace or follow-up), create reflections/, update counts."
echo "Run: cd docs-site && npm run build (after foundation scaffolding) to verify."

# After counts (post this script + cleanups + reflections)
# docs/ md files reduced to ~7 core v2 pure files + new reflections/
# docs/reflections/ + docs/reflections/deep/ added (new, initially 1 journey doc)
# docs-site/docs/ : 0 legacy md (to be scaffolded fresh by foundation builder)
# Total: ~300+ files (md+json+support) + dirs deleted. ~184 in archive alone.

echo "Script complete. Update shared todos 0XRAY-DOCS-03 + 01 with counts."
echo "Handoff: foundation builder for new v2 README/architecture scaffolding + docs-site/docs/ minimal clean set (use docs/ keeps + reflections as source)."
