// src/services/strategy/TrendStrategy.js - WITH AUTO-TRADING LOOP & DEBUG LOGGING

class TrendStrategy {
	constructor(options = {}) {
		this.minConfidence = options.minConfidence || 0.05
		this.breakoutDetector = options.breakoutDetector
		this.positionSize = options.positionSize || 100

		// Trading state
		this.currentPosition = null
		this.positionHistory = []
		this.lastDecision = null
		this.isRunning = false

		// Trade logging
		this.tradesLogger = options.tradesLogger || null
		this.dataGatherer = options.dataGatherer || null

		// Loop control
		this.checkInterval = options.checkInterval || 5000 // 5 seconds
		this.loopInterval = null

		// Debug flag
		this.debug = options.debug !== undefined ? options.debug : true
	}

	// =============================================
	// START AUTO-TRADING LOOP
	// =============================================

	start() {
		if (this.isRunning) {
			console.log('⚠️ Strategy already running')
			return
		}

		this.isRunning = true
		console.log(`🔄 Auto-trading started (checking every ${this.checkInterval / 1000}s)`)

		// Run immediately
		this.tick()

		// Then run on interval
		this.loopInterval = setInterval(() => {
			this.tick()
		}, this.checkInterval)
	}

	// =============================================
	// STOP AUTO-TRADING LOOP
	// =============================================

	stop() {
		this.isRunning = false
		if (this.loopInterval) {
			clearInterval(this.loopInterval)
			this.loopInterval = null
		}
		console.log('🛑 Auto-trading stopped')
	}

	// =============================================
	// MAIN TICK (Called every interval)
	// =============================================

	async tick() {
		try {
			// Skip if no data gatherer
			if (!this.dataGatherer) {
				if (this.debug) console.log('⚠️ No data gatherer - skipping tick')
				return
			}

			// Fetch data
			const data = await this.dataGatherer.gatherAllData()
			if (!data.success) {
				console.log('❌ Failed to gather data:', data.error)
				return
			}

			const currentPrice = data.price.price

			// Make decision
			const decision = this.makeDecision(data, this.currentPosition)
			this.lastDecision = decision

			if (this.debug) {
				console.log(
					`📊 TICK: Price=${currentPrice}, Action=${decision.action}, Confidence=${(decision.confidence * 100).toFixed(1)}%`
				)
				if (decision.signal) {
					console.log(`   Signal: ${decision.signal.action} ${decision.signal.direction}`)
				}
				if (decision.reason && decision.reason.length > 0) {
					console.log(`   Reasons: ${decision.reason.join('; ')}`)
				}
			}

			// Check if we should enter
			if ((decision.action === 'BUY' || decision.action === 'SELL') && !this.currentPosition) {
				console.log(
					`🚀 AUTO-TRADE: ${decision.action} at ${currentPrice} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`
				)
				this.enterPosition(decision, currentPrice)
				return
			}

			// Check if we should exit
			if (this.currentPosition && decision.action === 'EXIT') {
				console.log(`🚪 AUTO-EXIT: Exiting position at ${currentPrice}`)
				this.exitPosition(currentPrice)
				return
			}

			// If in position but no exit signal, check stop loss
			if (this.currentPosition) {
				const shouldExit = this.shouldExit(this.currentPosition, currentPrice, data.levels)
				if (shouldExit) {
					console.log(`🛑 STOP LOSS: Exiting position at ${currentPrice}`)
					this.exitPosition(currentPrice)
				}
			}
		} catch (error) {
			console.error('❌ Auto-trade error:', error.message)
			if (this.debug) console.error(error.stack)
		}
	}

	// =============================================
	// MAKE DECISION (Public - used by router too)
	// =============================================

	makeDecision(data, currentPosition = null) {
		const { levels, price } = data
		const currentPrice = price.price
		const atr = data.atr || null

		// 1. Check breakout
		const breakout = this.breakoutDetector.detect(currentPrice, levels, atr)

		if (this.debug) {
			console.log(`   Breakout: type=${breakout.type}, level=${breakout.level}, strength=${breakout.strength}`)
		}

		// 2. Calculate confidence
		const confidenceResult = this.calculateConfidence(breakout, levels, currentPrice)

		if (this.debug) {
			console.log(`   Confidence: ${confidenceResult.confidence}, reasons: ${confidenceResult.reasons.join('; ')}`)
		}

		// 3. If in position, check exit
		if (currentPosition) {
			const shouldExit = this.shouldExit(currentPosition, currentPrice, levels)
			if (shouldExit) {
				return {
					action: 'EXIT',
					confidence: 1.0,
					reason: ['Exit signal triggered'],
					signal: null
				}
			}
		}

		// 4. Check entry
		const hasBreakout = breakout.type !== 'NONE'
		const meetsConfidence = confidenceResult.confidence >= this.minConfidence

		if (this.debug) {
			console.log(
				`   Entry check: hasBreakout=${hasBreakout}, meetsConfidence=${meetsConfidence} (min=${this.minConfidence})`
			)
		}

		if (hasBreakout && meetsConfidence) {
			const signal = this.generateSignal(breakout, currentPrice)
			if (signal) {
				if (this.debug) console.log(`   ✅ GENERATED SIGNAL: ${signal.action}`)
				return {
					action: signal.action,
					confidence: confidenceResult.confidence,
					reason: confidenceResult.reasons,
					signal: signal
				}
			}
		}

		// 5. Default: Hold
		return {
			action: 'HOLD',
			confidence: confidenceResult.confidence,
			reason: confidenceResult.reasons.length > 0 ? confidenceResult.reasons : ['No decision yet'],
			signal: null
		}
	}

