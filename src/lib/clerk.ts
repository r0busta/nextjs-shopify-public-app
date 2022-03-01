import { NextApiRequest } from "next/types"

export function getClerkSessionToken(req: NextApiRequest) {
    return req.cookies["__session"]
}
