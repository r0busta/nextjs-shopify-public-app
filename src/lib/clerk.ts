import { NextApiRequest } from "next/types"
import { sessions as clerkSessions } from "@clerk/clerk-sdk-node"

export function sessionsApi() {
    return clerkSessions
}

export function getClerkSessionToken(req: NextApiRequest) {
    return req.cookies["__session"]
}
