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
if grep -q "## Executive Summary" "$REFLECTION_FILE" || \
   grep -q "## 1. EXECUTIVE SUMMARY" "$REFLECTION_FILE"; then
    echo "   ✅ Has Executive Summary section"
    # Check it's near the top (within first 20 lines)
    line_num=$(grep -n "## Executive Summary\|## 1. EXECUTIVE SUMMARY" "$REFLECTION_FILE" | head -1 | cut -d: -f1)
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
   grep -q "## 2. THE DICHOTOMY" "$REFLECTION_FILE" || \
   (grep -q "What Was" "$REFLECTION_FILE" && \
    grep -q "What Is" "$REFLECTION_FILE" && \
    grep -q "What Should Be" "$REFLECTION_FILE"); then
    echo "   ✅ Has The Dichotomy structure"
    
    # Check for INNER DIALOGUE in What Was section
    if grep -q "INNER DIALOGUE" "$REFLECTION_FILE"; then
        echo "   ✅ Contains INNER DIALOGUE sections"
        
        # Count INNER DIALOGUE mentions for depth
        inner_dialogue_count=$(grep -c "INNER DIALOGUE" "$REFLECTION_FILE")
        if [ "$inner_dialogue_count" -ge 2 ]; then
            echo "   ✅ Multiple INNER DIALOGUE sections ($inner_dialogue_count found)"
        else
            echo "   ⚠️  Should have multiple INNER DIALOGUE sections for depth (currently $inner_dialogue_count)"
            ((WARNINGS++))
        fi
    else
        echo "   ❌ Missing INNER DIALOGUE sections - critical for depth"
        ((ERRORS++))
    fi
    
    # Check for emotional/struggle content
    if grep -q -i "struggle\|emotional\|frustration\|confidence\|confusion" "$REFLECTION_FILE"; then
        echo "   ✅ Contains emotional/struggle context"
    else
        echo "   ⚠️  Should include emotional state descriptions for depth"
        ((WARNINGS++))
    fi
    
else
    echo "   ❌ Missing The Dichotomy (What Was/Is/Should Be)"
    ((ERRORS++))
fi

# Check 4: Counterfactual Thinking (Required for depth)
echo ""
echo "4️⃣  Checking Counterfactual Thinking..."
if grep -q "## Counterfactual\|## COUNTERFACTUAL\|Counterfactual Analysis" "$REFLECTION_FILE"; then
    echo "   ✅ Has Counterfactual Thinking section"
    
    # Check for specific counterfactual questions
    counterfactual_checks=0
    if grep -q "would have happened" "$REFLECTION_FILE"; then
        ((counterfactual_checks++))
    fi
    if grep -q "cascade of" "$REFLECTION_FILE"; then
        ((counterfactual_checks++))
    fi
    if grep -q "would have been lost" "$REFLECTION_FILE"; then
        ((counterfactual_checks++))
    fi
    if grep -q "false victory" "$REFLECTION_FILE"; then
        ((counterfactual_checks++))
    fi
    
    if [ "$counterfactual_checks" -ge 2 ]; then
        echo "   ✅ Contains deep counterfactual analysis ($counterfactual_checks key elements)"
    else
        echo "   ⚠️  Should include more counterfactual analysis (would have happened, cascade, what would have been lost, false victory)"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Counterfactual Thinking section - critical for depth"
    ((ERRORS++))
fi

# Check 5: Timeline
echo ""
echo "5️⃣  Checking Timeline..."
if grep -q "## Timeline" "$REFLECTION_FILE" || \
   grep -q "## 4. CHRONOLOGICAL" "$REFLECTION_FILE" || \
   grep -q "## Chronological" "$REFLECTION_FILE" || \
   grep -q "### Phase" "$REFLECTION_FILE"; then
    echo "   ✅ Has Timeline/Chronological section"
    
    # Check for INNER DIALOGUE in timeline
    if grep -q "INNER DIALOGUE" "$REFLECTION_FILE"; then
        echo "   ✅ Timeline includes INNER DIALOGUE sections"
    else
        echo "   ⚠️  Timeline should include INNER DIALOGUE for each phase"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Timeline section"
    ((ERRORS++))
fi

# Check 6: Root Cause Analysis
echo ""
echo "6️⃣  Checking Root Cause Analysis..."
if grep -q "## Root Cause" "$REFLECTION_FILE" || \
   grep -q "## 5. ROOT CAUSE" "$REFLECTION_FILE"; then
    echo "   ✅ Has Root Cause Analysis section"
    # Check for structure
    if grep -q "Root Cause 1:" "$REFLECTION_FILE" || \
       grep -q "### Root Cause" "$REFLECTION_FILE"; then
        echo "   ✅ Has numbered root causes"
        
        # Check for "Why I Thought I Was Right" - critical for depth
        if grep -q "Why I Thought I Was Right\|Why it seemed right" "$REFLECTION_FILE"; then
            echo "   ✅ Includes flawed reasoning analysis"
        else
            echo "   ❌ Missing 'Why I Thought I Was Right' - critical for depth and learning"
            ((ERRORS++))
        fi
    else
        echo "   ⚠️  Should have numbered root causes (Root Cause 1:, Root Cause 2:, etc.)"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Root Cause Analysis section"
    ((ERRORS++))
