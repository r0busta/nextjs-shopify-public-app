import type { NextApiRequest, NextApiResponse } from "next"
import { deleteShop, isWebhookPath, processWebhook } from "next-shopify-public-app"

export default async function webhookUninstallHandler(req: NextApiRequest, res: NextApiResponse) {
    if (isWebhookPath("/api/shopify/webhook/uninstall")) {
        try {
            await processWebhook(req, res)
        } catch (error) {
            console.error(error)
        }
    }

    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const shop = (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
    const ok = await deleteShop(shop)
    if (!ok) {
        console.error(`Failed to delete shop ${shop}`)
    }

    res.status(200).end()
}
