import { NextApiRequest, NextApiResponse } from "next/types"
import { deleteStore } from "../../../lib/storage"

export default async function webhookUninstallHandler(req: NextApiRequest, res: NextApiResponse) {
    const storeDomainHeader = req.headers["x-shopify-store-domain"]
    const store = (Array.isArray(storeDomainHeader) ? storeDomainHeader[0] : storeDomainHeader) || ""

    console.log(`Deleting store ${store}`)

    const ok = await deleteStore(store)
    if (!ok) {
        console.error(`Failed to delete store ${store}`)
    }

    res.status(200).end()
}
