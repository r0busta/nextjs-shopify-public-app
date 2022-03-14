import ioredis from "ioredis"
import * as redis from "./redis"
import * as clerk from "./clerk"
import { parseJwt } from "./token"
import getShopify from "./shopify"

class ShopUsersStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "User.Shops"

    constructor() {
        this.client = redis.newClient()
    }

    async add(shop: string, userId: string): Promise<boolean> {
        return this.client.sadd(this.key(shop), userId).then(
            (n) => n <= 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    list(shop: string): Promise<string[] | undefined> {
        return this.client.smembers(this.key(shop)).then(
            (v) => v,
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    // #TODO: Optimize this by using a user-to-shop mapping
    listShops(userId: string): Promise<string[] | undefined> {
        return this.client.keys(this.key("*")).then(
            async (v) => {
                const res = []
                for (const key of v) {
                    const { shop } = this.parseKey(key)
                    const users = await this.list(shop)
                    if (users && users.includes(userId)) {
                        res.push(shop)
                    }
                }
                return res
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(shop: string): Promise<boolean> {
        return this.client.del(this.key(shop)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    deleteUser(shop: string, userId: string): Promise<boolean> {
        return this.client.srem(this.key(shop), [userId]).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(shop: string): string {
        return `${this.keyPrefix}.${shop}`
    }

    private parseKey(key: string): { shop: string } {
        return { shop: key.split(".").splice(2).join(".") }
    }
}

class ShopSessionStorage {
    private client: ioredis.Redis
    private keyPrefix: string = "User.ShopSessions"

    constructor() {
        this.client = redis.newClient()
    }

    add(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
        return this.client.set(this.key(userId, shop), sessionId, "EX", expires_in).then(
            (v) => !!v,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    get(userId: string, shop: string): Promise<string | undefined> {
        return this.client.get(this.key(userId, shop)).then(
            (v) => {
                if (!v) return undefined
                return v
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    listByShop(userIds: string[], shop: string): Promise<string[] | undefined> {
        return this.client.mget(userIds.map((id) => this.key(id, shop))).then(
            (v) => v.filter((item) => !!item) as string[],
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(userId: string, shop: string): Promise<boolean> {
        return this.client.del(this.key(userId, shop)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    deleteAll(userIds: string[], shop: string): Promise<boolean> {
        return this.client.del(userIds.map((id) => this.key(id, shop))).then(
            (n) => n === userIds.length,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(id: string, shop: string): string {
        return `${this.keyPrefix}.${id}.${shop}`
    }
}

class ShopService {
    private shopUsersStorage: ShopUsersStorage
    private shopSessionStorage: ShopSessionStorage

    constructor() {
        this.shopUsersStorage = new ShopUsersStorage()
        this.shopSessionStorage = new ShopSessionStorage()
    }

    async saveSession(userId: string, shop: string, sessionId: string, expires_in: number): Promise<boolean> {
        const ok = await this.shopUsersStorage.add(shop, userId)
        if (!ok) {
            console.error(`Failed to add user ${userId} to shop ${shop}`)
            return false
        }

        return this.shopSessionStorage.add(userId, shop, sessionId, expires_in)
    }

    async getToken(userId: string, shop: string): Promise<string | undefined> {
        const sessionId = await this.getShopifySessionId(userId, shop)
        if (!sessionId) {
            console.error(`No session found for user ${userId} and shop ${shop}`)
            return undefined
        }

        const currentSession = await getShopify().Context.SESSION_STORAGE.loadSession(sessionId)
        if (!currentSession || !currentSession.expires || currentSession.expires.getTime() < Date.now()) {
            console.error("No Shopify session found or session expired for user ${userId} and shop ${shop}")
            return undefined
        }

        return currentSession.accessToken
    }

    async listShops(userId: string): Promise<string[] | undefined> {
        return this.shopUsersStorage.listShops(userId)
    }

    async deleteShop(shop: string): Promise<boolean> {
        const userIds = await this.shopUsersStorage.list(shop)
        if (userIds && userIds.length > 0) {
            const sessionIds = await this.shopSessionStorage.listByShop(userIds, shop)

            if (sessionIds && sessionIds.length > 0) {
                for (const sessionId of sessionIds) {
                    await getShopify().Context.SESSION_STORAGE.deleteSession(sessionId)
                }
            }

            await this.shopSessionStorage.deleteAll(userIds, shop)
        }

        return this.shopUsersStorage.delete(shop)
    }

    private async getShopifySessionId(userId: string, shop: string): Promise<string | undefined> {
        const userIds = await this.shopUsersStorage.list(shop)
        if (!userIds || !userIds.includes(userId)) {
            console.log(`No user found for shop ${shop}`)
            return undefined
        }

        return this.shopSessionStorage.get(userId, shop)
    }
}

let _shopService: ShopService
function getShopService() {
    if (!_shopService) {
        _shopService = new ShopService()
    }

    return _shopService
}

export async function saveShopifySessionInfo(
    clerkSessionToken: string,
    shop: string,
    shopifySessionId: string,
    expires_in: number | undefined
) {
    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        throw new Error("Could not find userId")
    }

    const ok = await getShopService().saveSession(userId, shop, shopifySessionId, expires_in || 3600)
    if (!ok) {
        throw new Error("Could not save shop")
    }
}

export async function getAccessToken(
    clerkSessionToken: string,
    shop: string
): Promise<[string | undefined, string | undefined, Error | null]> {
    if (clerkSessionToken === "") {
        return [undefined, undefined, new Error("Clerk session token is not set.")]
    }
    if (shop === "") {
        return [undefined, undefined, new Error("Unknown shop domain.")]
    }

    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        return [undefined, undefined, new Error("Failed to get current user.")]
    }

    const accessToken = await getShopService().getToken(userId, shop)
    if (!accessToken) {
        return [undefined, undefined, new Error("Failed to get access token.")]
    }

    return [shop, accessToken, null]
}

export async function listShops(clerkSessionToken: string): Promise<string[] | undefined> {
    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        throw new Error("Could not find userId")
    }

    return getShopService().listShops(userId)
}

export async function deleteShop(shop: string) {
    return getShopService().deleteShop(shop)
}

async function getUserId(clerkSessionToken: string): Promise<string | undefined> {
    let userId: string | undefined
    try {
        const sessionId = parseJwt(clerkSessionToken)?.sid

        const clerkSession = await clerk.newClient().sessions.getSession(sessionId)
        if (clerkSession.userId) {
            userId = clerkSession.userId
        }
    } catch (e) {
        console.error(e)
        throw e
    }
    return userId
}
