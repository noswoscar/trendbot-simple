// src/services/TradesLogger.js

const fs = require('fs')
const path = require('path')

class TradesLogger {
	constructor(options = {}) {
		this.logFile = options.logFile || './data/Trades.csv'
		this.ensureDirectory()
		this.ensureFile()
	}

	ensureDirectory() {
		const dir = path.dirname(this.logFile)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true })
		}
	}

	ensureFile() {
		if (!fs.existsSync(this.logFile)) {
			const header =
				'timestamp,side,entryPrice,exitPrice,size,grossPnL,fee,netPnL,entryTime,exitTime,atrAtEntry,atrAtExit,volatilityState,supportAtEntry,resistanceAtEntry,breakoutType,levelStrength,confidence,reason\n'
			fs.writeFileSync(this.logFile, header)
		}
	}

	logEntry(position) {
		const line = this.formatEntry(position)
		fs.appendFileSync(this.logFile, line + '\n')
	}

	logExit(position) {
		// Read the last line and append exit info
		const lines = fs.readFileSync(this.logFile, 'utf8').split('\n')
		if (lines.length < 2) return

		const lastLine = lines[lines.length - 2]
		const parts = lastLine.split(',')

		// Update with exit info
		parts[3] = position.exitPrice || parts[3]
		parts[5] = position.pnl || 0
		parts[6] = 0 // fee
		parts[7] = position.pnl || 0 // netPnL
		parts[8] = position.entryTime || parts[8]
		parts[9] = position.exitTime || new Date().toISOString()

		// Write back
		lines[lines.length - 2] = parts.join(',')
		fs.writeFileSync(this.logFile, lines.join('\n'))
	}

	formatEntry(position) {
		const timestamp = new Date().toISOString()
		const side = position.direction === 'LONG' ? 'BUY' : 'SELL'
		const entryPrice = position.entryPrice
		const exitPrice = ''
		const size = position.size
		const grossPnL = ''
		const fee = 0
		const netPnL = ''
		const entryTime = position.entryTime
		const exitTime = ''
		const atrAtEntry = ''
		const atrAtExit = ''
		const volatilityState = ''
		const supportAtEntry = ''
		const resistanceAtEntry = ''
		const breakoutType = ''
		const levelStrength = ''
		const confidence = position.entryConfidence || 0
		const reason = Array.isArray(position.entryReason) ? position.entryReason.join('; ') : position.entryReason || ''

		return [
			timestamp,
			side,
			entryPrice,
			exitPrice,
			size,
			grossPnL,
			fee,
			netPnL,
			entryTime,
			exitTime,
			atrAtEntry,
			atrAtExit,
			volatilityState,
			supportAtEntry,
			resistanceAtEntry,
			breakoutType,
			levelStrength,
			confidence,
			reason
		].join(',')
	}

	getHistory(limit = 100) {
		if (!fs.existsSync(this.logFile)) return []

		const lines = fs.readFileSync(this.logFile, 'utf8').split('\n')
		if (lines.length < 2) return []

		const headers = lines[0].split(',')
		const results = []

		for (let i = lines.length - 2; i >= Math.max(0, lines.length - limit - 1); i--) {
			if (!lines[i]) continue
			const values = lines[i].split(',')
			const entry = {}
			headers.forEach((h, idx) => {
				entry[h.trim()] = values[idx] || ''
			})
			results.push(entry)
		}

		return results
	}

	getStats() {
		const history = this.getHistory(1000)
		if (history.length === 0) {
			return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0 }
		}

		const completed = history.filter((t) => t.exitPrice !== '' && t.exitPrice !== undefined)
		const total = completed.length
		const wins = completed.filter((t) => parseFloat(t.netPnL || 0) > 0).length
		const losses = completed.filter((t) => parseFloat(t.netPnL || 0) < 0).length
		const totalPnL = completed.reduce((sum, t) => sum + parseFloat(t.netPnL || 0), 0)

		return {
			total: total,
			wins: wins,
			losses: losses,
			winRate: total > 0 ? wins / total : 0,
			totalPnL: totalPnL
		}
	}
}

module.exports = TradesLogger
