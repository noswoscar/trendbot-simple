#!/usr/bin/env bash

# =============================================
# TRADING SYSTEM - ALL SERVICES TEST
# Tests ATR, Levels, and Bot services
# =============================================

HOST="${HOST:-127.0.0.1}"
ATR_PORT="${ATR_PORT:-6003}"
LEVELS_PORT="${LEVELS_PORT:-6006}"
BOT_PORT="${BOT_PORT:-6015}"

ATR_URL="http://${HOST}:${ATR_PORT}"
LEVELS_URL="http://${HOST}:${LEVELS_PORT}"
BOT_URL="http://${HOST}:${BOT_PORT}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BOLD}${CYAN}  📊 TRADING SYSTEM - ALL SERVICES TEST${NC}"
echo "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "${BOLD}📍 ATR Service:${NC}   ${ATR_URL}"
echo "${BOLD}📍 Levels Service:${NC} ${LEVELS_URL}"
echo "${BOLD}📍 Bot Service:${NC}   ${BOT_URL}"
echo ""

# =============================================
# CHECK ALL SERVICES
# =============================================

check_service() {
    local name="$1"
    local url="$2"
    
    echo -n "  ${BOLD}${name}${NC} ... "
    if curl -s --max-time 2 "${url}/health" >/dev/null 2>&1; then
        echo "${GREEN}✅ RUNNING${NC}"
        return 0
    else
        echo "${RED}❌ NOT RUNNING${NC}"
        return 1
    fi
}

echo "${CYAN}${BOLD}🔍 CHECKING SERVICES...${NC}"
echo ""

check_service "ATR Service" "${ATR_URL}"
ATR_OK=$?
check_service "Levels Service" "${LEVELS_URL}"
LEVELS_OK=$?
check_service "Bot Service" "${BOT_URL}"
BOT_OK=$?

echo ""

if [[ $ATR_OK -ne 0 ]] || [[ $LEVELS_OK -ne 0 ]] || [[ $BOT_OK -ne 0 ]]; then
    echo "${RED}❌ One or more services not running. Please start all services.${NC}"
    exit 1
fi

# =============================================
# TEST ATR SERVICE
# =============================================

test_atr() {
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${CYAN}${BOLD}  📐 ATR SERVICE TESTS${NC}"
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 1. Current ATR
    echo "  ${BOLD}1. Current ATR (period 14)${NC}"
    local response=$(curl -s "${ATR_URL}/api/atr/current?period=14&range=1h")
    local atr=$(echo "$response" | jq -r '.atr // "N/A"')
    local price=$(echo "$response" | jq -r '.currentPrice // "N/A"')
    echo "    ATR: ${atr}"
    echo "    Price: ${price}"
    echo ""

    # 2. Multiple periods
    echo "  ${BOLD}2. Multiple Periods${NC}"
    response=$(curl -s "${ATR_URL}/api/atr/multiple?periods=7,14,21,50&range=1h")
    local p7=$(echo "$response" | jq -r '.periods["7"].atr // "N/A"')
    local p14=$(echo "$response" | jq -r '.periods["14"].atr // "N/A"')
    local p21=$(echo "$response" | jq -r '.periods["21"].atr // "N/A"')
    local p50=$(echo "$response" | jq -r '.periods["50"].atr // "N/A"')
    echo "    Period 7:  ${p7}"
    echo "    Period 14: ${p14}"
    echo "    Period 21: ${p21}"
    echo "    Period 50: ${p50}"
    echo ""

    # 3. Ready check
    echo "  ${BOLD}3. Ready Check${NC}"
    response=$(curl -s "${ATR_URL}/api/atr/ready?period=14&range=1h")
    local ready=$(echo "$response" | jq -r '.ready // false')
    local progress=$(echo "$response" | jq -r '.progress // 0')
    if [[ "$ready" == "true" ]]; then
        echo "    ${GREEN}✅ Ready (${progress}%)${NC}"
    else
        echo "    ${YELLOW}⚠️ Not ready (${progress}%)${NC}"
    fi
    echo ""
}

# =============================================
# TEST LEVELS SERVICE
# =============================================

