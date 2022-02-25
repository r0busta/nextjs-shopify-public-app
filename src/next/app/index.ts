import { NextApiHandler, NextApiRequest, NextApiResponse } from "next/types"
import authCallbackHandler from "./auth/callback"
import authLoginHandler from "./auth/login"
import authVerifyHandler from "./auth/verify"
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
                return webhookUninstallHandler(req, res)
        }

        res.send(404)
        res.end()
    }
}
