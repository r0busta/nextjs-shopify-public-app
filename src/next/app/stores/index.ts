import { NextApiRequest, NextApiResponse } from "next/types"
import { getClerkSessionToken } from "../../../lib/clerk"
import { listStores } from "../../../lib/storage"

type Data = {
    stores: string[]
}

export default async function listStoresHandler(req: NextApiRequest, res: NextApiResponse<Data>) {
    const stores = await listStores(getClerkSessionToken(req))
    if (!Array.isArray(stores)) {
        res.status(404).json({ stores: [] })
    }

    res.status(200).json({ stores: stores! })
}
