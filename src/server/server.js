// src/server/Server.js

const express = require('express')

class Server {
	constructor(options = {}) {
		this.port = options.port || 6010
		this.host = options.host || 'localhost'
		this.router = options.router
		this.app = express()
		this.server = null
		this.startTime = null

		this.setupMiddleware()
		this.setupRoutes()
	}

	setupMiddleware() {
		this.app.use(express.json())
	}

	setupRoutes() {
		this.app.get('/health', (req, res) => {
			res.json({
				status: 'OK',
				service: 'TrendBot',
				uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
				timestamp: new Date().toISOString()
			})
		})

		if (this.router) {
			this.app.use('/api/bot', this.router)
		}
	}

	start() {
		return new Promise((resolve, reject) => {
			try {
				this.startTime = Date.now()
				this.server = this.app.listen(this.port, this.host, () => {
					resolve()
				})
			} catch (error) {
				reject(error)
			}
		})
	}

	stop() {
		return new Promise((resolve, reject) => {
			if (this.server) {
				this.server.close((err) => {
					if (err) reject(err)
					else resolve()
				})
			} else {
				resolve()
			}
		})
	}
}

module.exports = Server
