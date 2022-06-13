import { NextApiRequest, NextApiResponse } from "next/types"
import { saveShopifySessionInfo } from "../../../lib/storage"
import { getSessionStorage } from "../../../lib/session"
import { registerUninstallWebhook } from "../../../lib/webhook"
import { Session as ShopifySession } from "../../../shopify/session"
import { ShopifyOAuth } from "../../../shopify/oauth"
import { AuthQuery } from "../../../shopify/auth"

async function afterAuth(req: NextApiRequest, _: NextApiResponse, currentSession: ShopifySession): Promise<string> {
    const { id, onlineAccessInfo, shop: store, accessToken } = currentSession

    if (!accessToken) {
        throw new Error("No access token")
    }

    try {
        const clerkSessionToken = req.cookies["__session"]
        await saveShopifySessionInfo(clerkSessionToken, store, id, onlineAccessInfo?.expires_in)
    } catch (e) {
        console.error(`Couldn't save store info: ${e}`)
        throw e
    }

    await registerUninstallWebhook(store, accessToken)

    return "/shopify/auth/success"
}

export default async function authCallbackHandler(req: NextApiRequest, res: NextApiResponse) {
    let redirectUrl = `/?host=${req.query.host}`

    try {
        const oauth = new ShopifyOAuth(
            getSessionStorage(),
            process.env.HOST,
            process.env.SHOPIFY_APP_API_KEY,
            process.env.SHOPIFY_APP_API_SECRET_KEY,
            process.env.SCOPES
        )

        const query: AuthQuery = req.query as unknown as AuthQuery
        await oauth.validateAuthCallback(req, res, query)

        const currentSession = await oauth.loadCurrentSession(req, res)
        if (typeof currentSession === "undefined") {
            console.error("Couldn't load current session")
            res.writeHead(500)
            res.end("Failed to load current session.")
            return
        }

        if (!hasScopes(currentSession, (process.env.SCOPES || "").split(","))) {
            console.error(`User ${currentSession.id} doesn't have the required scopes.`)
            res.writeHead(403)
            res.end("Unauthorized")
            return
        }

        console.log("Successfully signed in")
        if (typeof afterAuth === "function") {
            redirectUrl = (await afterAuth(req, res, currentSession)) || redirectUrl
        }

        res.writeHead(302, { Location: redirectUrl })
        res.end()
    } catch (e: any) {
        console.error(e)

        res.writeHead(500)
        res.end(`Failed to complete OAuth process: ${e.message}`)
    }
}

function hasScopes(currentSession: ShopifySession, scopes: string[]): boolean {
    if (!currentSession.onlineAccessInfo) {
        return false
    }

    const userScopes = currentSession.onlineAccessInfo.associated_user_scope.split(",")
    return userScopes.every((scope) => scopes.includes(scope))
}
