import { deleteStore, listStores } from "src/lib/storage"
import { addStore } from "src/test/storage/store"

jest.mock("@clerk/clerk-sdk-node")

const Redis = require("ioredis-mock")
jest.mock("ioredis", () => require("ioredis-mock"))

beforeEach(async () => {
    await new Redis().flushall()
})

describe("saveShopifySessionInfo", () => {
    it("should save session info", async () => {
        const userId = "my-clerk-user-id"
        const store = "my-store.example.com"

        await addStore(store, userId)

        const res = await listStores(userId)
        expect(res).toEqual([store])
    })

    it("should add new store info", async () => {
        const userId = "my-clerk-user-id"
        const store = "my-store.example.com"

        await addStore(store, userId)

        const newStore = "my-new-store.example.com"
        const newShopifySessionId = "my-new-shopify-session-id"
        await addStore(newStore, userId, newShopifySessionId)

        const res = await listStores(userId)
        expect(res).toEqual([store, newStore])
    })
})

describe("deleteStore", () => {
    it("should delete store info", async () => {
        const userId = "my-clerk-user-id"
        const store = "my-store.example.com"

        await addStore(store, userId)

        await deleteStore(store)

        const res = await listStores(userId)
        expect(res).toEqual([])
    })

    it("should delete Shopify sessions", async () => {
        const userId = "my-clerk-user-id"
        const store = "my-store.example.com"

        await addStore(store, userId)

        await deleteStore(store)

        const res = await listStores(userId)
        expect(res).toEqual([])
    })
})
