import type { NextApiRequest, NextApiResponse } from "next"
import { deleteShop } from "../../../lib/storage"

export default async function webhookUninstallHandler(req: NextApiRequest, res: NextApiResponse) {
    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const shop = (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""

    console.log(`Deleting shop ${shop}`)

    const ok = await deleteShop(shop)
    if (!ok) {
        console.error(`Failed to delete shop ${shop}`)
    }

    res.status(200).end()
}
