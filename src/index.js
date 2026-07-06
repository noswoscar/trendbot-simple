// src/index.js - Entry point

const Server = require('./server/Server')
const BotRouter = require('./server/api/BotRouter')
const DataGatherer = require('./services/DataGatherer')
const TradesLogger = require('./services/TradesLogger')
const TrendStrategy = require('./services/strategy/TrendStrategy')
const BreakoutDetector = require('./services/strategy/BreakoutDetector')

// Configuration
const config = {
	port: process.env.BOT_PORT || 6010,
	host: 'localhost',
	priceServiceUrl: process.env.PRICE_SERVICE_URL || 'http://localhost:6001',
	atrSpikeUrl: process.env.ATR_SPIKE_URL || 'http://localhost:6004',
	levelsUrl: process.env.LEVELS_URL || 'http://localhost:6006',
	minConfidence: parseFloat(process.env.MIN_CONFIDENCE) || 0.2,
	positionSize: parseFloat(process.env.POSITION_SIZE) || 100, // Fixed size
	logFile: process.env.LOG_FILE || './data/Trades.csv'
}

console.log('=========================================')
console.log('🤖 TrendBot')
console.log('=========================================')
console.log(`📍 Port: ${config.port}`)
console.log(`📊 Min Confidence: ${config.minConfidence}`)
console.log(`📦 Position Size: ${config.positionSize}`)
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

// 4. Strategy
const strategy = new TrendStrategy({
	minConfidence: config.minConfidence,
	breakoutDetector
})

// 5. Bot Router
const botRouter = new BotRouter({
	dataGatherer,
	strategy,
	tradesLogger,
	positionSize: config.positionSize
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
		console.log('=========================================')
	})
	.catch((error) => {
		console.error('❌ Failed to start:', error.message)
		process.exit(1)
	})

// Graceful shutdown
const shutdown = () => {
	console.log('\n🛑 Shutting down...')
	server
		.stop()
		.then(() => process.exit(0))
		.catch(() => process.exit(1))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