test_levels() {
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${CYAN}${BOLD}  🗺️ LEVELS SERVICE TESTS${NC}"
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 1. Get levels
    echo "  ${BOLD}1. Support & Resistance${NC}"
    local response=$(curl -s "${LEVELS_URL}/api/levels/levels?range=4h")
    local current_price=$(echo "$response" | jq -r '.currentPrice // "N/A"')
    local total=$(echo "$response" | jq -r '.totalLevels // 0')
    local supports_count=$(echo "$response" | jq '.supports | length')
    local resistances_count=$(echo "$response" | jq '.resistances | length')
    echo "    Current Price: ${current_price}"
    echo "    Total Levels: ${total}"
    echo "    Supports: ${supports_count}"
    echo "    Resistances: ${resistances_count}"
    echo ""

    # 2. Nearest levels
    echo "  ${BOLD}2. Nearest Support & Resistance${NC}"
    response=$(curl -s "${LEVELS_URL}/api/levels/nearest?range=4h")
    local support=$(echo "$response" | jq -r '.support.price // "N/A"')
    local support_strength=$(echo "$response" | jq -r '.support.strength // 0')
    local resistance=$(echo "$response" | jq -r '.resistance.price // "N/A"')
    local resistance_strength=$(echo "$response" | jq -r '.resistance.strength // 0')
    
    if [[ "$support" != "N/A" ]] && [[ "$support" != "null" ]]; then
        local dist_sup=$(echo "$current_price - $support" | bc -l 2>/dev/null)
        echo "    Support: ${support} (${dist_sup} pts below) strength: ${support_strength}"
    else
        echo "    Support: ${YELLOW}None found${NC}"
    fi
    
    if [[ "$resistance" != "N/A" ]] && [[ "$resistance" != "null" ]]; then
        local dist_res=$(echo "$resistance - $current_price" | bc -l 2>/dev/null)
        echo "    Resistance: ${resistance} (${dist_res} pts above) strength: ${resistance_strength}"
    else
        echo "    Resistance: ${YELLOW}None found${NC}"
    fi
    echo ""

    # 3. Support levels list
    echo "  ${BOLD}3. Top Supports${NC}"
    response=$(curl -s "${LEVELS_URL}/api/levels/supports?range=4h")
    echo "$response" | jq -r '.supports[] | "    • \(.price) (strength: \(.strength), touches: \(.touches))"' | head -3
    echo ""

    # 4. Resistance levels list
    echo "  ${BOLD}4. Top Resistances${NC}"
    response=$(curl -s "${LEVELS_URL}/api/levels/resistances?range=4h")
    echo "$response" | jq -r '.resistances[] | "    • \(.price) (strength: \(.strength), touches: \(.touches))"' | head -3
    echo ""
}

# =============================================
# TEST BOT SERVICE
# =============================================

test_bot() {
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${CYAN}${BOLD}  🤖 BOT SERVICE TESTS${NC}"
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 1. Bot status
    echo "  ${BOLD}1. Bot Status${NC}"
    local response=$(curl -s "${BOT_URL}/api/bot/status")
    local running=$(echo "$response" | jq -r '.running // false')
    local in_position=$(echo "$response" | jq -r '.inPosition // false')
    local trades=$(echo "$response" | jq -r '.tradesCount // 0')
    local position_size=$(echo "$response" | jq -r '.positionSize // 0')
    echo "    Running: ${running}"
    echo "    In Position: ${in_position}"
    echo "    Trades: ${trades}"
    echo "    Position Size: ${position_size}"
    echo ""

    # 2. Current decision
    echo "  ${BOLD}2. Current Decision${NC}"
    response=$(curl -s "${BOT_URL}/api/bot/decision")
    local action=$(echo "$response" | jq -r '.decision.action // "N/A"')
    local confidence=$(echo "$response" | jq -r '.decision.confidence // 0')
    local reason=$(echo "$response" | jq -r '.decision.reason | join("; ") // "N/A"')
    echo "    Action: ${action}"
    echo "    Confidence: ${confidence}"
    echo "    Reason: ${reason}"
    echo ""

    # 3. Position
    echo "  ${BOLD}3. Current Position${NC}"
    response=$(curl -s "${BOT_URL}/api/bot/position")
    local in_position=$(echo "$response" | jq -r '.inPosition // false')
    if [[ "$in_position" == "true" ]]; then
        local direction=$(echo "$response" | jq -r '.position.direction // "N/A"')
        local entry_price=$(echo "$response" | jq -r '.position.entryPrice // "N/A"')
        local size=$(echo "$response" | jq -r '.position.size // 0')
        echo "    Direction: ${direction}"
        echo "    Entry: ${entry_price}"
        echo "    Size: ${size}"
    else
        echo "    ${YELLOW}No position open${NC}"
    fi
    echo ""

    # 4. Trade history
    echo "  ${BOLD}4. Trade History${NC}"
    response=$(curl -s "${BOT_URL}/api/bot/history")
    local total=$(echo "$response" | jq -r '.stats.totalTrades // 0')
    local wins=$(echo "$response" | jq -r '.stats.wins // 0')
    local losses=$(echo "$response" | jq -r '.stats.losses // 0')
    local win_rate=$(echo "$response" | jq -r '.stats.winRate // 0')
    local total_pnl=$(echo "$response" | jq -r '.stats.totalPnL // 0')
    win_rate=$(echo "$win_rate * 100" | bc -l 2>/dev/null)
    printf "    Total Trades: %s\n" "$total"
    printf "    Wins: %s\n" "$wins"
    printf "    Losses: %s\n" "$losses"
    printf "    Win Rate: %.1f%%\n" "$win_rate"
    printf "    Total PnL: %.2f\n" "$total_pnl"
    echo ""
}

