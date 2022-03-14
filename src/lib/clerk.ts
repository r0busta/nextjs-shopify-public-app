import { NextApiRequest } from "next/types"

const Clerk = require("@clerk/clerk-sdk-node/instance").default

export function newClient() {
    return new Clerk({ apiKey: process.env.CLERK_API_KEY || "" })
}

export function getClerkSessionToken(req: NextApiRequest) {
    return req.cookies["__session"]
}
