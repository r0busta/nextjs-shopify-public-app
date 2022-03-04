import type { NextApiRequest, NextApiResponse } from "next"
import Shopify from "@shopify/shopify-api"
import { beginAuth } from "../../../lib/auth"

export default async function authLoginHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { shop } = req.query
        const authRoute = await beginAuth(req, res, shop as string, "/api/shopify/auth/callback")
        res.redirect(authRoute)
    } catch (e: any) {
        console.error(e)

        res.writeHead(500)
        if (e instanceof Shopify.Errors.ShopifyError) {
            res.end(e.message)
        } else {
            res.end(`Failed to complete OAuth process: ${e.message}`)
        }
    }
}
