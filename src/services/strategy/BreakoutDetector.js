// src/services/strategy/BreakoutDetector.js

class BreakoutDetector {
	constructor(options = {}) {
		// Change from 0.1 (10%) to a fixed point threshold
		this.nearThreshold = options.nearThreshold || 225 // Points, not percentage
	}

	detect(currentPrice, levels) {
		const support = levels?.nearestSupport
		const resistance = levels?.nearestResistance

		// No levels
		if (!support && !resistance) {
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Only support
		if (!resistance && support) {
			const distance = currentPrice - support.price
			// Remove percentage check, just use point threshold
			if (distance < this.nearThreshold) {
				return {
					type: 'BREAKDOWN',
					level: support.price,
					strength: support.strength || 0,
					price: currentPrice
				}
			}
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Only resistance
		if (!support && resistance) {
			const distance = resistance.price - currentPrice
			if (distance < this.nearThreshold) {
				return {
					type: 'BREAKOUT',
					level: resistance.price,
					strength: resistance.strength || 0,
					price: currentPrice
				}
			}
			return { type: 'NONE', level: null, strength: 0 }
		}

		// Both support and resistance
		const distToSupport = currentPrice - support.price
		const distToResistance = resistance.price - currentPrice

		// Use threshold for both
		const supportNear = distToSupport < this.nearThreshold
		const resistanceNear = distToResistance < this.nearThreshold

		if (supportNear && resistanceNear) {
			return { type: 'VOLATILE', level: null, strength: 0 }
		}

		if (resistanceNear) {
			return {
				type: 'BREAKOUT',
				level: resistance.price,
				strength: resistance.strength || 0,
				price: currentPrice
			}
		}

		if (supportNear) {
			return {
				type: 'BREAKDOWN',
				level: support.price,
				strength: support.strength || 0,
				price: currentPrice
			}
		}

		return { type: 'NONE', level: null, strength: 0 }
	}
}

module.exports = BreakoutDetector
