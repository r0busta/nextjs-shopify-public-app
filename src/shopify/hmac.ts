import { timingSafeEqual, createHmac } from "crypto"
import { AuthQuery, stringifyQuery } from "./auth"

export function safeCompare(
    strA: string | { [key: string]: string } | string[] | number[],
    strB: string | { [key: string]: string } | string[] | number[]
): boolean {
    if (typeof strA === typeof strB) {
        let buffA: Buffer
        let buffB: Buffer

        if (typeof strA === "object" && typeof strB === "object") {
            buffA = Buffer.from(JSON.stringify(strA))
            buffB = Buffer.from(JSON.stringify(strB))
        } else {
            buffA = Buffer.from(strA as string)
            buffB = Buffer.from(strB as string)
        }

        if (buffA.length === buffB.length) {
            return timingSafeEqual(buffA, buffB)
        }
    } else {
        throw new Error(`Mismatched data types provided: ${typeof strA} and ${typeof strB}`)
    }
    return false
}

export function generateLocalHmac({ code, timestamp, state, shop, host }: AuthQuery): string {
    const API_SECRET_KEY = process.env.SHOPIFY_APP_API_SECRET_KEY || ""
    const queryString = stringifyQuery({
        code,
        timestamp,
        state,
        shop,
        ...(host && { host }),
    })
    return createHmac("sha256", API_SECRET_KEY).update(queryString).digest("hex")
}

/**
 * Uses the received query to validate the contained hmac value against the rest of the query content.
 *
 * @param query HTTP Request Query, containing the information to be validated.
 */
export default function validateHmac(query: AuthQuery): boolean {
    if (!query.hmac) {
        throw new Error("Query does not contain an HMAC value.")
    }
    const { hmac } = query
    const localHmac = generateLocalHmac(query)
    return safeCompare(hmac as string, localHmac)
}
