import { SessionInterface as SessionInterfaceSession } from "../../../../shopify/session"
import { missingScopes } from "../callback"

describe("missingScopes", () => {
    it("should return an empty array when the scopes are the same", () => {
        const requiredScopes = ["read_products", "write_products"]
        const diff = missingScopes(
            { onlineAccessInfo: { associated_user_scope: "read_products,write_products" } } as SessionInterfaceSession,
            requiredScopes
        )
        expect(diff).toEqual([])
    })
    it("should return the difference between the scopes and the user's scopes", () => {
        const requiredScopes = ["read_products", "write_products", "read_orders", "write_orders"]
        const diff = missingScopes(
            { onlineAccessInfo: { associated_user_scope: "read_products,write_orders" } } as SessionInterfaceSession,
            requiredScopes
        )
        expect(diff).toEqual(["write_products", "read_orders"])
    })
})
