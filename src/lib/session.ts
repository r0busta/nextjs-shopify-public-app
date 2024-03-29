import Redis from "ioredis"
import { SessionStorage, SessionInterface, Session } from "../shopify/session"
import * as redis from "./redis"

class ShopifySessionStorage implements SessionStorage {
    private client: Redis
    private keyPrefix: string = "Shopify.Session"

    constructor() {
        this.client = redis.newClient()
    }

    storeSession(session: SessionInterface): Promise<boolean> {
        return this.client
            .set(this.key(session.id), JSON.stringify(session), "EX", session.onlineAccessInfo?.expires_in || 3600)
            .then(
                (v) => !!v,
                (e) => {
                    console.error(e)
                    return false
                }
            )
    }

    loadSession(id: string): Promise<SessionInterface | undefined> {
        return this.client.get(this.key(id)).then(
            (v) => {
                if (!v) return undefined
                return this.parse(v)
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    deleteSession(id: string): Promise<boolean> {
        return this.client.del(this.key(id)).then(
            (n) => n === 1,
            (e) => {
                console.error(e)
                return false
            }
        )
    }

    listByStore(store: string): Promise<string[] | undefined> {
        return this.client.keys(this.key("*")).then(
            async (v) => {
                const res = []
                for (const key of v) {
                    const val = await this.client.get(key)
                    if (!val) continue

                    const sess = this.parse(val)
                    if (!sess) continue
                    if (sess.shop === store) res.push(sess.id)
                }
                return res
            },
            (e) => {
                console.error(e)
                return undefined
            }
        )
    }

    private parse(v: string | null): SessionInterface | undefined {
        if (!v) return

        try {
            const obj = JSON.parse(v)

            let res: Session = { ...obj }
            res.expires = new Date(obj.expires)

            return res
        } catch (e: any) {
            console.error(e)
            return
        }
    }

    private key(id: string): string {
        return `${this.keyPrefix}.${id}`
    }
}

let _sessionStorage: ShopifySessionStorage
export function getSessionStorage() {
    if (!_sessionStorage) {
        _sessionStorage = new ShopifySessionStorage()
    }

    return _sessionStorage
}

// export default ShopifySessionStorage
