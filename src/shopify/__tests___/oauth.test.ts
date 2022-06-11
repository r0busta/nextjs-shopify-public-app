import http from "http"
import fetch from "node-fetch"
import nock from "nock"
import Cookies from "cookies"
import { AuthQuery, stringifyQuery } from "../auth"
import { generateLocalHmac } from "../hmac"
import { ShopifyOAuth } from "../oauth"
import { SessionInterface, SessionStorage } from "../session"

jest.mock("cookies")

class InMemorySessionStorage implements SessionStorage {
    private storage: { [key: string]: SessionInterface } = {}
    storeSession(session: SessionInterface): Promise<boolean> {
        this.storage[session.id] = session
        return Promise.resolve(true)
    }
    loadSession(id: string): Promise<SessionInterface | undefined> {
        if (!this.storage[id]) return Promise.resolve(undefined)
        return Promise.resolve(this.storage[id])
    }
    deleteSession(id: string): Promise<boolean> {
        if (!this.storage[id]) return Promise.resolve(false)

        delete this.storage[id]
        return Promise.resolve(true)
    }
}

describe("getShopifyAuthURL", () => {
    it("should build shopify auth URL", async () => {
        const oauth = new ShopifyOAuth(new InMemorySessionStorage(), "my-app.com", "my-api-key", "my-api-secret-key", [
            "read_products",
        ])
        const server = http.createServer(async (req, res) => {
            const store = "my-store.myshopify.com"
            const redirectPath = "/localhost/app"
            const authURL = await oauth.beginAuth(req, res, store, redirectPath)

            const url = new URL(authURL)
            expect(`${url.origin}${url.pathname}`).toBe("https://my-store.myshopify.com/admin/oauth/authorize")
            expect(url.searchParams.get("scope")).toBe("read_products")
            expect(url.searchParams.get("client_id")).toBe("my-api-key")
            expect(url.searchParams.get("redirect_uri")).toBe("https://my-app.com/localhost/app")
            expect(url.searchParams.get("state")).toBeTruthy()
            expect(url.searchParams.get("grant_options[]")).toBe("per-user")

            res.writeHead(200)
            res.end()
            return
        })
        server.listen(3000)

        expect((await fetch("http://localhost:3000/")).status).toBe(200)
        server.close()
    })
})

describe("validateAuthCallback", () => {
    let cookies: {
        id: string
        expires?: Date
    } = {
        id: "",
        expires: undefined,
    }

    beforeEach(() => {
        cookies = {
            id: "",
            expires: undefined,
        }
        Cookies.prototype.set.mockImplementation(
            (cookieName: string, cookieValue: string, options: { expires: Date }) => {
                expect(cookieName).toBe("shopify_app_session")
                cookies.id = cookieValue
                cookies.expires = options.expires
            }
        )

        Cookies.prototype.get.mockImplementation(() => cookies.id)
    })
    it("should validate an auth callback", async () => {
        const shop = "my-store.myshopify.com"
        const secretKey = "my-api-secret-key"
        const sessionStorage = new InMemorySessionStorage()
        const oauth = new ShopifyOAuth(sessionStorage, "my-app.com", "my-api-key", secretKey, ["read_products"])
        const server = http.createServer(async (req, res) => {
            const u = new URL(req.url || "", "http://localhost:3000")
            const q = new URLSearchParams(u.search)

            let query: AuthQuery = {} as AuthQuery
            q.forEach((value: string, name: string) => {
                Object.assign(query, { [name]: value })
            })

            try {
                nock(`https://${shop}`).post("/admin/oauth/access_token").reply(200, {
                    access_token: "foo",
                })
                await oauth.validateAuthCallback(req, res, query)
            } catch (e) {
                console.error(e)
                res.writeHead(401).end()
                return
            }

            res.writeHead(200).end()
            return
        })
        server.listen(3000)

        let req: http.IncomingMessage = {} as http.IncomingMessage
        let res: http.ServerResponse = {} as http.ServerResponse
        await oauth.beginAuth(req, res, shop, "/some-callback")

        const session = await sessionStorage.loadSession(cookies.id)
        const query: AuthQuery = {
            shop,
            state: session ? session.state : "",
            timestamp: Number(new Date()).toString(),
            code: "some random auth code",
        }
        const expectedHmac = generateLocalHmac(secretKey, query)
        query.hmac = expectedHmac

        expect((await fetch(`http://localhost:3000?${stringifyQuery(query)}`)).status).toBe(200)
        server.close()
    })
})
