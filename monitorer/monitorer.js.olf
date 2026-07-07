// monitor.js - Simple Bot Monitor
// Run with: node monitor.js

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const config = {
	atrUrl: 'http://127.0.0.1:6003',
	levelsUrl: 'http://127.0.0.1:6006',
	botUrl: 'http://127.0.0.1:6015',
	checkInterval: 5000, // Check every 5 seconds
	logFile: './monitor.log'
}

// State tracking
let lastTrades = 0
let lastPrice = 0
let lastSupport = 0
let lastResistance = 0
let lastATR = 0
let errorCount = 0
let lastErrorTime = 0
let startTime = Date.now()

// Colors for console
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m'
}

// Log to file
function logToFile(message) {
	const timestamp = new Date().toISOString()
	fs.appendFileSync(config.logFile, `[${timestamp}] ${message}\n`)
}

// Print colored message
function print(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

// Check service health
async function checkService(url, name) {
	try {
		const response = await axios.get(`${url}/health`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Get bot status
async function getBotStatus() {
	try {
		const response = await axios.get(`${config.botUrl}/api/bot/status`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Get bot decision
async function getBotDecision() {
	try {
		const response = await axios.get(`${config.botUrl}/api/bot/decision`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Get bot history
async function getBotHistory() {
	try {
		const response = await axios.get(`${config.botUrl}/api/bot/history`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Get levels
async function getLevels() {
	try {
		const response = await axios.get(`${config.levelsUrl}/api/levels/nearest?range=4h`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Get ATR
async function getATR() {
	try {
		const response = await axios.get(`${config.atrUrl}/api/atr/current?period=14&range=1h`, { timeout: 2000 })
		return { ok: true, data: response.data }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

// Print header
function printHeader() {
	console.clear()
	print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
	print('  🤖 BOT MONITOR', 'cyan')
	print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
	print(`  Started: ${new Date(startTime).toLocaleTimeString()}`, 'blue')
	print(`  Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`, 'blue')
	print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
	console.log('')
}

// Main monitor loop
async function monitor() {
	let statusLine = 0

	while (true) {
		try {
			// Check all services
			const [atrHealth, levelsHealth, botHealth] = await Promise.all([
				checkService(config.atrUrl, 'ATR'),
				checkService(config.levelsUrl, 'Levels'),
				checkService(config.botUrl, 'Bot')
			])

			// Get data
			const [botStatus, botDecision, botHistory, levels, atr] = await Promise.all([
				getBotStatus(),
				getBotDecision(),
				getBotHistory(),
				getLevels(),
				getATR()
			])

			// Clear screen and print header
			printHeader()

			// =============================================
			// SERVICE STATUS
			// =============================================
			print('📡 SERVICE STATUS:', 'yellow')
			console.log('')

			const services = [
				{ name: 'ATR', status: atrHealth, url: config.atrUrl },
				{ name: 'Levels', status: levelsHealth, url: config.levelsUrl },
				{ name: 'Bot', status: botHealth, url: config.botUrl }
			]

			let allOk = true
			for (const svc of services) {
				const icon = svc.status.ok ? '✅' : '❌'
				const color = svc.status.ok ? 'green' : 'red'
				print(`  ${icon} ${svc.name}: ${svc.status.ok ? 'OK' : 'DOWN'}`, color)
				if (!svc.status.ok) {
					allOk = false
					print(`     Error: ${svc.status.error}`, 'red')
				}
			}
			console.log('')

			// =============================================
			// MARKET DATA
			// =============================================
			if (levels.ok && atr.ok) {
				const price = levels.data.currentPrice || 0
				const support = levels.data.support?.price || 0
				const resistance = levels.data.resistance?.price || 0
				const atrValue = atr.data.atr || 0

				print('📊 MARKET DATA:', 'yellow')
				console.log('')
				print(`  💰 Price: ${price.toFixed(2)}`, 'cyan')
				print(`  📐 ATR: ${atrValue.toFixed(4)}`, 'cyan')
				print(`  🟢 Support: ${support.toFixed(2)}`, 'green')
				print(`  🔴 Resistance: ${resistance.toFixed(2)}`, 'red')

				// Distance to levels
				if (support > 0) {
					const distSup = price - support
					const colorSup = distSup < 50 ? 'red' : distSup < 100 ? 'yellow' : 'green'
					print(`     Distance to Support: ${distSup.toFixed(2)} pts`, colorSup)
				}
				if (resistance > 0) {
					const distRes = resistance - price
					const colorRes = distRes < 50 ? 'red' : distRes < 100 ? 'yellow' : 'green'
					print(`     Distance to Resistance: ${distRes.toFixed(2)} pts`, colorRes)
				}
				console.log('')

				// Alert for price near levels
				if (support > 0 && price - support < 50) {
					print('⚠️ WARNING: Price near support! Watch for breakdown!', 'red')
				}
				if (resistance > 0 && resistance - price < 50) {
					print('⚠️ WARNING: Price near resistance! Watch for breakout!', 'red')
				}
				console.log('')

				// Update tracking
				lastPrice = price
				lastSupport = support
				lastResistance = resistance
				lastATR = atrValue
			}

			// =============================================
			// BOT STATUS
			// =============================================
			if (botStatus.ok) {
				print('🤖 BOT STATUS:', 'yellow')
				console.log('')
				const inPosition = botStatus.data.inPosition || false
				print(`  📊 In Position: ${inPosition ? '✅ YES' : '❌ NO'}`, inPosition ? 'green' : 'yellow')
				print(`  📈 Trades: ${botStatus.data.tradesCount || 0}`, 'cyan')
				print(`  📦 Position Size: ${botStatus.data.positionSize || 0}`, 'cyan')

				if (inPosition && botStatus.data.position) {
					const pos = botStatus.data.position
					print(`     Direction: ${pos.direction || 'N/A'}`, 'cyan')
					print(`     Entry: ${pos.entryPrice || 0}`, 'cyan')
					print(`     Size: ${pos.size || 0}`, 'cyan')
				}
				console.log('')
			}

			// =============================================
			// CURRENT DECISION
			// =============================================
			if (botDecision.ok) {
				const decision = botDecision.data.decision || {}
				const action = decision.action || 'UNKNOWN'
				const confidence = decision.confidence || 0
				const reasons = decision.reason || ['No reason']

				print('🎯 CURRENT DECISION:', 'yellow')
				console.log('')
				const color = action === 'BUY' ? 'green' : action === 'SELL' ? 'red' : 'yellow'
				print(`  Action: ${action}`, color)
				print(`  Confidence: ${(confidence * 100).toFixed(1)}%`, 'cyan')
				print(`  Reasons:`, 'blue')
				for (const reason of reasons.slice(0, 3)) {
					print(`    • ${reason}`, 'blue')
				}
				console.log('')
			}

			// =============================================
			// TRADE HISTORY
			// =============================================
			if (botHistory.ok) {
				const stats = botHistory.data.stats || {}
				const total = stats.totalTrades || 0
				const wins = stats.wins || 0
				const losses = stats.losses || 0
				const winRate = stats.winRate || 0
				const totalPnL = stats.totalPnL || 0

				print('📊 TRADE HISTORY:', 'yellow')
				console.log('')
				print(`  Total Trades: ${total}`, 'cyan')
				print(`  Wins: ${wins}`, 'green')
				print(`  Losses: ${losses}`, 'red')
				print(`  Win Rate: ${(winRate * 100).toFixed(1)}%`, 'cyan')
				print(`  Total PnL: ${totalPnL.toFixed(2)}`, totalPnL >= 0 ? 'green' : 'red')

				// Alert for new trades
				if (total > lastTrades) {
					print(`  🎯 NEW TRADE DETECTED! (${total - lastTrades} new)`, 'green')
					logToFile(`New trade detected! Total: ${total}`)
				}
				lastTrades = total
				console.log('')
			}

			// =============================================
			// ALERTS
			// =============================================
			print('🔔 ALERTS:', 'yellow')
			console.log('')

			let alerts = 0

			// Check for errors
			if (!atrHealth.ok) {
				print('  ❌ ATR Service is DOWN!', 'red')
				alerts++
			}
			if (!levelsHealth.ok) {
				print('  ❌ Levels Service is DOWN!', 'red')
				alerts++
			}
			if (!botHealth.ok) {
				print('  ❌ Bot Service is DOWN!', 'red')
				alerts++
			}

			// Check for unusual data
			if (levels.ok) {
				const price = levels.data.currentPrice || 0
				if (price === 0) {
					print('  ❌ Price is ZERO! Check price service!', 'red')
					alerts++
				}
				if (price > 100000 || price < 1000) {
					print(`  ⚠️ Unusual price: ${price}`, 'yellow')
					alerts++
				}
			}

			if (atr.ok) {
				const atrValue = atr.data.atr || 0
				if (atrValue < 0.01) {
					print('  ⚠️ ATR is very low! Market may be dead.', 'yellow')
					alerts++
				}
				if (atrValue > 100) {
					print('  ⚠️ ATR is very high! Extreme volatility!', 'red')
					alerts++
				}
			}

			// Check for price moving away from levels
			if (levels.ok) {
				const support = levels.data.support?.price || 0
				const resistance = levels.data.resistance?.price || 0
				const price = levels.data.currentPrice || 0

				if (support > 0 && Math.abs(price - support) > 1000) {
					print('  ⚠️ Price far from support (>1000 pts)', 'yellow')
					alerts++
				}
				if (resistance > 0 && Math.abs(resistance - price) > 1000) {
					print('  ⚠️ Price far from resistance (>1000 pts)', 'yellow')
					alerts++
				}
			}

			// Check bot confidence
			if (botDecision.ok) {
				const confidence = botDecision.data.decision?.confidence || 0
				if (confidence > 0.6) {
					print(`  🚀 HIGH CONFIDENCE: ${(confidence * 100).toFixed(1)}%`, 'green')
					alerts++
				}
				if (confidence > 0.8) {
					print(`  🚨 VERY HIGH CONFIDENCE: ${(confidence * 100).toFixed(1)}%`, 'green')
					alerts++
				}
			}

			if (alerts === 0) {
				print('  ✅ No alerts - system running smoothly', 'green')
			}

			console.log('')
			print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
			print(`  🔄 Next check in ${config.checkInterval / 1000}s | Press Ctrl+C to exit`, 'blue')
			print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')

			// Wait before next check
			await sleep(config.checkInterval)
		} catch (error) {
			print(`❌ Monitor error: ${error.message}`, 'red')
			logToFile(`ERROR: ${error.message}`)
			await sleep(5000)
		}
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

// Handle exit
process.on('SIGINT', () => {
	print('\n\n👋 Shutting down monitor...', 'yellow')
	logToFile('Monitor stopped')
	process.exit(0)
})

process.on('SIGTERM', () => {
	print('\n\n👋 Shutting down monitor...', 'yellow')
	logToFile('Monitor stopped')
	process.exit(0)
})

// Start monitor
console.log('')
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
print('  🤖 BOT MONITOR STARTING...', 'cyan')
print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
console.log('')
print(`  📊 Monitoring:`, 'yellow')
print(`     ATR: ${config.atrUrl}`, 'blue')
print(`     Levels: ${config.levelsUrl}`, 'blue')
print(`     Bot: ${config.botUrl}`, 'blue')
console.log('')
print(`  ⏱️ Check Interval: ${config.checkInterval / 1000}s`, 'yellow')
print(`  📝 Log File: ${config.logFile}`, 'yellow')
console.log('')
print('  Press Ctrl+C to stop', 'yellow')
console.log('')

// Create log file
fs.writeFileSync(config.logFile, `[${new Date().toISOString()}] Monitor started\n`)

// Start monitoring
monitor()
