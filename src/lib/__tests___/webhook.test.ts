import { NextApiRequest, NextApiResponse } from "next/types"
import fetch from "node-fetch"
import http from "http"
import { requireWebhookPath } from "src/lib/webhook"

describe("requireWebhookPath", () => {
    it("should reject incorrect handler endpoints", async () => {
        const server = http.createServer((req, res) =>
            requireWebhookPath(async (_1, _2) => undefined)(
                req as unknown as NextApiRequest,
                res as unknown as NextApiResponse
            )
        )
        server.listen(3000)

        expect((await fetch("http://localhost:3000/")).status).toBe(404)
        server.close()
    })

    it("should reject unsigned webhooks", async () => {
        const server = http.createServer((req, res) =>
            requireWebhookPath(async (_1, _2) => undefined)(
                req as unknown as NextApiRequest,
                res as unknown as NextApiResponse
            )
        )
        server.listen(3000)

        expect(
            (
                await fetch("http://localhost:3000/api/shopify/webhook/uninstall", {
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
        server.close()
    })
})
