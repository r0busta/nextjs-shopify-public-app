import { NextApiRequest, NextApiResponse } from "next/types"
import { getSessionStorage } from "../../../lib/session"
import { ShopifyOAuth } from "../../../shopify/oauth"

export default async function authLoginHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { store } = req.query
        const oauth = new ShopifyOAuth(
            getSessionStorage(),
            process.env.HOST,
            process.env.SHOPIFY_APP_API_KEY,
            process.env.SHOPIFY_APP_API_SECRET_KEY,
            process.env.SCOPES
        )
        const authRoute = await oauth.beginAuth(req, res, store as string, "/api/shopify/auth/callback")
        res.redirect(authRoute)
    } catch (e: any) {
        console.error(e)

        res.writeHead(500)
        res.end(`Failed to complete OAuth process: ${e.message}`)
    }
}
