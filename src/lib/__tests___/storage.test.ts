import { deleteStore, listStores, saveShopifySessionInfo } from "src/lib/storage"

import { Session, sessions as clerkSessions } from "@clerk/clerk-sdk-node"
jest.mock("@clerk/clerk-sdk-node")
const mockedClerkSessions = clerkSessions as jest.Mocked<typeof clerkSessions>

const Redis = require("ioredis-mock")
jest.mock("ioredis", () => require("ioredis-mock"))

beforeEach(async () => {
    await new Redis().flushall()
})

describe("saveShopifySessionInfo", () => {
    it("should save session info", async () => {
        const userId = "my-clerk-user-id"

        const clerkSessionToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2lkIjoibXktc2lkIiwiaWF0IjoxNTE2MjM5MDIyfQ.ol3RnXn0g_D1S9X-SeKM1VjStUU7vKzY2d0buYdtK_0"
        const store = "my-store.example.com"
        const shopifySessionId = "my-shopify-session-id"
        const expires_in = 1000

        mockedClerkSessions.getSession.mockResolvedValue({ userId } as Session)

        await saveShopifySessionInfo(clerkSessionToken, store, shopifySessionId, expires_in)

        const res = await listStores(userId)
        expect(res).toEqual([store])
    })

    it("should add new store info", async () => {
        const userId = "my-clerk-user-id"

        const clerkSessionToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2lkIjoibXktc2lkIiwiaWF0IjoxNTE2MjM5MDIyfQ.ol3RnXn0g_D1S9X-SeKM1VjStUU7vKzY2d0buYdtK_0"

        const store = "my-store.example.com"
        const shopifySessionId = "my-shopify-session-id"
        const expires_in = 1000

        mockedClerkSessions.getSession.mockResolvedValue({ userId } as Session)

        await saveShopifySessionInfo(clerkSessionToken, store, shopifySessionId, expires_in)

        const newStore = "my-new-store.example.com"
        const newShopifySessionId = "my-new-shopify-session-id"
        await saveShopifySessionInfo(clerkSessionToken, newStore, newShopifySessionId, expires_in)

        const res = await listStores(userId)
        expect(res).toEqual([store, newStore])
    })
})

describe("deleteStore", () => {
    it("should delete store info", async () => {
        const userId = "my-clerk-user-id"

        const clerkSessionToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2lkIjoibXktc2lkIiwiaWF0IjoxNTE2MjM5MDIyfQ.ol3RnXn0g_D1S9X-SeKM1VjStUU7vKzY2d0buYdtK_0"

        const store = "my-store.example.com"
        const shopifySessionId = "my-shopify-session-id"
        const expires_in = 1000

        mockedClerkSessions.getSession.mockResolvedValue({ userId } as Session)

        await saveShopifySessionInfo(clerkSessionToken, store, shopifySessionId, expires_in)

        await deleteStore(store)

        const res = await listStores(userId)
        expect(res).toEqual([])
    })
})
