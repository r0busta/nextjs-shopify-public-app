import { NextApiHandler, NextApiRequest, NextApiResponse } from "next/types"
import { requireWebhookPath } from "../../lib/webhook"
import authCallbackHandler from "./auth/callback"
import authLoginHandler from "./auth/login"
import authVerifyHandler from "./auth/verify"
import listStoresHandler from "./stores"
import webhookUninstallHandler from "./webhook/uninstall"

export function requireAppRoutes(): NextApiHandler {
    return async function nextApiHandler(req: NextApiRequest, res: NextApiResponse) {
        const { action } = req.query
        const path = Array.isArray(action) ? action : [action]

        switch (path.join("/")) {
            case "auth/callback":
                return authCallbackHandler(req, res)
            case "auth/login":
                return authLoginHandler(req, res)
            case "auth/verify":
                return authVerifyHandler(req, res)
            case "webhook/uninstall":
                return requireWebhookPath(webhookUninstallHandler)(req, res)
            case "stores":
                if (req.method === "GET") {
                    return listStoresHandler(req, res)
                } else {
                    res.status(405).end()
                }
        }

        res.send(404)
        res.end()
    }
}
