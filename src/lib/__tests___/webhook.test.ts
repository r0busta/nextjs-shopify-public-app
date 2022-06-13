import { NextApiRequest, NextApiResponse } from "next/types"
import fetch from "node-fetch"
import { createServer, listen, close } from "src/test/http/server"
import { requireWebhookPath } from "src/lib/webhook"

describe("requireWebhookPath", () => {
    it("should reject incorrect handler endpoints", async () => {
        const server = createServer((req, res) =>
            requireWebhookPath(async (_1, _2) => undefined)(
                req as unknown as NextApiRequest,
                res as unknown as NextApiResponse
            )
        )

        const host = await listen(server)

        expect((await fetch(host)).status).toBe(404)

        await close(server)
    })

    it("should reject unsigned webhooks", async () => {
        const server = createServer((req, res) =>
            requireWebhookPath(async (_1, _2) => undefined)(
                req as unknown as NextApiRequest,
                res as unknown as NextApiResponse
            )
        )
        const host = await listen(server)

        expect(
            (
                await fetch(`${host}/api/shopify/webhook/uninstall`, {
                    method: "POST",
                    headers: {
                        "X-Shopify-Hmac-Sha256": "42",
                        "X-Shopify-Topic": "APP_UNINSTALLED",
                        "X-Shopify-Shop-Domain": "localhost",
                    },
                    body: JSON.stringify({ foo: "bar" }),
                })
            ).status
        ).toBe(403)

        await close(server)
    })
})
