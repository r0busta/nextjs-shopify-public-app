import Shopify, { AuthQuery } from "@shopify/shopify-api"
import { Session } from "@shopify/shopify-api/dist/auth/session"
import { NextApiRequest, NextApiResponse } from "next/types"
import { validateAuthCallback, loadCurrentSession } from "../../../lib/auth"
import { saveShopifySessionInfo } from "../../../lib/storage"
import { registerUninstallWebhook } from "../../../lib/webhook"

async function afterAuth(req: NextApiRequest, _: NextApiResponse, currentSession: Session): Promise<string> {
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
        const query: AuthQuery = req.query as unknown as AuthQuery
        await validateAuthCallback(req, res, query)

        const currentSession = await loadCurrentSession(req, res)
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

    const userScopes = currentSession.onlineAccessInfo.associated_user_scope.split(",")
    return userScopes.every((scope) => scopes.includes(scope))
}
