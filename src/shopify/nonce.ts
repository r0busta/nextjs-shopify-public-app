import { randomBytes } from "crypto"

export function nonce(): string {
    const length = 15
    const bytes = randomBytes(length)

    const nonce = bytes
        .map((byte) => {
            return byte % 10
        })
        .join("")

    return nonce
}