fi

# Check 7: Master's Wisdom
echo ""
echo "7️⃣  Checking Master's Wisdom..."
if grep -q "## The Master\|## Master.*Wisdom\|## 9. THE MASTER" "$REFLECTION_FILE"; then
    echo "   ✅ Has Master's Wisdom section"
    
    # Check for specific elements
    master_checks=0
    if grep -q "Who Saved Me\|Who set the constraint" "$REFLECTION_FILE"; then
        ((master_checks++))
    fi
    if grep -q "What They Knew\|What did they know" "$REFLECTION_FILE"; then
        ((master_checks++))
    fi
    if grep -q "Why They Knew It\|Why did they know" "$REFLECTION_FILE"; then
        ((master_checks++))
    fi
    if grep -q "What I Would Have Lost" "$REFLECTION_FILE"; then
        ((master_checks++))
    fi
    
    if [ "$master_checks" -ge 3 ]; then
        echo "   ✅ Contains comprehensive Master's Wisdom analysis ($master_checks/4 elements)"
    else
        echo "   ⚠️  Master's Wisdom should address who saved you, what they knew, why they knew, what you would have lost"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Master's Wisdom section - critical for humility and learning"
    ((ERRORS++))
fi

# Check 6: Solutions/Fixes section
echo ""
echo "6️⃣  Checking Solutions section..."
if grep -q "## Solution" "$REFLECTION_FILE" || \
   grep -q "## Fix" "$REFLECTION_FILE" || \
   grep -q "## The Fix" "$REFLECTION_FILE" || \
   grep -q "## 6. THE FIX" "$REFLECTION_FILE"; then
    echo "   ✅ Has Solutions/Fixes section"
else
    echo "   ❌ Missing Solutions/Fixes section"
    ((ERRORS++))
fi

# Check 8: Deep Lessons
echo ""
echo "8️⃣  Checking Deep Lessons..."
if grep -q "## Deep Lesson" "$REFLECTION_FILE" || \
   grep -q "## Lesson" "$REFLECTION_FILE" || \
   grep -q "## 7. DEEP LESSONS" "$REFLECTION_FILE"; then
    echo "   ✅ Has Deep Lessons section"
    
    # Check for Pitfall/Ah-Ha structure
    pitfall_count=$(grep -c "Pitfall:" "$REFLECTION_FILE")
    aha_count=$(grep -c "Ah-Ha" "$REFLECTION_FILE")
    
    if [ "$pitfall_count" -ge 1 ] && [ "$aha_count" -ge 1 ]; then
        echo "   ✅ Has Pitfall→Ah-Ha structure ($pitfall_count pitfall(s), $aha_count ah-ha moment(s))"
    else
        echo "   ⚠️  Should have Pitfall: and Ah-Ha Moment: structure for deep learning"
        ((WARNINGS++))
    fi
    
    # Check for "Why I Didn't See It" - adds depth
    if grep -q "Why I Didn't See It\|What was I missing" "$REFLECTION_FILE"; then
        echo "   ✅ Includes self-awareness component"
    else
        echo "   ⚠️  Should include 'Why I Didn't See It' for self-reflection depth"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Deep Lessons section"
    ((ERRORS++))
fi

# Check 9: Personal Journey
echo ""
echo "9️⃣  Checking Personal Journey..."
if grep -q "## Personal Journey" "$REFLECTION_FILE" || \
   grep -q "## 8. PERSONAL JOURNEY" "$REFLECTION_FILE" || \
   (grep -q "My Struggle" "$REFLECTION_FILE" && \
    grep -q "My Triumph" "$REFLECTION_FILE"); then
    echo "   ✅ Has Personal Journey section"
    
    # Check for required emotional depth elements
    personal_checks=0
    if grep -q "My Struggle" "$REFLECTION_FILE"; then
        ((personal_checks++))
    fi
    if grep -q "My Triumph" "$REFLECTION_FILE"; then
        ((personal_checks++))
    fi
    if grep -q "My Dichotomy\|Conflicting viewpoints" "$REFLECTION_FILE"; then
        ((personal_checks++))
    fi
    if grep -q "What Would Have Happened If I Had My Way" "$REFLECTION_FILE"; then
        ((personal_checks++))
    fi
    if grep -q "My Commitments to Future Self" "$REFLECTION_FILE"; then
        ((personal_checks++))
    fi
    
    if [ "$personal_checks" -ge 4 ]; then
        echo "   ✅ Contains comprehensive personal journey ($personal_checks/5 elements)"
    else
        echo "   ⚠️  Personal Journey should include Struggle, Triumph, Dichotomy, What Would Have Happened, My Growth/Commitments"
        ((WARNINGS++))
    fi
    
    # Check for emotional honesty
    if grep -q -i "frustration\|anger\|doubt\|resistance\|struggle" "$REFLECTION_FILE"; then
        echo "   ✅ Contains emotional honesty about challenges"
    else
        echo "   ⚠️  Should include honest emotional descriptions of struggle"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Personal Journey section"
    ((ERRORS++))
