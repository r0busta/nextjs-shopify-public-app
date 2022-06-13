import { NextApiRequest, NextApiResponse } from "next/types"
import { deleteStore } from "../../../lib/storage"

export default async function webhookUninstallHandler(req: NextApiRequest, res: NextApiResponse) {
    const storeDomainHeader = req.headers["x-shopify-shop-domain"]
    const store = (Array.isArray(storeDomainHeader) ? storeDomainHeader[0] : storeDomainHeader) || ""

    if(store === "") {
        res.writeHead(400, "Store domain required").end()
        return
    }

    console.log(`Deleting store ${store}`)

    const ok = await deleteStore(store)
    if (!ok) {
        console.error(`Failed to delete store ${store}`)
        res.writeHead(500).end()
        return
    }

    res.writeHead(200).end()
    return
}
