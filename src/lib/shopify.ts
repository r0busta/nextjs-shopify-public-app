import * as shopify from "@shopify/shopify-api"
import RedisSessionStorage from "./session"

const context: shopify.ContextParams = {
    IS_EMBEDDED_APP: false,
    API_KEY: process.env.SHOPIFY_APP_API_KEY || "",
    API_SECRET_KEY: process.env.SHOPIFY_APP_API_SECRET_KEY || "",
    SCOPES: [process.env.SCOPES || ""],
    HOST_NAME: process.env.HOST || "",
    API_VERSION: shopify.ApiVersion.Unstable,
    SESSION_STORAGE: new RedisSessionStorage(),
}

shopify.Shopify.Context.initialize(context)

export default function getShopify() {
    return shopify.Shopify
}
