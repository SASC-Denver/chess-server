import {fastify}   from 'fastify'
import fastifyCors from 'fastify-cors'
import fs          from 'fs'

require('dotenv').config()

console.log(`HTTPS_KEY:  ${process.env.HTTPS_KEY}`)
console.log(`HTTPS_CERT: ${process.env.HTTPS_CERT}`)

const server = fastify({
	http2: true,
	https: {
		key: fs.readFileSync(process.env.HTTPS_KEY),
		cert: fs.readFileSync(process.env.HTTPS_CERT)
	},
	logger: false
})

server.register(fastifyCors, {
	origin: (
		origin,
		cb
	) => {
		cb(null, true)
		/*
		// console.log('Origin: ' + origin)
		if (!origin || /'votecube.com'/.test(origin) || /localhost/.test(origin)) {
			cb(null, true)
			return
		}
		cb(new Error('Not allowed CORS host'), false)
		 */
	}
})

interface Game {
	player1: string;
	player2: string;
	whosMove: string;
	board: string[][];
}

var ALL_GAMES: Game[] = []

var WINNING_CONDITIONS = [
	[{row: 0, column: 0}, {row: 1, column: 0}, {row: 2, column: 0}],
	[{row: 0, column: 1}, {row: 1, column: 1}, {row: 2, column: 1}],
	[{row: 0, column: 2}, {row: 1, column: 2}, {row: 2, column: 2}],
	[{row: 0, column: 0}, {row: 0, column: 1}, {row: 0, column: 2}],
	[{row: 1, column: 0}, {row: 1, column: 1}, {row: 1, column: 2}],
	[{row: 2, column: 0}, {row: 2, column: 1}, {row: 2, column: 2}],
	[{row: 0, column: 0}, {row: 1, column: 1}, {row: 2, column: 2}],
	[{row: 0, column: 2}, {row: 1, column: 1}, {row: 0, column: 2}]
]

server.put('/api/join', async (
	request,
	reply
) => {
	const body: any = JSON.parse(request.body as any)

	var lastGame: Game
	if (ALL_GAMES.length) {
		lastGame = ALL_GAMES[ALL_GAMES.length - 1]
		if (!lastGame.player2) {
			lastGame.player2 = body.playerName
			return {
				gameIndex: ALL_GAMES.length - 1,
				whosMove: lastGame.player1,
				otherPlayer: lastGame.player1
			}
		} else {
			lastGame = {
				player1: body.playerName,
				player2: null,
				whosMove: body.playerName,
				board: [[null, null, null], [null, null, null], [null, null, null]]
			}
			ALL_GAMES.push(lastGame)
			var gameIndex = ALL_GAMES.length - 1
			await wait()
			return {
				gameIndex,
				whosMove: lastGame.player1,
				otherPlayer: lastGame.player2
			}
		}
	} else {
		lastGame = {
			player1: body.playerName,
			player2: null,
			whosMove: body.playerName,
			board: [[null, null, null], [null, null, null], [null, null, null]]
		}
		ALL_GAMES.push(lastGame)
		var gameIndex = ALL_GAMES.length - 1
		await wait()
		return {
			gameIndex,
			whosMove: lastGame.whosMove,
			otherPlayer: lastGame.player2
		}
	}
})

async function wait() {
	return new Promise<void>((
		resolve,
		reject
	) => {
		setTimeout(() => {
			if (ALL_GAMES[ALL_GAMES.length - 1].player2) {
				resolve()
			}
		}, 1000)
	})
}

server.put('/api/move', async (
	request,
	reply
) => {
	const body: any = JSON.parse(request.body as any)

	if (!body.move || typeof body.move.row !== 'number' || body.move.row < 0 || body.move.row > 2) {
		return {
			error: 'Invalid move'
		}
	}

	if (typeof body.move.column !== 'number' || body.move.column < 0 || body.move.column > 2) {
		return {
			error: 'Invalid move'
		}
	}

	if (typeof body.gameIndex !== 'number' || body.gameIndex < 0 || body.gameIndex >= ALL_GAMES.length) {
		return {
			error: 'Invalid move'
		}
	}
	var game = ALL_GAMES[body.gameIndex]

	if (body.playerName !== game.whosMove) {
		return {
			error: 'Invalid move'
		}
	}

	if (game.board[body.move.row][body.move.column]) {
		return {
			error: 'Invalid move'
		}
	}

	game.board[body.move.row][body.move.column] = game.whosMove

	var winningPlayer = whoWon(game)

	if (winningPlayer) {
		return {
			gameOver: true,
			winningPlayer
		}
	}

	if (game.whosMove === game.player1) {
		game.whosMove = game.player2
	} else {
		game.whosMove = game.player1
	}

	return {
		whosMove: game.whosMove
	}
})

server.put('/api/getGameState', async (
	request,
	reply
) => {
	const body: any = JSON.parse(request.body as any)

	return ALL_GAMES[body.gameIndex]
})

function whoWon(game: Game) {
	for (var winningCondition of WINNING_CONDITIONS) {
		var winningValue = whoWonACondition(winningCondition, game.board)
		if (winningValue) {
			return winningValue
		}
	}
	return null
}

function whoWonACondition(
	winningCondition,
	board
) {
	var firstCell  = winningCondition[0]
	var firstValue = board[firstCell.row][firstCell.column]
	for (var i = 1; i < winningCondition.length; i++) {
		var nextCell  = winningCondition[i]
		var nextValue = board[nextCell.row][nextCell.column]
		if (firstValue !== nextValue) {
			return null
		}
	}
	return firstValue
}

// Run the server!
const startFunction = async () => {
	try {
		console.log('before start tic-tac-toe')
		await server.listen(8080, '0.0.0.0')
		server.log.info(`server listening on ${(server.server as any).address().port}`)
	} catch (err) {
		server.log.error(err)
		console.log(err)
		process.exit(1)
	}
}

// process.on('exit', () => {
// 	console.log('About to exit, waiting for remaining connections to complete')
// 	// app.close();
// })

process.on('SIGINT', () => {
	console.log('Caught interrupt signal')
	// TODO: add closing logic
	process.exit()
})

startFunction()
	.then()