	// =============================================
	// GET LAST DECISION
	// =============================================

	getLastDecision() {
		return this.lastDecision
	}

	// =============================================
	// GET POSITION
	// =============================================

	getPosition() {
		return this.currentPosition
	}

	// =============================================
	// GET HISTORY
	// =============================================

	getHistory() {
		return this.positionHistory
	}

	// =============================================
	// GET STATUS
	// =============================================

	getStatus() {
		return {
			running: this.isRunning,
			positionSize: this.positionSize,
			tradesCount: this.positionHistory.length,
			inPosition: this.currentPosition !== null
		}
	}

	// =============================================
	// ENTER POSITION
	// =============================================

	enterPosition(decision, currentPrice) {
		if (this.currentPosition) {
			console.log('❌ Already in position')
			return false
		}

		const signal = decision.signal
		if (!signal) {
			console.log('❌ No signal in decision')
			return false
		}

		const direction = signal.direction

		const position = {
			id: `${Date.now()}-${direction}`,
			direction: direction,
			entryPrice: currentPrice,
			entryTime: new Date().toISOString(),
			size: this.positionSize,
			exitPrice: null,
			exitTime: null,
			pnl: null,
			entryConfidence: decision.confidence,
			entryReason: decision.reason
		}

		this.currentPosition = position
		this.positionHistory.push(position)

		// Log to CSV
		if (this.tradesLogger) {
			this.tradesLogger.logEntry(position)
		}

		console.log(`✅ POSITION ENTERED: ${direction} at ${currentPrice}`)
		return true
	}

	// =============================================
	// EXIT POSITION
	// =============================================

	exitPosition(currentPrice) {
		if (!this.currentPosition) {
			console.log('❌ No position to exit')
			return false
		}

		const position = this.currentPosition
		const pnl = this.calculatePnL(position, currentPrice)

		position.exitPrice = currentPrice
		position.exitTime = new Date().toISOString()
		position.pnl = pnl

		// Log to CSV
		if (this.tradesLogger) {
			this.tradesLogger.logExit(position)
		}

		this.currentPosition = null

		console.log(`✅ POSITION EXITED: PnL=${pnl.toFixed(2)}`)
		return true
	}

	// =============================================
	// CALCULATE PNL
	// =============================================

	calculatePnL(position, exitPrice) {
		const direction = position.direction
		const entryPrice = position.entryPrice
		const size = position.size

		if (direction === 'LONG') {
			return (exitPrice - entryPrice) * size
		} else {
			return (entryPrice - exitPrice) * size
		}
	}

	// =============================================
	// CALCULATE CONFIDENCE
	// =============================================

	calculateConfidence(breakout, levels, currentPrice) {
		let confidence = 0
		const reasons = []

		if (breakout.type === 'BREAKOUT') {
			confidence += 0.4
			reasons.push(`📈 Breakout above ${breakout.level.toFixed(2)}`)
			if (breakout.strength > 100) {
				confidence += 0.2
				reasons.push('✅ Very strong level')
			} else if (breakout.strength > 50) {
				confidence += 0.1
				reasons.push('✅ Strong level')
			}
		} else if (breakout.type === 'BREAKDOWN') {
			confidence += 0.4
			reasons.push(`📉 Breakdown below ${breakout.level.toFixed(2)}`)
			if (breakout.strength > 100) {
				confidence += 0.2
				reasons.push('✅ Very strong level')
			} else if (breakout.strength > 50) {
				confidence += 0.1
				reasons.push('✅ Strong level')
			}
		} else {
			reasons.push('No breakout detected')
		}

		const support = levels?.nearestSupport
		const resistance = levels?.nearestResistance

		if (support) {
			const dist = currentPrice - support.price
			if (dist < 20 && dist > 0) {
				confidence += 0.1
				reasons.push(`Near support (${dist.toFixed(0)} pts)`)
			}
		}

		if (resistance) {
			const dist = resistance.price - currentPrice
			if (dist < 20 && dist > 0) {
				confidence += 0.1
				reasons.push(`Near resistance (${dist.toFixed(0)} pts)`)
			}
		}

		confidence = Math.min(confidence, 1.0)

		// Make sure we have at least one reason
		if (reasons.length === 0) {
			reasons.push('No confidence factors')
		}

		return { confidence, reasons }
	}

	// =============================================
	// GENERATE SIGNAL
	// =============================================

	generateSignal(breakout, currentPrice) {
		if (breakout.type === 'BREAKOUT') {
			return {
				action: 'BUY',
				direction: 'LONG',
				entryPrice: currentPrice,
				breakout: breakout
			}
		}

		if (breakout.type === 'BREAKDOWN') {
			return {
				action: 'SELL',
				direction: 'SHORT',
				entryPrice: currentPrice,
				breakout: breakout
			}
		}

		return null
	}

	// =============================================
	// SHOULD EXIT
	// =============================================

	shouldExit(position, currentPrice, levels) {
		const entryPrice = position.entryPrice
		const direction = position.direction

		// 2% stop loss
		if (direction === 'LONG') {
			const loss = (entryPrice - currentPrice) / entryPrice
			if (loss > 0.02) return true
		} else {
			const loss = (currentPrice - entryPrice) / entryPrice
			if (loss > 0.02) return true
		}

		// Breakout reversal
		const support = levels?.nearestSupport?.price || 0
		const resistance = levels?.nearestResistance?.price || 0

		if (direction === 'LONG' && support > 0 && currentPrice < support) {
			return true
		}

		if (direction === 'SHORT' && resistance > 0 && currentPrice > resistance) {
			return true
		}

		return false
	}
}

module.exports = TrendStrategy
