import * as shopify from "@shopify/shopify-api"
import ShopifySessionStorage from "./session"

let initialized = false

export default function getShopify() {
    if (!initialized) {
        const context: shopify.ContextParams = {
            IS_EMBEDDED_APP: false,
            API_KEY: process.env.SHOPIFY_APP_API_KEY || "",
            API_SECRET_KEY: process.env.SHOPIFY_APP_API_SECRET_KEY || "",
            SCOPES: [process.env.SCOPES || ""],
            HOST_NAME: process.env.HOST || "",
            API_VERSION: shopify.ApiVersion.Unstable,
            SESSION_STORAGE: new ShopifySessionStorage(),
        }

        shopify.Shopify.Context.initialize(context)
        initialized = true
    }

    return shopify.Shopify
}
