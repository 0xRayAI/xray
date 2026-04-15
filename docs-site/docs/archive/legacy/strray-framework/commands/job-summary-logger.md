#!/bin/bash

# 0xRay Framework - AI Summary Auto-Logger

# Automatically captures and logs whatever AI outputs as final summary

echo "🤖 0xRay AI Summary Auto-Logger"
echo "==============================="

# This script captures whatever content is piped to it and logs it automatically

# No special signals needed - just pipe any AI summary output to this command

# Read summary from stdin (piped from AI output)

if [ ! -t 0 ]; then
SUMMARY_CONTENT=$(cat)
    if [ -n "$SUMMARY_CONTENT" ]; then
echo "✅ Captured AI summary output - logging to REFACTORING_LOG.md..."
export STRRAY_SUMMARY_CONTENT="$SUMMARY_CONTENT"
tail -n +6 strray/commands/summary-logger.md | bash 2>/dev/null
echo "✅ AI summary automatically logged!"
else
echo "❌ No summary content received"
exit 1
fi
else
echo "❌ No piped input detected."
echo "Usage: echo 'AI summary content' | bash strray/commands/job-summary-logger.md"
echo "This will automatically log whatever AI outputs to REFACTORING_LOG.md"
exit 1
fi