# =============================================
# SUMMARY
# =============================================

print_summary() {
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${CYAN}${BOLD}  📊 SUMMARY${NC}"
    echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Get key metrics
    local atr=$(curl -s "${ATR_URL}/api/atr/current?period=14&range=1h" | jq -r '.atr // "N/A"')
    local levels_response=$(curl -s "${LEVELS_URL}/api/levels/nearest?range=4h")
    local support=$(echo "$levels_response" | jq -r '.support.price // "N/A"')
    local resistance=$(echo "$levels_response" | jq -r '.resistance.price // "N/A"')
    local current_price=$(echo "$levels_response" | jq -r '.currentPrice // "N/A"')
    local bot_action=$(curl -s "${BOT_URL}/api/bot/decision" | jq -r '.decision.action // "N/A"')
    local bot_confidence=$(curl -s "${BOT_URL}/api/bot/decision" | jq -r '.decision.confidence // 0')

    echo "  ${BOLD}📈 Market Data:${NC}"
    echo "    Current Price: ${current_price}"
    echo "    ATR (14): ${atr}"
    echo "    Support: ${support}"
    echo "    Resistance: ${resistance}"
    echo ""
    echo "  ${BOLD}🤖 Bot Status:${NC}"
    echo "    Action: ${bot_action}"
    echo "    Confidence: ${bot_confidence}"
    echo ""

    # Recommendations
    echo "  ${BOLD}💡 Recommendations:${NC}"
    
    if [[ "$support" != "N/A" ]] && [[ "$support" != "null" ]] && [[ "$current_price" != "N/A" ]]; then
        local dist_sup=$(echo "$current_price - $support" | bc -l 2>/dev/null | cut -d. -f1)
        if [[ $dist_sup -lt 100 ]]; then
            echo "    ${YELLOW}⚠️ Price is near support (${dist_sup} pts) - watch for breakdown${NC}"
        fi
    fi
    
    if [[ "$resistance" != "N/A" ]] && [[ "$resistance" != "null" ]] && [[ "$current_price" != "N/A" ]]; then
        local dist_res=$(echo "$resistance - $current_price" | bc -l 2>/dev/null | cut -d. -f1)
        if [[ $dist_res -lt 100 ]]; then
            echo "    ${YELLOW}⚠️ Price is near resistance (${dist_res} pts) - watch for breakout${NC}"
        fi
    fi

    if [[ "$bot_confidence" != "0" ]] && (( $(echo "$bot_confidence > 0.2" | bc -l 2>/dev/null) )); then
        echo "    ${GREEN}✅ Bot confidence is high (${bot_confidence}) - ready to trade!${NC}"
    else
        echo "    ${YELLOW}⏳ Bot waiting for signal (confidence: ${bot_confidence})${NC}"
    fi

    local trades=$(curl -s "${BOT_URL}/api/bot/history" | jq -r '.stats.totalTrades // 0')
    if [[ $trades -gt 0 ]]; then
        echo "    ${GREEN}✅ Bot has made ${trades} trades${NC}"
    else
        echo "    ${YELLOW}⏳ No trades yet - waiting for setup${NC}"
    fi
    echo ""
}

# =============================================
# RUN ALL TESTS
# =============================================

test_atr
test_levels
test_bot
print_summary

echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${CYAN}${BOLD}  ✅ ALL TESTS COMPLETE${NC}"
echo "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Quick commands
echo "${BOLD}💡 Quick Commands:${NC}"
echo "  ${BOLD}View bot decision:${NC} curl ${BOT_URL}/api/bot/decision | jq"
echo "  ${BOLD}Force trade BUY:${NC} curl -X POST ${BOT_URL}/api/bot/trade -H 'Content-Type: application/json' -d '{\"action\":\"BUY\"}' | jq"
echo "  ${BOLD}Force exit:${NC} curl -X POST ${BOT_URL}/api/bot/trade -H 'Content-Type: application/json' -d '{\"action\":\"EXIT\"}' | jq"
echo "  ${BOLD}View position:${NC} curl ${BOT_URL}/api/bot/position | jq"
echo "  ${BOLD}View history:${NC} curl ${BOT_URL}/api/bot/history | jq"
echo ""
