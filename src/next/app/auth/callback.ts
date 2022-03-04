import type { NextApiRequest, NextApiResponse } from "next"
import Shopify, { AuthQuery } from "@shopify/shopify-api"
import { Session } from "@shopify/shopify-api/dist/auth/session"
import { validateAuthCallback, loadCurrentSession } from "../../../lib/auth"
import { saveShopifySessionInfo } from "../../../lib/storage"
import { registerUninstallWebhook } from "../../../lib/webhook"

async function afterAuth(req: NextApiRequest, res: NextApiResponse, currentSession: Session): Promise<string> {
    const { id, onlineAccessInfo, shop, accessToken } = currentSession

    if (!accessToken) {
        throw new Error("No access token")
    }

    try {
        const clerkSessionToken = req.cookies["__session"]
        await saveShopifySessionInfo(clerkSessionToken, shop, id, onlineAccessInfo?.expires_in)
    } catch (e) {
        console.error(`Couldn't save shop info: ${e}`)
        throw e
    }

    await registerUninstallWebhook(shop, accessToken)

    return "/shopify/auth/success"
}

export default async function authCallbackHandler(req: NextApiRequest, res: NextApiResponse) {
    let redirectUrl = `/?host=${req.query.host}`

    try {
        const query: AuthQuery = req.query as unknown as AuthQuery
        await validateAuthCallback(req, res, query)

        const currentSession = await loadCurrentSession(req, res)
        if (typeof currentSession === "undefined") {
            res.writeHead(500)
            res.end("Failed to load current session.")
            return
        }

        if (!hasScopes(currentSession, (process.env.SCOPES || "").split(","))) {
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
        if (e instanceof Shopify.Errors.ShopifyError) {
            res.end(e.message)
        } else {
            res.end(`Failed to complete OAuth process: ${e.message}`)
        }
    }
}

function hasScopes(currentSession: Session, scopes: string[]): boolean {
    if (!currentSession.onlineAccessInfo) {
        return false
    }

    const currentScopes = currentSession.onlineAccessInfo.associated_user_scope.split(",")
    return scopes.every((scope) => currentScopes.includes(scope))
}
