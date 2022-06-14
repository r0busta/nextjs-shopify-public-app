import { getSession, shouldSaveSession } from "src/test/storage/shopify"

const Redis = require("ioredis-mock")
jest.mock("ioredis", () => require("ioredis-mock"))

beforeEach(async () => {
    await new Redis().flushall()
})

describe("storeSession", () => {
    it("should expire sessions", async () => {
        const sessionId1 = "my-session-id-1"
        const sessionId2 = "my-session-id-2"
        const store = "my-store.example.com"
        await shouldSaveSession(sessionId1, store, 1)
        await shouldSaveSession(sessionId2, store, 2)

        await new Promise((r) => setTimeout(r, 1100))

        expect(await getSession(sessionId1)).toBeUndefined()
        expect(await getSession(sessionId2)).toBeDefined()
    })
})
