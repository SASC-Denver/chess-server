import dotenv         from 'dotenv'
import {fastify}      from 'fastify'
import fastifyCors    from 'fastify-cors'
import fs             from 'fs'
import {v4 as uuidv4} from 'uuid'

dotenv.config()

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

interface Player {
	name: string;
	id: string;
}

enum GameState {
	PENDING,
	STARTED,
	FINISHED
}

interface Game {
	board: boolean[][];
	id: string;
	lastMoveTime: number;
	xMovesNext: boolean;
	players: Player[];
	state: GameState
}

interface ErrorResponse {
	error: string;
}

interface GameCheckRequest {
	gameId: string;
	playerId: string;
}

interface GameCheckResponse {
	board: boolean[][]
	lastMoveTime: number;
	otherPlayerName: string;
	state: GameState;
	yourMove: boolean;
	yourSign: string;
}

interface JoinRequest {
	playerName: string;
}

interface JoinResponse {
	board: boolean[][];
	gameId: string;
	otherPlayerName: string;
	playerId: string;
	state: GameState;
	yourMove: boolean;
	yourSign: string;
}

interface MoveRequest {
	gameId: string;
	playerId: string;
	move: {
		column: number,
		row: number
	}
}

interface MoveResponse {
	state: GameState;
	board: boolean[][];
}

var ALL_GAMES: Map<string, Game>     = new Map<string, Game>()
var GAMES_WITH_PLAYER_NEEDED: Game[] = []

setInterval(() => {
	const gamesToRemove: Game[] = []
	const earliestValidGameMove = new Date().getTime() - 60 * 60 * 1000
	for (const [gameId, game] of ALL_GAMES) {
		if (game.lastMoveTime < earliestValidGameMove) {
			gamesToRemove.push(game)
		}
	}
	gamesToRemove.forEach(game => {
		ALL_GAMES.delete(game.id)
		for (var i = GAMES_WITH_PLAYER_NEEDED.length; i >= 0; i--) {
			const currentGame = GAMES_WITH_PLAYER_NEEDED[i]
			if (game.id === currentGame.id) {
				GAMES_WITH_PLAYER_NEEDED.splice(i, 1)
				break
			}
		}
	})
}, 60000)

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

server.put('/tic-tac-toe/check', async (
	request,
	reply
) => {
	const body: GameCheckRequest = request.body as any

	const game = ALL_GAMES.get(body.gameId)

	if (!game) {
		return {
			error: 'Invalid request'
		} as ErrorResponse
	}

	var player: Player
	var playerIndex: number

	for (var i = 0; i < game.players.length; i++) {
		if (game.players[i].id === body.playerId) {
			player      = game.players[i]
			playerIndex = i
			break
		}
	}

	if (!player) {
		return {
			error: 'Invalid request'
		} as ErrorResponse
	}

	if (game.state === GameState.FINISHED) {
		ALL_GAMES.delete(game.id);
	}

	return {
		board: game.board,
		state: game.state,
		otherPlayerName: game.players.length > 1 ? (playerIndex === 0 ? game.players[1].name : game.players[0].name) : null,
		yourMove: game.state === GameState.PENDING ? false : game.xMovesNext ? !playerIndex : !!playerIndex,
		yourSign: playerIndex === 0 ? 'X' : 'O'
	} as GameCheckResponse

})

server.put('/tic-tac-toe/join', async (
	request,
	reply
) => {
	if (ALL_GAMES.size > 100) {
		return {
			error: 'Too many games going on, please wait'
		} as ErrorResponse
	}
	const body: JoinRequest = request.body as any

	if (!body.playerName || typeof body.playerName !== 'string'
		|| !body.playerName.length) {
		return {
			error: 'Invalid request'
		}
	}

	var game: Game
	var player: Player = {
		id: uuidv4(),
		name: body.playerName
	}
	if (GAMES_WITH_PLAYER_NEEDED.length) {
		game               = GAMES_WITH_PLAYER_NEEDED.shift()
		game.players.push(player)
		game.state = GameState.STARTED
		return {
			board: game.board,
			gameId: game.id,
			otherPlayerName: game.players[0].name,
			playerId: player.id,
			state: game.state,
			yourMove: false,
			yourSign: 'O'
		} as JoinResponse
	} else {
		game = {
			board: [[null, null, null], [null, null, null], [null, null, null]],
			id: uuidv4(),
			lastMoveTime: new Date().getTime(),
			xMovesNext: true,
			players: [player],
			state: GameState.PENDING
		}
		ALL_GAMES.set(game.id, game)
		GAMES_WITH_PLAYER_NEEDED.push(game)

		return {
			board: game.board,
			gameId: game.id,
			otherPlayerName: null,
			playerId: player.id,
			state: game.state,
			yourMove: false,
			yourSign: 'X'
		} as JoinResponse
	}
})

server.put('/tic-tac-toe/move', async (
	request,
	reply
) => {
	const body: MoveRequest = request.body as any

	if (!body.move || typeof body.move.row !== 'number' || body.move.row < 0 || body.move.row > 2) {
		return {
			error: 'Invalid request'
		}
	}

	if (typeof body.move.column !== 'number' || body.move.column < 0 || body.move.column > 2) {
		return {
			error: 'Invalid request'
		}
	}

	var game = ALL_GAMES.get(body.gameId)

	if (!game) {
		return {
			error: 'Invalid request'
		}
	}

	if (game.state !== GameState.STARTED) {
		return {
			error: 'Invalid request'
		}
	}

	var player: Player
	var playerIndex: number
	for (let i = 0; i < game.players.length; i++) {
		if (game.players[i].id === body.playerId) {
			player      = game.players[i]
			playerIndex = i
		}
	}

	if (!player) {
		return {
			error: 'Invalid request'
		}
	}

	if ((playerIndex === 0 && !game.xMovesNext)
		|| (playerIndex === 1 && !game.xMovesNext)) {
		return {
			error: 'It\'s not your move'
		}
	}

	if (game.board[body.move.row][body.move.column] !== null) {
		return {
			error: 'That cell is already taken'
		}
	}

	game.board[body.move.row][body.move.column] = game.xMovesNext

	game.xMovesNext = !game.xMovesNext

	var winningPlayer = whoWon(game)

	if (winningPlayer !== null) {
		game.state = GameState.FINISHED
	}

	return {
		state: game.state,
		board: game.board
	} as MoveResponse
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
		await server.listen(8080, '0.0.0.0')
		console.log('Started tic-tac-toe server')
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
