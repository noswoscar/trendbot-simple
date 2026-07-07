// src/services/strategy/BreakoutDetector.js

class BreakoutDetector {
	constructor(options = {}) {
		// Keep the original nearThreshold as fallback
		this.nearThreshold = options.nearThreshold || 80 // Points

		// New ATR-based settings
		this.atrMultiplier = options.atrMultiplier || 1.5 // How many ATRs from level
		this.atrScale = options.atrScale || 200 // Scale ATR to meaningful point values
		this.minThreshold = options.minThreshold || 30 // Minimum threshold in points
		this.maxThreshold = options.maxThreshold || 300 // Maximum threshold in points
	}

	detect(currentPrice, levels, atrData = null) {
		const support = levels?.nearestSupport
		const resistance = levels?.nearestResistance

		// Calculate dynamic threshold (uses ATR if available)
		const threshold = this.calculateThreshold(atrData)

		// No levels
		if (!support && !resistance) {
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Only support
		if (!resistance && support) {
			const distance = currentPrice - support.price
			if (distance < threshold) {
				return {
					type: 'BREAKDOWN',
					level: support.price,
					strength: support.strength || 0,
					price: currentPrice,
					distance: distance,
					threshold: threshold
				}
			}
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Only resistance
		if (!support && resistance) {
			const distance = resistance.price - currentPrice
			if (distance < threshold) {
				return {
					type: 'BREAKOUT',
					level: resistance.price,
					strength: resistance.strength || 0,
					price: currentPrice,
					distance: distance,
					threshold: threshold
				}
			}
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Both support and resistance
		const distToSupport = currentPrice - support.price
		const distToResistance = resistance.price - currentPrice

		const supportNear = distToSupport < threshold
		const resistanceNear = distToResistance < threshold

		if (supportNear && resistanceNear) {
			return { type: 'VOLATILE', level: null, strength: 0 }
		}

		if (resistanceNear) {
			return {
				type: 'BREAKOUT',
				level: resistance.price,
				strength: resistance.strength || 0,
				price: currentPrice,
				distance: distToResistance,
				threshold: threshold
			}
		}

		if (supportNear) {
			return {
				type: 'BREAKDOWN',
				level: support.price,
				strength: support.strength || 0,
				price: currentPrice,
				distance: distToSupport,
				threshold: threshold
			}
		}

		return { type: 'NONE', level: null, strength: 0 }
	}

	/**
	 * Calculate threshold using ATR or fallback to fixed points
	 * HIGHER ATR = HIGHER threshold = MORE trades
	 * LOWER ATR = LOWER threshold = FEWER trades
	 */
	calculateThreshold(atrData) {
		// Default to fixed threshold
		let threshold = this.nearThreshold

		// If we have ATR data, use it
		if (atrData) {
			const atrValue = this.extractATR(atrData)
			if (atrValue && atrValue > 0) {
				// Scale ATR to meaningful point values
				// ATR 0.25 * 200 = 50 points
				// ATR 0.50 * 200 = 100 points
				// ATR 0.75 * 200 = 150 points
				const scaledATR = atrValue * this.atrScale
				const atrThreshold = scaledATR * this.atrMultiplier
				// Clamp between min and max
				threshold = Math.max(this.minThreshold, Math.min(this.maxThreshold, atrThreshold))
			}
		}

		return threshold
	}

	/**
	 * Extract ATR value from various data formats
	 * FIXED: Properly handles baselines from /status endpoint
	 */
	extractATR(atrData) {
		if (!atrData) return null

		// Case 1: Data from /status endpoint (has baselines)
		// This is what your DataGatherer returns
		if (atrData.baselines) {
			const baselines = atrData.baselines
			// Use baseline directly - it's already an ATR value
			if (baselines['60']) return baselines['60']
			if (baselines['300']) return baselines['300']
			if (baselines['900']) return baselines['900']
		}

		// Case 2: Data from /check endpoint (has atrResults)
		if (atrData.atrResults) {
			const results = atrData.atrResults
			if (results['60'] && results['60'].success) {
				return results['60'].atr
			}
			if (results['300'] && results['300'].success) {
				return results['300'].atr
			}
			if (results['900'] && results['900'].success) {
				return results['900'].atr
			}
		}

		// Case 3: Direct ATR value
		if (atrData.atr) {
			return atrData.atr
		}

		return null
	}
}

module.exports = BreakoutDetector