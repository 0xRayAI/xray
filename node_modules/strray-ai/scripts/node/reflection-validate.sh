#!/bin/bash
#
# reflection-validate.sh
# Validates reflection follows v3.0 template requirements
# Run before committing ANY significant change
#
# Usage: ./scripts/node/reflection-validate.sh <path-to-reflection.md>

set -e

REFLECTION_FILE="$1"

if [ -z "$REFLECTION_FILE" ]; then
    echo "Usage: ./scripts/node/reflection-validate.sh <path-to-reflection.md>"
    exit 1
fi

if [ ! -f "$REFLECTION_FILE" ]; then
    echo "❌ Error: File not found: $REFLECTION_FILE"
    exit 1
fi

echo "🔍 Validating reflection: $REFLECTION_FILE"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# ==========================================
# PART A: PERSONAL GROWTH (Required)
# ==========================================

echo "📋 PART A: PERSONAL GROWTH"
echo "----------------------------"

# 1. Executive Summary
echo -n "1. Executive Summary: "
if grep -q "^## .*Executive Summary\|^### .*Executive Summary" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "❌ Missing - required for quick scanning"
    ((ERRORS++))
fi

# 2. The Dichotomy - What Was/Is/Should Be
echo -n "2. The Dichotomy: "
if grep -q "What Was\|What Is\|What Should Be" "$REFLECTION_FILE"; then
    echo "✅ Found"
    
    # Check for INNER DIALOGUE
    echo -n "   INNER DIALOGUE: "
    if grep -q "INNER DIALOGUE" "$REFLECTION_FILE"; then
        echo "✅ Found"
    else
        echo "❌ Missing - critical for depth"
        ((ERRORS++))
    fi
else
    echo "❌ Missing - core structure"
    ((ERRORS++))
fi

# 3. Counterfactual Thinking
echo -n "3. Counterfactual Thinking: "
if grep -q -i "counterfactual\|would have\|What Would Have" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "❌ Missing - required for depth"
    ((ERRORS++))
fi

# 4. Personal Journey
echo -n "4. Personal Journey: "
if grep -q -i "My Struggle\|My Triumph\|Personal Journey" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "❌ Missing - humanizes technical narrative"
    ((ERRORS++))
fi

# 5. Master's Wisdom
echo -n "5. Master's Wisdom: "
if grep -q -i "Master.*Wisdom\|Who Saved\|What They Knew" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "❌ Missing - acknowledges learning from others"
    ((ERRORS++))
fi

# ==========================================
# PART B: TECHNICAL (Required)
# ==========================================

echo ""
echo "💻 PART B: TECHNICAL"
echo "---------------------"

# 6. What Changed with Code
echo -n "6. Code Examples: "
CODE_BLOCKS=$(grep -c '^\`\`\`' "$REFLECTION_FILE")
if [ "$CODE_BLOCKS" -ge 2 ]; then
    echo "✅ Found ($CODE_BLOCKS code blocks)"
else
    echo "❌ Missing - must show before/after code"
    ((ERRORS++))
fi

# 7. Architecture Impact (ASCII)
echo -n "7. ASCII Diagrams: "
if grep -q '^\`\`\`' "$REFLECTION_FILE" && grep -q "┌\|└\|─\|│" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "⚠️  Missing - ASCII diagrams help visualize"
    ((WARNINGS++))
fi

# 8. Key Files Modified (table)
echo -n "8. Files Modified Table: "
if grep -q "| File |" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "⚠️  Missing - table helps track changes"
    ((WARNINGS++))
fi

# 9. Test Evidence
echo -n "9. Test Evidence: "
if grep -q "✅\|passed\|success\|Test Files" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "⚠️  Missing - actual test output validates changes"
    ((WARNINGS++))
fi

# 10. What Still Doesn't Work
echo -n "10. What Still Doesn't Work: "
if grep -q -i "doesn't work\|still broken\|not resolved\|needs further" "$REFLECTION_FILE"; then
    echo "✅ Found (honest)"
else
    echo "⚠️  Missing - honesty builds trust"
    ((WARNINGS++))
fi

# 11. For Future AI
echo -n "11. For Future AI: "
if grep -q -i "Future AI\|continue this work\|how to" "$REFLECTION_FILE"; then
    echo "✅ Found"
else
    echo "⚠️  Missing - institutional knowledge for future"
    ((WARNINGS++))
fi

# ==========================================
# VALIDATION SUMMARY
# ==========================================

echo ""
echo "=========================================="
echo "📊 VALIDATION SUMMARY"
echo "=========================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

# Check for depth indicators
DEPTH_SCORE=0

if grep -q "INNER DIALOGUE" "$REFLECTION_FILE"; then ((DEPTH_SCORE++)); fi
if grep -q -i "counterfactual\|would have" "$REFLECTION_FILE"; then ((DEPTH_SCORE++)); fi
if grep -q -i "struggle\|frustration\|emotion\|feeling" "$REFLECTION_FILE"; then ((DEPTH_SCORE++)); fi
if grep -q "Master.*Wisdom" "$REFLECTION_FILE"; then ((DEPTH_SCORE++)); fi
if grep -q "code" "$REFLECTION_FILE" && grep -q '^\`\`\`' "$REFLECTION_FILE"; then ((DEPTH_SCORE++)); fi

echo "Depth Score: $DEPTH_SCORE/5"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -lt 3 ]; then
    echo ""
    echo "✅ REFLECTION VALIDATED"
    echo "Ready for commit."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo ""
    echo "⚠️  VALIDATED with warnings"
    echo "Consider addressing warnings for better quality."
    exit 0
else
    echo ""
    echo "❌ VALIDATION FAILED"
    echo "Fix the errors above before committing."
    echo ""
    echo "📖 Template: docs/reflections/TEMPLATE_v3.md"
    exit 1
fi