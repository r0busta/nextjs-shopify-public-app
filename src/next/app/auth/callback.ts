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

        const ms = missingScopes(currentSession, (process.env.SCOPES || "").split(","))
        if (ms.length > 0) {
            console.error(`User ${currentSession.id} lacks the following scopes: ${ms.join(", ")}`)
            res.writeHead(403)
            res.end(
                `Unauthorized. You lack the required permissions. Please ask the store owner to grant you the following permissions via the Shopify admin: ${ms.join(
                    ", "
                )}`
            )
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

export function missingScopes(currentSession: ShopifySession, requiredScopes: string[]): string[] {
    if (!currentSession.onlineAccessInfo) {
        return []
    }

    const userScopes = currentSession.onlineAccessInfo.associated_user_scope.split(",")
    const diff = requiredScopes.filter((scope) => !userScopes.includes(scope))
    return diff
}
