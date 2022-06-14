import { deleteStore, listStores } from "src/lib/storage"
import { getSession, shouldSaveSession } from "src/test/storage/shopify"
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
        const store1 = "my-store-1.example.com"
        const store2 = "my-store-2.example.com"

        const userId1 = "my-clerk-user-id-1"
        const userId2 = "my-clerk-user-id-2"

        const shopifySessionId1 = "my-user-1-shopify-session-id-1"
        const shopifySessionId2 = "my-user-1-shopify-session-id-2"
        const shopifySessionId3 = "my-user-2-shopify-session-id-1"

        await addStore(store1, userId1, shopifySessionId1)
        await shouldSaveSession(shopifySessionId1, store1)

        await addStore(store2, userId2, shopifySessionId3)
        await shouldSaveSession(shopifySessionId3, store2)

        await shouldSaveSession(shopifySessionId2, store1)

        await deleteStore(store1)

        expect(await getSession(shopifySessionId1)).toBeUndefined()
        expect(await getSession(shopifySessionId2)).toBeUndefined()
        expect(await getSession(shopifySessionId3)).toBeDefined()
    })
})
