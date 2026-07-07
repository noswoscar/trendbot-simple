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
		// Read the file and find the last entry
		const content = fs.readFileSync(this.logFile, 'utf8')
		const lines = content.split('\n')

		if (lines.length < 2) return

		// Find the last incomplete entry (has entryPrice but no exitPrice)
		let lastEntryIndex = -1
		for (let i = lines.length - 2; i >= 0; i--) {
			if (!lines[i]) continue
			const parts = lines[i].split(',')
			// Check if it has entryPrice (index 2) but no exitPrice (index 3)
			if (parts.length > 3 && parts[2] && !parts[3]) {
				lastEntryIndex = i
				break
			}
		}

		if (lastEntryIndex === -1) return

		// Update the entry with exit info
		const parts = lines[lastEntryIndex].split(',')
		parts[3] = position.exitPrice || parts[3]
		parts[5] = position.pnl || 0
		parts[6] = 0 // fee
		parts[7] = position.pnl || 0 // netPnL
		parts[9] = position.exitTime || new Date().toISOString()

		lines[lastEntryIndex] = parts.join(',')
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

		const content = fs.readFileSync(this.logFile, 'utf8')
		const lines = content.split('\n').filter((line) => line.trim())

		if (lines.length < 2) return [] // Only header or empty

		const headers = lines[0].split(',')
		const results = []

		// Start from the end (most recent first)
		const startIdx = Math.max(1, lines.length - limit)
		for (let i = lines.length - 1; i >= startIdx; i--) {
			if (!lines[i] || lines[i].trim() === '') continue
			const values = lines[i].split(',')
			if (values.length < headers.length) continue

			const entry = {}
			headers.forEach((h, idx) => {
				const key = h.trim()
				const val = values[idx] || ''
				// Convert numeric values
				if (
					key === 'size' ||
					key === 'grossPnL' ||
					key === 'fee' ||
					key === 'netPnL' ||
					key === 'confidence' ||
					key === 'levelStrength'
				) {
					entry[key] = parseFloat(val) || 0
				} else {
					entry[key] = val
				}
			})
			results.push(entry)
		}

		return results
	}

	getStats() {
		const history = this.getHistory()
		if (history.length === 0) {
			return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0 }
		}

		// Only count completed trades (have exitPrice and netPnL)
		const completed = history.filter(
			(t) => t.exitPrice && t.exitPrice !== '' && t.netPnL !== undefined && t.netPnL !== null && t.netPnL !== ''
		)

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
