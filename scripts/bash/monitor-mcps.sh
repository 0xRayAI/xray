#!/bin/bash

# StrRay MCP Monitoring Script
# Watch MCP processes and memory before/after tasks

echo "============================================================"
echo "🔬 StrRay MCP Process Monitor"
echo "============================================================"

while true; do
    TIMESTAMP=$(date "+%H:%M:%S")
    
    # Count MCP processes
    MCP_COUNT=$(ps aux | grep -c "node.*dist/mcps" | grep -v grep || echo "0")
    
    # OpenCode memory in MB
    OPENCODE_MEM=$(ps aux | grep "opencode.*continue" | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    
    # Total node memory in MB  
    NODE_MEM=$(ps aux | grep "node" | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    
    echo "[$TIMESTAMP] MCPs: $MCP_COUNT | OpenCode: ${OPENCODE_MEM:-0}MB | Node: ${NODE_MEM:-0}MB"
    
    # List MCP processes
    ps aux | grep "node.*dist/mcps" | grep -v grep | awk '{print "  - " $11 " " $12}' | head -10
    
    sleep 3
done