fi

# Check 10: Action Items
echo ""
echo "🔟  Checking Action Items..."
if grep -q "## Action Item" "$REFLECTION_FILE" || \
   grep -q "## Checklist" "$REFLECTION_FILE" || \
   grep -q "## 10. ACTION ITEMS" "$REFLECTION_FILE"; then
    echo "   ✅ Has Action Items/Checklist section"
    
    # Check for checkboxes
    if grep -q "\- \[ \]" "$REFLECTION_FILE" || \
       grep -q "\- \[x\]" "$REFLECTION_FILE"; then
        echo "   ✅ Has actionable checkboxes"
    else
        echo "   ⚠️  Should have checkboxes (- [ ]) for actionable items"
        ((WARNINGS++))
    fi
    
    # Check for prevention checklist specifically
    if grep -q "Prevention Checklist\|Before.*I will" "$REFLECTION_FILE"; then
        echo "   ✅ Has Prevention Checklist for future avoidance"
    else
        echo "   ⚠️  Should include Prevention Checklist with specific verification steps"
        ((WARNINGS++))
    fi
else
    echo "   ❌ Missing Action Items section"
    ((ERRORS++))
fi

# Check 10: Code examples
echo ""
echo "🔟  Checking for code examples..."
BACKTICK='```'
if grep -q "$BACKTICK" "$REFLECTION_FILE"; then
    code_blocks=$(grep -c "$BACKTICK" "$REFLECTION_FILE")
    echo "   ✅ Has code blocks ($code_blocks backtick blocks found)"
else
    echo "   ⚠️  Should include code examples (use ${BACKTICK} code blocks)"
    ((WARNINGS++))
fi

# Check 11: Length check with depth requirements
echo ""
echo "1️⃣1️⃣  Checking length..."
line_count=$(wc -l < "$REFLECTION_FILE")
if [ "$line_count" -gt 150 ]; then
    echo "   ✅ Substantial content with depth ($line_count lines)"
else
    echo "   ⚠️  Reflection seems short for meaningful depth ($line_count lines). Should be >150 lines for significant sessions."
    ((WARNINGS++))
fi

# Check 12: Overall depth assessment
echo ""
echo "1️⃣2️⃣  Overall depth assessment..."
depth_score=0
total_checks=0

# Check for emotional honesty
if grep -q -i "struggle\|frustration\|doubt\|emotion\|feeling\|resistance" "$REFLECTION_FILE"; then
    echo "   ✅ Shows emotional honesty"
    ((depth_score++))
fi
((total_checks++))

# Check for counterfactual thinking
if grep -q "would have happened\|would have been lost\|cascade\|counterfactual" "$REFLECTION_FILE"; then
    echo "   ✅ Includes counterfactual thinking"
    ((depth_score++))
fi
((total_checks++))

# Check for self-awareness of mistakes
if grep -q "Why I Thought I Was Right\|why was I wrong\|flawed reasoning" "$REFLECTION_FILE"; then
    echo "   ✅ Shows self-awareness of mistakes"
    ((depth_score++))
fi
((total_checks++))

# Check for learning from others
if grep -q "Master.*Wisdom\|What They Knew\|who saved me" "$REFLECTION_FILE"; then
    echo "   ✅ Shows learning from others (Master's Wisdom)"
    ((depth_score++))
fi
((total_checks++))

# Check for future commitments
if grep -q "My Commitments\|Prevention Checklist\|will change" "$REFLECTION_FILE"; then
    echo "   ✅ Includes future commitments"
    ((depth_score++))
fi
((total_checks++))

echo "   Depth Score: $depth_score/$total_checks"

if [ "$depth_score" -ge $((total_checks * 3 / 4)) ]; then
    echo "   ✅ Strong depth and reflection quality"
else
    echo "   ⚠️  Consider adding more depth through INNER DIALOGUE, counterfactual thinking, and self-awareness"
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