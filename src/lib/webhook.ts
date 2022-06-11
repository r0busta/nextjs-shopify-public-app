import { NextApiRequest, NextApiResponse } from "next/types"
import { processWebhook, register } from "../shopify/webhook"

const uninstallTopic = "app/uninstalled"
const uninstallPath = "/api/shopify/webhook/uninstall"

export async function registerUninstallWebhook(store: string, accessToken: string) {
    if (!process.env.HOST) throw new Error("HOST environment variable is not set")

    const res = await register("https", process.env.HOST, {
        topic: uninstallTopic,
        path: uninstallPath,
        shop: store,
        accessToken,
    })

    if (!res[uninstallTopic].success) {
        console.error(`Failed to register ${uninstallTopic} webhook: ${JSON.stringify(res[uninstallTopic].result)}`)
    } else {
        console.log(`${uninstallTopic} webhook was successfully registered`)
    }
}

function isWebhookPath(path: string) {
    return path === uninstallPath
}

export function requireWebhookPath(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        if (!isWebhookPath(req.url || "")) {
            console.error(`requireWebhookPath: ${req.method} ${req.url} is not a webhook path`)
            res.writeHead(400).end()
            return
        }

        const err = await processWebhook(req, res)
        if (err) {
            console.error(err)
            res.writeHead(500).end()
            return
        }

        return handler(req, res)
    }
}
