import { saveShopifySessionInfo } from "src/lib/storage"
import { Session, sessions as clerkSessions } from "@clerk/clerk-sdk-node"

jest.mock("@clerk/clerk-sdk-node")
const mockedClerkSessions = clerkSessions as jest.Mocked<typeof clerkSessions>

export async function addStore(
    store: string,
    userId: string = "my-clerk-user-id",
    shopifySessionId: string = "my-shopify-session-id"
) {
    const clerkSessionToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwic2lkIjoibXktc2lkIiwiaWF0IjoxNTE2MjM5MDIyfQ.ol3RnXn0g_D1S9X-SeKM1VjStUU7vKzY2d0buYdtK_0"
    const expires_in = 1000

    mockedClerkSessions.getSession.mockResolvedValue({ userId } as Session)

    try {
        await saveShopifySessionInfo(clerkSessionToken, store, shopifySessionId, expires_in)
    } catch (e) {
        throw e
    }
}
