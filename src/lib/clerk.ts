import { NextApiRequest } from "next/types"
import { setClerkApiKey, sessions as clerkSessions } from "@clerk/clerk-sdk-node"

setClerkApiKey(process.env.CLERK_API_KEY || "")

export function sessionsApi() {
    return clerkSessions
}

export function getClerkSessionToken(req: NextApiRequest) {
    return req.cookies["__session"]
}
