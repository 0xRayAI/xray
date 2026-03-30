#!/bin/bash

# StrRay Framework Usage Logger Checker
# Displays current framework component usage logs

echo "🎯 STRRAY FRAMEWORK USAGE LOGGER CHECKER"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "src/core/framework-logger.ts" ]; then
    echo "❌ Error: Not in StrRay project directory"
    echo "Please run from the root of the StrRay project"
    exit 1
fi

echo "📊 Checking framework component status..."
echo ""

# Check for recent StrRay log messages in console history

echo "🔍 Checking for recent framework activity..."

# Check if logs exist and have recent activity
if [ -d "logs/" ] && [ -f "logs/framework/activity.log" ]; then
    echo "✅ Framework activity log found!"

    echo ""
    echo "📄 Recent Log Entries:"
    echo "──────────────────────"
    
    # Show last 10 entries
    tail -10 logs/framework/activity.log
    
    echo ""
    echo "📊 Log Statistics:"
    
    # Count log entries
    TOTAL_ENTRIES=$(wc -l < logs/framework/activity.log | awk '{print $1}')
    SUCCESS_COUNT=$(grep -c "SUCCESS" logs/framework/activity.log)
    ERROR_COUNT=$(grep -c "ERROR" logs/framework/activity.log)
    
    echo "   Total log entries:    $TOTAL_ENTRIES"
    echo "   Success operations: $SUCCESS_COUNT"
    echo "   Error operations:  $ERROR_COUNT"
    echo "   Info operations:   $((TOTAL_ENTRIES - SUCCESS_COUNT - ERROR_COUNT))"
    
    echo ""
    echo "📋 Framework Components with Logging:"
    echo "   • codex-injector (hook executions, validations)"
    echo "   • processor-manager (pre/post processing)"
    echo "   • state-manager (get/set/clear operations)"
    echo "   • boot-orchestrator (initialization sequence)"
    
    echo ""
    echo "🔍 Log Format:"
    echo "   ✅ [component] action - STATUS"
    
    echo ""
    echo "💡 To verify framework is active:"
    echo "   1. Perform an action using a critical tool (write, edit, multiedit, batch)"
    echo "   2. Check console output for StrRay log messages"
    echo "   3. Look for 'codex-injector' and 'processor-manager' activity"

    echo ""
    echo "Framework usage logging is now active and monitoring"
else
    echo "⚠️  No framework activity log found"
    echo "   The log file will be created when framework components are used"
fi

echo ""
echo "🎯 Log check completed!"