import http from "http"
import getShopify from "./shopify"

export async function registerUninstallWebhook(shop: string, accessToken: string) {
    const topic = "APP_UNINSTALLED"
    const path = "/api/shopify/webhook/uninstall"

    const response = await getShopify().Webhooks.Registry.register({
        topic,
        path,
        shop,
        accessToken,
    })

    if (!response[topic].success) {
        console.error(`Failed to register ${topic} webhook: ${response[topic].result}`)
    } else {
        console.log(`${topic} webhook was successfully registered`)
    }
}

export function isWebhookPath(path: string) {
    return getShopify().Webhooks.Registry.isWebhookPath(path)
}

export async function processWebhook(req: http.IncomingMessage, res: http.ServerResponse) {
    return getShopify().Webhooks.Registry.process(req, res)
}
