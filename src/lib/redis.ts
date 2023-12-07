import ioredis from "ioredis"

export function newClient() {
    const host = process.env.UPSTASH_REDIS_ENDPOINT || ""
    const port = process.env.UPSTASH_REDIS_PORT || ""
    const password = process.env.UPSTASH_REDIS_PASSWORD || ""

    const client = new ioredis(`rediss://default:${password}@${host}:${port}`)
    client.on("error", function (err) {
        throw err
    })

    return client
}
