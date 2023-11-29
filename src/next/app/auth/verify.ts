import { NextApiRequest, NextApiResponse } from "next/types"
import { getClerkSessionToken } from "../../../lib/clerk"
import { getAccessToken } from "../../../lib/storage"

export type TokenResponse = {
    success: boolean
}

export default async function authVerifyHandler(req: NextApiRequest, res: NextApiResponse<TokenResponse>) {
    const clerkSessionToken = getClerkSessionToken(req)
    const storeDomainHeader = req.headers["x-shopify-store-domain"]
    if (!clerkSessionToken || !storeDomainHeader) {
        res.status(401).json({ success: false })
        return
    }

    const [store, accessToken, err] = await getAccessToken(
        clerkSessionToken,
        (Array.isArray(storeDomainHeader) ? storeDomainHeader[0] : storeDomainHeader) || ""
    )

    if (err || !store || !accessToken) {
        console.error(err)
        res.status(401).json({ success: false })
        return
    }

    res.status(200).json({ success: true })
}
