import {fastify} from 'fastify'
import fastifyCors from 'fastify-cors'

const server = fastify({logger: false})
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
				board: [[null, null, null],[null, null, null],[null, null, null]]
			}
			ALL_GAMES.push(lastGame);
			var gameIndex = ALL_GAMES.length - 1;
			await wait();
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
			board: [[null, null, null],[null, null, null],[null, null, null]]
		}
		ALL_GAMES.push(lastGame);
		var gameIndex = ALL_GAMES.length - 1;
		await wait();
		return {
			gameIndex,
			whosMove: lastName.whosMove,
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

	body.gameIndex;
	body.playerName;
	body.move.row;
	body.move.column;

	if(!body.move || typeof body.move.row !== 'number' || body.move.row < 0 || body.move.row > 2) {
		return {
			error: 'Invalid move'
		}
	}

	if(typeof body.gameIndex !== 'number' || body.gameIndex < 0 || body.gameIndex >= ALL_GAMES.length) {
		return {
			error: 'Invalid move'
		}
	}
	var game = ALL_GAMES[body.gameIndex];

	if (body.playerName !== game.whosMove) {
		return {
			error: 'Invalid move'
		}
	}



	return null
})

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
