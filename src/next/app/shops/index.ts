import { NextApiRequest, NextApiResponse } from "next/types"
import { getClerkSessionToken } from "../../../lib/clerk"
import { listShops } from "../../../lib/storage"

type Data = {
    shops: string[]
}

export default async function listShopsHandler(req: NextApiRequest, res: NextApiResponse<Data>) {
    const shops = await listShops(getClerkSessionToken(req))
    if (!Array.isArray(shops)) {
        res.status(404).json({ shops: [] })
    }

    res.status(200).json({ shops: shops! })
}
