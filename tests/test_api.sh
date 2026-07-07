#!/usr/bin/env bash

# =============================================
# TRENDBOT API TEST - MONITORING ONLY
# =============================================

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-6015}"
BASE_URL="http://${HOST}:${PORT}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🤖 TRENDBOT API TEST (MONITORING ONLY)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  URL: ${BASE_URL}"
echo "  ℹ️  Bot auto-trades - no manual trade endpoints"
echo ""

# Check if service is running
echo "  Checking service..."
if ! curl -s --max-time 2 "${BASE_URL}/health" >/dev/null 2>&1; then
    echo "  ❌ Service not running on ${BASE_URL}"
    exit 1
fi
echo "  ✅ Service is running"
echo ""

# Function to call endpoint
call() {
    local name="$1"
    local endpoint="$2"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  GET ${endpoint}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local response=$(curl -s "${BASE_URL}${endpoint}")
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo "$response" | jq '.'
    else
        echo "$response"
    fi
    echo ""
}

# Run all monitoring endpoints
call "Health" "/health"
call "Decision" "/api/bot/decision"
call "Position" "/api/bot/position"
call "History" "/api/bot/history"
call "Status" "/api/bot/status"
call "Stats" "/api/bot/stats"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 QUICK SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract and display key info from responses
DECISION=$(curl -s "${BASE_URL}/api/bot/decision")
ACTION=$(echo "$DECISION" | jq -r '.decision.action // "N/A"')
CONFIDENCE=$(echo "$DECISION" | jq -r '.decision.confidence // 0')
IN_POSITION=$(echo "$DECISION" | jq -r '.position // false')

STATUS=$(curl -s "${BASE_URL}/api/bot/status")
TRADES=$(echo "$STATUS" | jq -r '.tradesCount // 0')

echo "  ${BOLD}Bot Status:${NC}"
echo "    Action: ${ACTION}"
echo "    Confidence: $(echo "$CONFIDENCE * 100" | bc -l 2>/dev/null)%"
echo "    In Position: ${IN_POSITION}"
echo "    Total Trades: ${TRADES}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DONE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""