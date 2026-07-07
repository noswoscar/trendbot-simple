// src/services/strategy/TrendStrategy.js

class TrendStrategy {
	constructor(options = {}) {
		this.minConfidence = options.minConfidence || 0.05
		this.breakoutDetector = options.breakoutDetector
	}

	makeDecision(data, currentPosition = null) {
		const { levels, price, atr } = data
		const currentPrice = price.price

		// 1. Check breakout
		const breakout = this.breakoutDetector.detect(currentPrice, levels)

		// 2. Calculate confidence
		const confidenceResult = this.calculateConfidence(breakout, levels, currentPrice)

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
		if (breakout.type !== 'NONE' && confidenceResult.confidence >= this.minConfidence) {
			const signal = this.generateSignal(breakout, currentPrice)
			if (signal) {
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
			reason: confidenceResult.reasons,
			signal: null
		}
	}

	calculateConfidence(breakout, levels, currentPrice) {
		let confidence = 0
		const reasons = []

		// Breakout signal
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

		// Proximity bonus
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

		// Cap confidence
		confidence = Math.min(confidence, 1.0)

		return { confidence, reasons }
	}

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

	shouldExit(position, currentPrice, levels) {
		// Exit if price moves against us significantly
		const entryPrice = position.entryPrice
		const direction = position.direction

		if (direction === 'LONG') {
			const loss = (entryPrice - currentPrice) / entryPrice
			if (loss > 0.02) return true // 2% stop loss
		} else {
			// SHORT
			const loss = (currentPrice - entryPrice) / entryPrice
			if (loss > 0.02) return true // 2% stop loss
		}

		// Exit if breakout reverses
		const support = levels?.nearestSupport?.price || 0
		const resistance = levels?.nearestResistance?.price || 0

		if (direction === 'LONG' && support > 0 && currentPrice < support) {
			return true // Stop loss hit
		}

		if (direction === 'SHORT' && resistance > 0 && currentPrice > resistance) {
			return true // Stop loss hit
		}

		return false
	}
}

module.exports = TrendStrategy
