import { getSessionStorage } from "src/lib/session"
import { SessionInterface } from "src/shopify/session"

jest.mock("ioredis", () => require("ioredis-mock"))

export async function shouldSaveSession(id: string, store: string, expires_in_s: number = 3600) {
    expect(
        await getSessionStorage().storeSession({
            id,
            shop: store,
            onlineAccessInfo: { expires_in: expires_in_s },
        } as SessionInterface)
    ).toBe(true)
}

export async function getSession(id: string) {
    return await getSessionStorage().loadSession(id)
}
