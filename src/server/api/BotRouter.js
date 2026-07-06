// src/server/api/BotRouter.js

const express = require('express')
const fs = require('fs')
const path = require('path')

class BotRouter {
	constructor(options = {}) {
		this.router = express.Router()
		this.dataGatherer = options.dataGatherer
		this.strategy = options.strategy
		this.tradesLogger = options.tradesLogger
		this.positionSize = options.positionSize || 100

		// In-memory position tracking
		this.currentPosition = null
		this.positionHistory = []

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

				const decision = this.strategy.makeDecision(data, this.currentPosition)

				res.json({
					success: true,
					decision: decision,
					position: this.currentPosition,
					timestamp: new Date().toISOString()
				})
			} catch (error) {
				res.status(500).json({
					success: false,
					error: error.message
				})
			}
		})

		// Execute trade
		this.router.post('/trade', async (req, res) => {
			try {
				const { action } = req.body

				const data = await this.dataGatherer.gatherAllData()
				if (!data.success) {
					return res.status(500).json({
						success: false,
						error: data.error
					})
				}

				const currentPrice = data.price.price

				// Force exit if requested
				if (action === 'EXIT' || action === 'FORCE_EXIT') {
					return this.exitPosition(res, currentPrice)
				}

				// Get decision
				const decision = this.strategy.makeDecision(data, this.currentPosition)

				// Execute decision
				const result = this.executeDecision(decision, currentPrice)

				res.json({
					success: result.executed,
					result: result,
					position: this.currentPosition,
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
				inPosition: this.currentPosition !== null,
				position: this.currentPosition,
				timestamp: new Date().toISOString()
			})
		})

		// Get history
		this.router.get('/history', (req, res) => {
			const limit = parseInt(req.query.limit) || 100
			const history = this.positionHistory.slice(-limit)

			const trades = this.positionHistory.filter((p) => p.exitPrice)
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
			res.json({
				success: true,
				running: true,
				inPosition: this.currentPosition !== null,
				position: this.currentPosition,
				tradesCount: this.positionHistory.length,
				positionSize: this.positionSize,
				timestamp: new Date().toISOString()
			})
		})
	}

	executeDecision(decision, currentPrice) {
		if (!decision.signal) {
			return { executed: false, action: 'HOLD', reason: 'No signal' }
		}

		if (decision.action === 'BUY' || decision.action === 'SELL') {
			return this.enterPosition(decision, currentPrice)
		}

		return { executed: false, action: 'HOLD', reason: 'No trade signal' }
	}

	enterPosition(decision, currentPrice) {
		const signal = decision.signal
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
		this.tradesLogger.logEntry(position)

		return {
			executed: true,
			action: decision.action,
			position: position,
			reason: `Entered ${direction} at ${currentPrice}`
		}
	}

	exitPosition(res, currentPrice) {
		if (!this.currentPosition) {
			return res.json({
				success: false,
				error: 'No position to exit',
				timestamp: new Date().toISOString()
			})
		}

		const position = this.currentPosition
		const pnl = this.calculatePnL(position, currentPrice)

		position.exitPrice = currentPrice
		position.exitTime = new Date().toISOString()
		position.pnl = pnl

		// Log to CSV
		this.tradesLogger.logExit(position)

		this.currentPosition = null

		return res.json({
			success: true,
			action: 'EXIT',
			position: position,
			pnl: pnl,
			timestamp: new Date().toISOString()
		})
	}

	calculatePnL(position, exitPrice) {
		const direction = position.direction
		const entryPrice = position.entryPrice
		const size = position.size

		if (direction === 'LONG') {
			return (exitPrice - entryPrice) * size
		} else {
			// SHORT
			return (entryPrice - exitPrice) * size
		}
	}

	getRouter() {
		return this.router
	}
}

module.exports = BotRouter
