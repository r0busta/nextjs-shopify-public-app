import http from "http"

const defaultPort = 3000
export const host = `http://localhost`

export const createServer = (handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) => {
    return http.createServer(handler)
}

export const listen = async (server: http.Server, port: number = defaultPort): Promise<string> => {
    const p = new Promise((resolve, reject) => {
        server.once("listening", () => resolve(true))
        server.once("error", (e) => reject(e))
    })

    server.listen(port)
    try {
        await p
        return Promise.resolve(`${host}:${port}`)
    } catch (e) {
        return listen(server, port + 1)
    }
}

export const close = async (server: http.Server) => {
    const p = new Promise((resolve, reject) => {
        server.once("close", () => resolve(true))
        server.once("error", (e) => reject(e))
    })

    server.close(() => Promise.resolve(true))
    try {
        await p
        return Promise.resolve()
    } catch (e) {
        console.error(e)
        return Promise.reject(e)
    }
}
