import { timingSafeEqual, createHmac } from "crypto"
import { NextApiRequest, NextApiResponse } from "next/types"
import getShopify from "./shopify"

enum ShopifyHeader {
    Hmac = "X-Shopify-Hmac-Sha256",
    Topic = "X-Shopify-Topic",
    Domain = "X-Shopify-Shop-Domain",
}

const uninstallTopic = "APP_UNINSTALLED"
const uninstallPath = "/api/shopify/webhook/uninstall"

export async function registerUninstallWebhook(shop: string, accessToken: string) {
    const res = await getShopify().Webhooks.Registry.register({
        topic: uninstallTopic,
        path: uninstallPath,
        shop,
        accessToken,
    })

    if (!res[uninstallTopic].success) {
        console.error(`Failed to register ${uninstallTopic} webhook: ${res[uninstallTopic].result}`)
    } else {
        console.log(`${uninstallTopic} webhook was successfully registered`)
    }
}

function isWebhookPath(path: string) {
    return path === uninstallPath
}

async function processWebhook(req: NextApiRequest, res: NextApiResponse): Promise<Error | undefined> {
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

    const generatedHash = createHmac("sha256", getShopify().Context.API_SECRET_KEY)
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

function safeCompare(
    strA: string | { [key: string]: string } | string[] | number[],
    strB: string | { [key: string]: string } | string[] | number[]
): boolean {
    if (typeof strA === typeof strB) {
        let buffA: Buffer
        let buffB: Buffer

        if (typeof strA === "object" && typeof strB === "object") {
            buffA = Buffer.from(JSON.stringify(strA))
            buffB = Buffer.from(JSON.stringify(strB))
        } else {
            buffA = Buffer.from(strA as string)
            buffB = Buffer.from(strB as string)
        }

        if (buffA.length === buffB.length) {
            return timingSafeEqual(buffA, buffB)
        }
    } else {
        throw new Error(`Mismatched data types provided: ${typeof strA} and ${typeof strB}`)
    }
    return false
}

export function requireWebhookPath(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        if (!isWebhookPath(uninstallPath)) {
            res.writeHead(404).end()
            return
        }

        const err = await processWebhook(req, res)
        if (err) {
            console.error(err)
            res.end()
            return
        }
        return handler(req, res)
    }
}
