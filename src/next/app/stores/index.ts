import { NextApiRequest, NextApiResponse } from "next/types"
import { getClerkSessionToken } from "../../../lib/clerk"
import { listStores } from "../../../lib/storage"

type Data = {
    stores: string[]
}

export default async function listStoresHandler(req: NextApiRequest, res: NextApiResponse<Data>) {
    const clerkSessionToken = getClerkSessionToken(req)
    if (!clerkSessionToken) {
        res.status(401).json({ stores: [] })
        return
    }

    const stores = await listStores(clerkSessionToken)
    if (!Array.isArray(stores)) {
        res.status(404).json({ stores: [] })
    }

    res.status(200).json({ stores: stores! })
}
