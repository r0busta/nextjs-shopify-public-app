import { NextApiRequest, NextApiResponse } from "next/types"
import { createServer, listen, close } from "src/test/http/server"
import fetch from "node-fetch"
import webhookUninstallHandler from "../uninstall"
import { addStore, listAllStoreKeys, listAllStoreSessionKeys } from "src/test/storage/store"

jest.mock("@clerk/clerk-sdk-node")

const Redis = require("ioredis-mock")
jest.mock("ioredis", () => require("ioredis-mock"))

beforeEach(async () => {
    await new Redis().flushall()
})

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
