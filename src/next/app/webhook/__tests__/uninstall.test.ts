import { NextApiRequest, NextApiResponse } from "next/types"
import { createServer, listen, close } from "src/test/http/server"
import fetch from "node-fetch"
import { saveShopifySessionInfo } from "src/lib/storage"
import webhookUninstallHandler from "../uninstall"
import { Session, sessions as clerkSessions } from "@clerk/clerk-sdk-node"

jest.mock("@clerk/clerk-sdk-node")
const mockedClerkSessions = clerkSessions as jest.Mocked<typeof clerkSessions>

const Redis = require("ioredis-mock")
jest.mock("ioredis", () => require("ioredis-mock"))

beforeEach(async () => {
    await new Redis().flushall()
})

const addStore = async (store: string) => {
    const userId = "my-clerk-user-id"

    const clerkSessionToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2lkIjoibXktc2lkIiwiaWF0IjoxNTE2MjM5MDIyfQ.ol3RnXn0g_D1S9X-SeKM1VjStUU7vKzY2d0buYdtK_0"
    const shopifySessionId = "my-shopify-session-id"
    const expires_in = 1000

    mockedClerkSessions.getSession.mockResolvedValue({ userId } as Session)

    try {
        await saveShopifySessionInfo(clerkSessionToken, store, shopifySessionId, expires_in)
    } catch (e) {
        throw e
    }
}

const listAllStoreKeys = async () => {
    const client = new Redis()
    const res = client.keys("User.Stores.*")

    return res
}

const listAllStoreSessionKeys = async () => {
    const client = new Redis()
    const res = client.keys("User.StoreSessions.*")

    return res
}

describe("webhookUninstallHandler", () => {
    it("should require store domain header", async () => {
        const server = createServer((req, res) =>
            webhookUninstallHandler(req as NextApiRequest, res as NextApiResponse)
        )
        const host = await listen(server)

        expect((await fetch(host)).status).toBe(400)

        await close(server)
    })

    it("should delete store info", async () => {
        const server = createServer((req, res) =>
            webhookUninstallHandler(req as NextApiRequest, res as NextApiResponse)
        )
        const host = await listen(server)

        const store = "my-store.example.com"
        await addStore("my-another-store.example.com")
        await addStore(store)
        await addStore("my-new-store.example.com")

        expect((await listAllStoreKeys()).length).toEqual(3)
        expect((await listAllStoreSessionKeys()).length).toEqual(3)

        expect(
            (
                await fetch(host, {
                    headers: {
                        "x-shopify-shop-domain": store,
                    },
                })
            ).status
        ).toBe(200)

        expect((await listAllStoreKeys()).length).toEqual(2)
        expect((await listAllStoreSessionKeys()).length).toEqual(2)

        await close(server)
    })
})
