// src/server/api/BotRouter.js - MONITORING ONLY (Read-only)

const express = require('express')

class BotRouter {
	constructor(options = {}) {
		this.router = express.Router()
		this.dataGatherer = options.dataGatherer
		this.strategy = options.strategy
		this.tradesLogger = options.tradesLogger
		this.getPosition = options.getPosition || (() => null)
		this.getHistory = options.getHistory || (() => [])
		this.getStatus = options.getStatus || (() => ({}))

		this.setupRoutes()
	}

	setupRoutes() {
		// Get current decision
		this.router.get('/decision', async (req, res) => {
			try {
				const data = await this.dataGatherer.gatherAllData()
				if (!data.success) {
					return res.status(500).json({
						success: false,
						error: data.error
					})
				}

				const decision = this.strategy.getLastDecision() || {
					action: 'HOLD',
					confidence: 0,
					reason: ['No decision yet']
				}

				res.json({
					success: true,
					decision: decision,
					position: this.getPosition(),
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				res.status(500).json({
					success: false,
					error: error.message
				})
			}
		})

		// Get position
		this.router.get('/position', (req, res) => {
			res.json({
				success: true,
				inPosition: this.getPosition() !== null,
				position: this.getPosition(),
				timestamp: new Date().toISOString()
			})
		})

		// Get history
		this.router.get('/history', (req, res) => {
			const limit = parseInt(req.query.limit) || 100
			const history = this.getHistory().slice(-limit)

			const trades = history.filter((p) => p.exitPrice)
			const wins = trades.filter((p) => p.pnl > 0)
			const losses = trades.filter((p) => p.pnl < 0)
			const totalPnL = trades.reduce((sum, p) => sum + p.pnl, 0)

			res.json({
				success: true,
				count: history.length,
				history: history,
				stats: {
					totalTrades: trades.length,
					wins: wins.length,
					losses: losses.length,
					winRate: trades.length > 0 ? wins.length / trades.length : 0,
					totalPnL: totalPnL,
					avgPnL: trades.length > 0 ? totalPnL / trades.length : 0
				},
				timestamp: new Date().toISOString()
			})
		})

		// Get status
		this.router.get('/status', (req, res) => {
			const status = this.getStatus()
			res.json({
				success: true,
				running: status.running !== undefined ? status.running : true,
				inPosition: this.getPosition() !== null,
				position: this.getPosition(),
				tradesCount: this.getHistory().length,
				positionSize: status.positionSize || 100,
				timestamp: new Date().toISOString()
			})
		})

		// Get stats from CSV
		this.router.get('/stats', (req, res) => {
			try {
				const stats = this.tradesLogger.getStats()
				res.json({
					success: true,
					stats: stats,
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				res.status(500).json({
					success: false,
					error: error.message
				})
			}
		})
	}

	getRouter() {
		return this.router
	}
}

module.exports = BotRouter
