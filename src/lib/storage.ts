import Redis from "ioredis"
import * as redis from "./redis"
import * as clerk from "./clerk"
import { parseJwt } from "./token"
import getShopify from "./shopify"

class StoreUsersStorage {
    private client: Redis
    private keyPrefix: string = "User.Stores"

    constructor() {
        this.client = redis.newClient()
    }

    async add(store: string, userId: string): Promise<boolean> {
        return this.client.sadd(this.key(store), userId).then(
            (n) => n <= 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    list(store: string): Promise<string[] | undefined> {
        return this.client.smembers(this.key(store)).then(
            (v) => v,
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    // #TODO: Optimize this by using a user-to-store mapping
    listStores(userId: string): Promise<string[] | undefined> {
        return this.client.keys(this.key("*")).then(
            async (v) => {
                const res = []
                for (const key of v) {
                    const { store } = this.parseKey(key)
                    const users = await this.list(store)
                    if (users && users.includes(userId)) {
                        res.push(store)
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

    delete(store: string): Promise<boolean> {
        return this.client.del(this.key(store)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    deleteUser(store: string, userId: string): Promise<boolean> {
        return this.client.srem(this.key(store), [userId]).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(store: string): string {
        return `${this.keyPrefix}.${store}`
    }

    private parseKey(key: string): { store: string } {
        return { store: key.split(".").splice(2).join(".") }
    }
}

class StoreSessionStorage {
    private client: Redis
    private keyPrefix: string = "User.StoreSessions"

    constructor() {
        this.client = redis.newClient()
    }

    add(userId: string, store: string, sessionId: string, expires_in: number): Promise<boolean> {
        return this.client.set(this.key(userId, store), sessionId, "EX", expires_in).then(
            (v) => !!v,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    get(userId: string, store: string): Promise<string | undefined> {
        return this.client.get(this.key(userId, store)).then(
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

    listByStore(userIds: string[], store: string): Promise<string[] | undefined> {
        return this.client.mget(userIds.map((id) => this.key(id, store))).then(
            (v) => v.filter((item) => !!item) as string[],
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    delete(userId: string, store: string): Promise<boolean> {
        return this.client.del(this.key(userId, store)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    deleteAll(userIds: string[], store: string): Promise<boolean> {
        return this.client.del(userIds.map((id) => this.key(id, store))).then(
            (n) => n === userIds.length,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    private key(id: string, store: string): string {
        return `${this.keyPrefix}.${id}.${store}`
    }
}

class StoreService {
    private storeUsersStorage: StoreUsersStorage
    private storeSessionStorage: StoreSessionStorage

    constructor() {
        this.storeUsersStorage = new StoreUsersStorage()
        this.storeSessionStorage = new StoreSessionStorage()
    }

    async saveSession(userId: string, store: string, sessionId: string, expires_in: number): Promise<boolean> {
        const ok = await this.storeUsersStorage.add(store, userId)
        if (!ok) {
            console.error(`Failed to add user ${userId} to store ${store}`)
            return false
        }

        return this.storeSessionStorage.add(userId, store, sessionId, expires_in)
    }

    async getToken(userId: string, store: string): Promise<string | undefined> {
        const sessionId = await this.getShopifySessionId(userId, store)
        if (!sessionId) {
            console.error(`No session found for user ${userId} and store ${store}`)
            return undefined
        }

        const currentSession = await getShopify().Context.SESSION_STORAGE.loadSession(sessionId)
        if (!currentSession || !currentSession.expires || currentSession.expires.getTime() < Date.now()) {
            console.error("No Shopify session found or session expired for user ${userId} and store ${store}")
            return undefined
        }

        return currentSession.accessToken
    }

    async listStores(userId: string): Promise<string[] | undefined> {
        return this.storeUsersStorage.listStores(userId)
    }

    async deleteStore(store: string): Promise<boolean> {
        const userIds = await this.storeUsersStorage.list(store)
        if (userIds && userIds.length > 0) {
            const sessionIds = await this.storeSessionStorage.listByStore(userIds, store)

            if (sessionIds && sessionIds.length > 0) {
                for (const sessionId of sessionIds) {
                    await getShopify().Context.SESSION_STORAGE.deleteSession(sessionId)
                }
            }

            await this.storeSessionStorage.deleteAll(userIds, store)
        }

        return this.storeUsersStorage.delete(store)
    }

    private async getShopifySessionId(userId: string, store: string): Promise<string | undefined> {
        const userIds = await this.storeUsersStorage.list(store)
        if (!userIds || !userIds.includes(userId)) {
            console.log(`No user found for store ${store}`)
            return undefined
        }

        return this.storeSessionStorage.get(userId, store)
    }
}

let _storeService: StoreService
function getStoreService() {
    if (!_storeService) {
        _storeService = new StoreService()
    }

    return _storeService
}

export async function saveShopifySessionInfo(
    clerkSessionToken: string,
    store: string,
    shopifySessionId: string,
    expires_in: number | undefined
) {
    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        throw new Error("Could not find userId")
    }

    const ok = await getStoreService().saveSession(userId, store, shopifySessionId, expires_in || 3600)
    if (!ok) {
        throw new Error("Could not save store")
    }
}

export async function getAccessToken(
    clerkSessionToken: string,
    store: string
): Promise<[string | undefined, string | undefined, Error | null]> {
    if (clerkSessionToken === "") {
        return [undefined, undefined, new Error("Clerk session token is not set.")]
    }
    if (store === "") {
        return [undefined, undefined, new Error("Unknown store domain.")]
    }

    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        return [undefined, undefined, new Error("Failed to get current user.")]
    }

    const accessToken = await getStoreService().getToken(userId, store)
    if (!accessToken) {
        return [undefined, undefined, new Error("Failed to get access token.")]
    }

    return [store, accessToken, null]
}

export async function listStores(clerkSessionToken: string): Promise<string[] | undefined> {
    const userId = await getUserId(clerkSessionToken)
    if (!userId) {
        throw new Error("Could not find userId")
    }

    return getStoreService().listStores(userId)
}

export async function deleteStore(store: string) {
    return getStoreService().deleteStore(store)
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
