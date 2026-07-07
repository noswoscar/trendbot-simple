#!/usr/bin/env bash

# =============================================
# TRENDBOT API TEST
# =============================================

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-6015}"
BASE_URL="http://${HOST}:${PORT}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🤖 TRENDBOT API TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  URL: ${BASE_URL}"
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
    local method="${3:-GET}"
    local data="${4:-}"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ${method} ${endpoint}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local response
    if [[ "$method" == "POST" ]] && [[ -n "$data" ]]; then
        response=$(curl -s -X POST -H 'Content-Type: application/json' -d "$data" "${BASE_URL}${endpoint}")
    elif [[ "$method" == "POST" ]]; then
        response=$(curl -s -X POST "${BASE_URL}${endpoint}")
    else
        response=$(curl -s "${BASE_URL}${endpoint}")
    fi
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo "$response" | jq '.'
    else
        echo "$response"
    fi
    echo ""
}

# Run all tests
call "Health" "/health"
call "Decision" "/api/bot/decision"
call "Position" "/api/bot/position"
call "History" "/api/bot/history"
call "Status" "/api/bot/status"

# Test trade
call "Trade (BUY)" "/api/bot/trade" "POST" '{"action":"BUY"}'
call "Position after trade" "/api/bot/position"
call "Exit trade" "/api/bot/trade" "POST" '{"action":"EXIT"}'
call "Position after exit" "/api/bot/position"
call "History after trades" "/api/bot/history"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DONE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
