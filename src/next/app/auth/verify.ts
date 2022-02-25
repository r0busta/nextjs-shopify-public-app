import { NextApiRequest, NextApiResponse } from "next/types"
import { getAccessToken } from "../../../lib/storage"

export type TokenResponse = {
    success: boolean
}

export default async function authVerifyHandler(req: NextApiRequest, res: NextApiResponse<TokenResponse>) {
    const clerkSessionToken = req.cookies["__session"]
    const shopDomainHeader = req.headers["x-shopify-shop-domain"]
    const [shop, accessToken, err] = await getAccessToken(
        clerkSessionToken,
        (Array.isArray(shopDomainHeader) ? shopDomainHeader[0] : shopDomainHeader) || ""
    )

    if (err || !shop || !accessToken) {
        console.error(err)
        res.status(401).json({ success: false })
        return
    }

    res.status(200).json({ success: true })
}
