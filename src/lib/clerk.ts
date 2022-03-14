import Clerk from "@clerk/clerk-sdk-node/instance"
import { NextApiRequest } from "next/types"

export function newClient() {
    return new Clerk({ apiKey: process.env.CLERK_API_KEY || "" })
}

export function getClerkSessionToken(req: NextApiRequest) {
    return req.cookies["__session"]
}
