import http from "http"
import { AuthQuery } from "@shopify/shopify-api"
import getShopify from "./shopify"

export function beginAuth(req: http.IncomingMessage, res: http.ServerResponse, shop: string, redirectPath: string) {
    return getShopify().Auth.beginAuth(req, res, shop, redirectPath, true)
}

export function validateAuthCallback(req: http.IncomingMessage, res: http.ServerResponse, query: AuthQuery) {
    return getShopify().Auth.validateAuthCallback(req, res, query)
}

export function loadCurrentSession(req: http.IncomingMessage, res: http.ServerResponse) {
    return getShopify().Utils.loadCurrentSession(req, res)
}
