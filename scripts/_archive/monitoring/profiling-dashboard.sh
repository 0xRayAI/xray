#!/bin/bash

echo "📊 0xRay Framework - Profiling Performance Dashboard"
echo "=================================================="

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_dashboard() {
    echo -e "${BLUE}🚀 0xRay Advanced Profiling Dashboard${NC}"
    echo "========================================"

    # Check if profiling directory exists
    if [ ! -d ".strray/profiles" ]; then
        echo -e "${YELLOW}⚠️  No profiling data available yet${NC}"
        echo "   Run the profiling demo first to generate data"
        return
    fi

    # Find latest report
    local latest_report=$(find .strray/profiles -name "performance-report-*.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

    if [ -z "$latest_report" ]; then
        echo -e "${YELLOW}⚠️  No performance reports found${NC}"
        return
    fi

    echo -e "\n📈 Latest Performance Report: $(basename "$latest_report")"
    echo "---------------------------------------------------"

    # Parse and display key metrics
    if command -v jq &> /dev/null; then
        echo -e "\n🤖 Agent Performance Summary:"
        echo "-----------------------------"

        # Extract agent metrics
        jq -r '.agents | to_entries[] | "• \(.key): \(.value.totalOperations) ops, \((.value.successfulOperations / .value.totalOperations * 100) | floor)% success, \(.value.averageDuration | round)ms avg"' "$latest_report" 2>/dev/null || echo "   Unable to parse agent metrics"

        echo -e "\n🌐 System-wide Metrics:"
        echo "-----------------------"
        jq -r '"• Total Operations: \(.system.totalOperations)\n• Success Rate: \((.system.successfulOperations / .system.totalOperations * 100) | floor)%\n• Average Duration: \(.system.averageDuration | round)ms\n• Memory Delta: \((.system.memoryDelta / 1024 / 1024) | round)MB"' "$latest_report" 2>/dev/null || echo "   Unable to parse system metrics"

        echo -e "\n💡 Performance Recommendations:"
        echo "-------------------------------"
        local rec_count=$(jq '.recommendations | length' "$latest_report" 2>/dev/null || echo "0")
        if [ "$rec_count" -gt 0 ]; then
            jq -r '.recommendations[] | "• \(.)\n"' "$latest_report" 2>/dev/null || echo "   Unable to parse recommendations"
        else
            echo -e "${GREEN}• All systems operating optimally${NC}"
        fi

    else
        echo -e "${YELLOW}⚠️  jq not available - displaying raw report${NC}"
        head -20 "$latest_report"
    fi

    echo -e "\n📁 Profiling Data Location: .strray/profiles/"
    local report_count=$(find .strray/profiles -name "*.json" 2>/dev/null | wc -l)
    echo "📊 Total Reports Available: $report_count"

    echo -e "\n${GREEN}✅ Dashboard display completed${NC}"
}

# Show dashboard
show_dashboard
