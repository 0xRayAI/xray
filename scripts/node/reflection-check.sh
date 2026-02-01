#!/bin/bash
#
# reflection-check.sh
# Validates that a reflection document follows the required template
# Run this before finalizing ANY reflection
#

set -e

REFLECTION_FILE="$1"

if [ -z "$REFLECTION_FILE" ]; then
    echo "Usage: ./reflection-check.sh <path-to-reflection.md>"
    exit 1
fi

if [ ! -f "$REFLECTION_FILE" ]; then
    echo "❌ Error: File not found: $REFLECTION_FILE"
    exit 1
fi

echo "🔍 Checking reflection: $REFLECTION_FILE"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: File location
echo "1️⃣  Checking file location..."
if [[ "$REFLECTION_FILE" == *"docs/reflections/"* ]]; then
    echo "   ✅ Located in docs/reflections/"
else
    echo "   ❌ Must be in docs/reflections/ directory"
    ((ERRORS++))
fi

# Check 2: Executive Summary
echo ""
echo "2️⃣  Checking Executive Summary..."
if grep -q "## Executive Summary" "$REFLECTION_FILE"; then
    echo "   ✅ Has Executive Summary section"
    # Check it's near the top (within first 20 lines)
    line_num=$(grep -n "## Executive Summary" "$REFLECTION_FILE" | head -1 | cut -d: -f1)
    if [ "$line_num" -lt 20 ]; then
        echo "   ✅ Executive Summary is near top (line $line_num)"
    else
        echo "   ⚠️  Executive Summary should be within first 20 lines (currently line $line_num)"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Executive Summary section"
    ((ERRORS++))
fi

# Check 3: The Dichotomy sections
echo ""
echo "3️⃣  Checking The Dichotomy sections..."
if grep -q "## The Dichotomy" "$REFLECTION_FILE" || \
   (grep -q "What Was" "$REFLECTION_FILE" && \
    grep -q "What Is" "$REFLECTION_FILE" && \
    grep -q "What Should Be" "$REFLECTION_FILE"); then
    echo "   ✅ Has The Dichotomy structure"
else
    echo "   ❌ Missing The Dichotomy (What Was/Is/Should Be)"
    ((ERRORS++))
fi

# Check 4: Timeline
echo ""
echo "4️⃣  Checking Timeline..."
if grep -q "## Timeline" "$REFLECTION_FILE" || \
   grep -q "## Chronological" "$REFLECTION_FILE" || \
   grep -q "### Phase" "$REFLECTION_FILE"; then
    echo "   ✅ Has Timeline/Chronological section"
else
    echo "   ❌ Missing Timeline section"
    ((ERRORS++))
fi

# Check 5: Root Cause Analysis
echo ""
echo "5️⃣  Checking Root Cause Analysis..."
if grep -q "## Root Cause" "$REFLECTION_FILE"; then
    echo "   ✅ Has Root Cause Analysis section"
    # Check for structure
    if grep -q "Root Cause 1:" "$REFLECTION_FILE" || \
       grep -q "### Root Cause" "$REFLECTION_FILE"; then
        echo "   ✅ Has numbered root causes"
    else
        echo "   ⚠️  Should have numbered root causes (Root Cause 1:, Root Cause 2:, etc.)"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Root Cause Analysis section"
    ((ERRORS++))
fi

# Check 6: Solutions/Fixes section
echo ""
echo "6️⃣  Checking Solutions section..."
if grep -q "## Solution" "$REFLECTION_FILE" || \
   grep -q "## Fix" "$REFLECTION_FILE" || \
   grep -q "## The Fix" "$REFLECTION_FILE"; then
    echo "   ✅ Has Solutions/Fixes section"
else
    echo "   ❌ Missing Solutions/Fixes section"
    ((ERRORS++))
fi

# Check 7: Deep Lessons
echo ""
echo "7️⃣  Checking Deep Lessons..."
if grep -q "## Deep Lesson" "$REFLECTION_FILE" || \
   grep -q "## Lesson" "$REFLECTION_FILE"; then
    echo "   ✅ Has Deep Lessons section"
    # Check for Pitfall/Ah-Ha structure
    if grep -q "Pitfall:" "$REFLECTION_FILE" && \
       grep -q "Ah-Ha" "$REFLECTION_FILE"; then
        echo "   ✅ Has Pitfall→Ah-Ha structure"
    else
        echo "   ⚠️  Should have Pitfall: and Ah-Ha Moment: structure"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Deep Lessons section"
    ((ERRORS++))
fi

# Check 8: Personal Journey
echo ""
echo "8️⃣  Checking Personal Journey..."
if grep -q "## Personal Journey" "$REFLECTION_FILE" || \
   (grep -q "My Struggle" "$REFLECTION_FILE" && \
    grep -q "My Triumph" "$REFLECTION_FILE"); then
    echo "   ✅ Has Personal Journey section"
else
    echo "   ❌ Missing Personal Journey section"
    ((ERRORS++))
fi

# Check 9: Action Items
echo ""
echo "9️⃣  Checking Action Items..."
if grep -q "## Action Item" "$REFLECTION_FILE" || \
   grep -q "## Checklist" "$REFLECTION_FILE"; then
    echo "   ✅ Has Action Items/Checklist section"
    # Check for checkboxes
    if grep -q "\- \[ \]" "$REFLECTION_FILE" || \
       grep -q "\- \[x\]" "$REFLECTION_FILE"; then
        echo "   ✅ Has actionable checkboxes"
    else
        echo "   ⚠️  Should have checkboxes (- [ ]) for actionable items"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Action Items section"
    ((ERRORS++))
fi

# Check 10: Code examples
echo ""
echo "🔟  Checking for code examples..."
if grep -q '```' "$REFLECTION_FILE"; then
    code_blocks=$(grep -c '```' "$REFLECTION_FILE")
    echo "   ✅ Has code blocks ($code_blocks backtick blocks found)"
else
    echo "   ⚠️  Should include code examples (use ``` code blocks)"
    ((WARNINGS++))
fi

# Check 11: Length check
echo ""
echo "1️⃣1️⃣  Checking length..."
line_count=$(wc -l < "$REFLECTION_FILE")
if [ "$line_count" -gt 100 ]; then
    echo "   ✅ Substantial content ($line_count lines)"
else
    echo "   ⚠️  Reflection seems short ($line_count lines). Should be >100 lines for significant sessions."
    ((WARNINGS++))
fi

# Summary
echo ""
echo "==================================="
echo "📊 VALIDATION SUMMARY"
echo "==================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ REFLECTION IS COMPLIANT"
    echo "Ready to save to docs/reflections/"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  REFLECTION HAS WARNINGS"
    echo "Consider addressing warnings, but acceptable to proceed."
    exit 0
else
    echo "❌ REFLECTION IS NON-COMPLIANT"
    echo "Fix the errors above before saving."
    echo ""
    echo "📖 Read the template: docs/reflections/TEMPLATE.md"
    exit 1
fi