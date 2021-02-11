import {fastify}                      from 'fastify'
import fastifyCors                    from 'fastify-cors'

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

server.get('/api/join', async (
	request,
	reply
) => {
	const body: any = JSON.parse(request.body as any)

	return {test: "hello!"}
})

server.put('/api/move', async (
	request,
	reply
) => {
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

startFunction().then()
