import { IncomingMessage, ServerResponse } from "http"
import { createHmac } from "crypto"
import { safeCompare } from "./hmac"
import fetch from "node-fetch"

enum ShopifyHeader {
    Hmac = "X-Shopify-Hmac-Sha256",
    Topic = "X-Shopify-Topic",
    Domain = "X-Shopify-Shop-Domain",
}

export enum DeliveryMethod {
    Http = "http",
    EventBridge = "eventbridge",
    PubSub = "pubsub",
}

interface RegisterOptions {
    // See https://shopify.dev/docs/admin-api/graphql/reference/events/webhooksubscriptiontopic for available topics
    topic: string
    path: string
    shop: string
    accessToken: string
    deliveryMethod?: DeliveryMethod
}

interface RegisterReturn {
    [topic: string]: {
        success: boolean
        result: unknown
    }
}

export async function register(
    hostScheme: string,
    hostName: string,
    { path, topic, accessToken, shop, deliveryMethod = DeliveryMethod.Http }: RegisterOptions
) {
    const address = deliveryMethod === DeliveryMethod.Http ? `${hostScheme}://${hostName}${path}` : path

    try {
        const res = await fetch(`https://${shop}/admin/api/2022-07/webhooks.json`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({
                webhook: {
                    topic,
                    address,
                },
            }),
        }).then((r) => r.json())

        const registerReturn: RegisterReturn = {
            [topic]: {
                success: true,
                result: res,
            },
        }
        return registerReturn
    } catch (e) {
        const registerReturn: RegisterReturn = {
            [topic]: {
                success: false,
                result: e,
            },
        }
        return registerReturn
    }
}

export async function processWebhook(req: IncomingMessage, res: ServerResponse): Promise<Error | undefined> {
    const buffers = []

    for await (const chunk of req) {
        buffers.push(chunk)
    }

    const reqBody = Buffer.concat(buffers).toString()

    if (!reqBody.length) {
        res.writeHead(400)
        res.end()
        return new Error("No body was received when processing webhook")
    }

    let hmac: string | string[] | undefined
    let topic: string | string[] | undefined
    let domain: string | string[] | undefined
    Object.entries(req.headers).forEach(([header, value]) => {
        switch (header) {
            case ShopifyHeader.Hmac.toLowerCase():
                hmac = value
                break
            case ShopifyHeader.Topic.toLowerCase():
                topic = value
                break
            case ShopifyHeader.Domain.toLowerCase():
                domain = value
                break
        }
    })

    const missingHeaders = []
    if (!hmac) {
        missingHeaders.push(ShopifyHeader.Hmac)
    }
    if (!topic) {
        missingHeaders.push(ShopifyHeader.Topic)
    }
    if (!domain) {
        missingHeaders.push(ShopifyHeader.Domain)
    }

    if (missingHeaders.length) {
        res.writeHead(400)
        res.end()
        return new Error(
            `Missing one or more of the required HTTP headers to process webhooks: [${missingHeaders.join(", ")}]`
        )
    }

    let statusCode: number
    let responseError: Error | undefined
    const headers = {}

    const generatedHash = createHmac("sha256", process.env.SHOPIFY_APP_API_SECRET_KEY || "")
        .update(reqBody, "utf8")
        .digest("base64")

    if (safeCompare(generatedHash, hmac as string)) {
        statusCode = 200
    } else {
        statusCode = 403
        responseError = new Error(`Could not validate req for topic ${topic}`)
    }

    res.writeHead(statusCode, headers)
    res.end()

    if (responseError) {
        return responseError
    } else {
        return
    }
}
