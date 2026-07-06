// src/services/strategy/BreakoutDetector.js

class BreakoutDetector {
	constructor(options = {}) {
		this.minDistanceMultiplier = options.minDistanceMultiplier || 0.1
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
			const isNear = distance < support.price * this.minDistanceMultiplier
			if (isNear && distance < 10) {
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
			const isNear = distance < resistance.price * this.minDistanceMultiplier
			if (isNear && distance < 10) {
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
		const supportNear = distToSupport < 10
		const resistanceNear = distToResistance < 10

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
