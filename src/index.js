// src/index.js - Minimal entry point

const Server = require('./server/Server')
const BotRouter = require('./server/api/BotRouter')
const DataGatherer = require('./services/DataGatherer')
const TradesLogger = require('./services/TradesLogger')
const TrendStrategy = require('./services/strategy/TrendStrategy')
const BreakoutDetector = require('./services/strategy/BreakoutDetector')

// Configuration - only what's needed to start the server
const config = {
	port: process.env.BOT_PORT || 6015,
	host: 'localhost',
	priceServiceUrl: process.env.PRICE_SERVICE_URL || 'http://localhost:6001',
	atrSpikeUrl: process.env.ATR_SPIKE_URL || 'http://localhost:6004',
	levelsUrl: process.env.LEVELS_URL || 'http://localhost:6006',
	logFile: process.env.LOG_FILE || './data/Trades.csv'
}

console.log('=========================================')
console.log('🤖 TrendBot')
console.log('=========================================')
console.log(`📍 Port: ${config.port}`)
console.log('=========================================')

// 1. Data Gatherer
const dataGatherer = new DataGatherer({
	atrSpikeUrl: config.atrSpikeUrl,
	levelsUrl: config.levelsUrl,
	priceUrl: config.priceServiceUrl
})

// 2. Trades Logger
const tradesLogger = new TradesLogger({ logFile: config.logFile })

// 3. Breakout Detector
const breakoutDetector = new BreakoutDetector()

// 4. Strategy - ALL configs are inside TrendStrategy
//    Can be overridden via environment variables or options
const strategy = new TrendStrategy({
	breakoutDetector: breakoutDetector,
	tradesLogger: tradesLogger,
	dataGatherer: dataGatherer
})

// 5. Bot Router (MONITORING ONLY)
const botRouter = new BotRouter({
	dataGatherer: dataGatherer,
	strategy: strategy,
	tradesLogger: tradesLogger,
	getPosition: () => strategy.getPosition(),
	getHistory: () => strategy.getHistory(),
	getStatus: () => strategy.getStatus()
})

// 6. Server
const server = new Server({
	port: config.port,
	host: config.host,
	router: botRouter.getRouter()
})

// 7. Start
server
	.start()
	.then(() => {
		console.log(`✅ TrendBot running on http://${config.host}:${config.port}`)
		console.log('📡 Monitoring endpoints:')
		console.log('   GET /api/bot/decision')
		console.log('   GET /api/bot/position')
		console.log('   GET /api/bot/history')
		console.log('   GET /api/bot/status')
		console.log('   GET /api/bot/stats')
		console.log('=========================================')

		// Start auto-trading loop
		strategy.start()
	})
	.catch((error) => {
		console.error('❌ Failed to start:', error.message)
		process.exit(1)
	})

// Graceful shutdown
const shutdown = () => {
	console.log('\n🛑 Shutting down...')
	strategy.stop()
	server
		.stop()
		.then(() => process.exit(0))
		.catch(() => process.exit(1))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
