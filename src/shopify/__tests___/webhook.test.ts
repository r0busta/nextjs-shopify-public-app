import nock from "nock"
import { register } from "../webhook"

describe("register", () => {
    it("should register webhook", async () => {
        const shop = "my-store.myshopify.com"

        nock(`https://${shop}`).post("/admin/api/2022-07/webhooks.json").reply(201, {
            webhook: {},
        })

        const res = await register("https", "my-app.com", {
            topic: "my-topic",
            path: "/webhook/handler",
            shop,
            accessToken: "my-token",
        })
        expect(res["my-topic"].success).toBe(true)
    })
})
