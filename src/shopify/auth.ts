export interface AuthQuery {
    code: string
    timestamp: string
    state: string
    shop: string
    host?: string
    hmac?: string
}

export function stringifyQuery(query: AuthQuery): string {
    const q = Object.entries(query).map<[string, string]>(([key, value]) => [key, value])
    const sp = new URLSearchParams(q)
    sp.sort()
    return sp.toString()
}

export class AuthScopes {
    private static SCOPE_DELIMITER = ","

    private compressedScopes: Set<string>
    private expandedScopes: Set<string>

    constructor(scopes: string | string[] | undefined) {
        let scopesArray: string[] = []
        if (typeof scopes === "string") {
            scopesArray = scopes.split(new RegExp(`${AuthScopes.SCOPE_DELIMITER}\\s*`))
        } else if (scopes) {
            scopesArray = scopes
        }

        scopesArray = scopesArray.map((scope) => scope.trim()).filter((scope) => scope.length)

        const impliedScopes = this.getImpliedScopes(scopesArray)

        const scopeSet = new Set(scopesArray)
        const impliedSet = new Set(impliedScopes)

        this.compressedScopes = new Set([...scopeSet].filter((x) => !impliedSet.has(x)))
        this.expandedScopes = new Set([...scopeSet, ...impliedSet])
    }

    public has(scope: string | string[] | AuthScopes | undefined) {
        let other: AuthScopes

        if (scope instanceof AuthScopes) {
            other = scope
        } else {
            other = new AuthScopes(scope)
        }

        return other.toArray().filter((x) => !this.expandedScopes.has(x)).length === 0
    }

    public equals(otherScopes: string | string[] | AuthScopes | undefined) {
        let other: AuthScopes

        if (otherScopes instanceof AuthScopes) {
            other = otherScopes
        } else {
            other = new AuthScopes(otherScopes)
        }

        return (
            this.compressedScopes.size === other.compressedScopes.size &&
            this.toArray().filter((x) => !other.has(x)).length === 0
        )
    }

    public toString() {
        return this.toArray().join(AuthScopes.SCOPE_DELIMITER)
    }

    public toArray() {
        return [...this.compressedScopes]
    }

    private getImpliedScopes(scopesArray: string[]): string[] {
        return scopesArray.reduce((array: string[], current: string) => {
            const matches = current.match(/^(unauthenticated_)?write_(.*)$/)
            if (matches) {
                array.push(`${matches[1] ? matches[1] : ""}read_${matches[2]}`)
            }

            return array
        }, [])
    }
}
