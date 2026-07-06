// src/services/DataGatherer.js

const axios = require('axios')

class DataGatherer {
	constructor(options = {}) {
		this.atrSpikeUrl = options.atrSpikeUrl || 'http://localhost:6004'
		this.levelsUrl = options.levelsUrl || 'http://localhost:6006'
		this.priceUrl = options.priceUrl || 'http://localhost:6001'
		this.timeout = options.timeout || 5000
	}

	async gatherAllData() {
		try {
			const [atrStatus, levels, price] = await Promise.all([
				this.getATRStatus(),
				this.getLevels(),
				this.getCurrentPrice()
			])

			return {
				success: true,
				atr: atrStatus,
				levels: levels,
				price: price,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			return {
				success: false,
				error: error.message
			}
		}
	}

	async getATRStatus() {
		try {
			const response = await axios.get(`${this.atrSpikeUrl}/status`, { timeout: this.timeout })
			if (response.data.success !== false) {
				return {
					success: true,
					volatilityState: response.data.status || 'NORMAL',
					stats: response.data.stats || {},
					baselines: response.data.baselines || {}
				}
			}
			return { success: false, error: response.data.error }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}

	async getLevels(range = '4h') {
		try {
			const response = await axios.get(`${this.levelsUrl}/api/levels/levels?range=${range}`, { timeout: this.timeout })

			if (response.data.success) {
				return {
					success: true,
					supports: response.data.supports || [],
					resistances: response.data.resistances || [],
					nearestSupport: response.data.nearestSupport,
					nearestResistance: response.data.nearestResistance,
					currentPrice: response.data.currentPrice,
					totalLevels: response.data.totalLevels
				}
			}
			return { success: false, error: response.data.error }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}

	async getCurrentPrice() {
		try {
			const response = await axios.get(`${this.priceUrl}/api/prices/stored/current`, { timeout: this.timeout })

			if (response.data.success) {
				return {
					success: true,
					price: response.data.data.price,
					timestamp: response.data.data.timestamp
				}
			}
			return { success: false, error: response.data.error }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
}

module.exports = DataGatherer
