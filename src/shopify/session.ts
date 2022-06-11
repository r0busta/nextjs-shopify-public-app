import { AuthScopes } from "./auth"

export interface OnlineAccessInfo {
    expires_in: number
    associated_user_scope: string
    associated_user: {
        id: number
        first_name: string
        last_name: string
        email: string
        email_verified: boolean
        account_owner: boolean
        locale: string
        collaborator: boolean
    }
}

export interface SessionInterface {
    readonly id: string
    shop: string
    state: string
    isOnline: boolean
    scope?: string
    expires?: Date
    accessToken?: string
    onlineAccessInfo?: OnlineAccessInfo
    isActive(): boolean
}

export class Session implements SessionInterface {
    public static cloneSession(session: Session, newId: string): Session {
        const newSession = new Session(newId, session.shop, session.state, session.isOnline)

        newSession.scope = session.scope
        newSession.expires = session.expires
        newSession.accessToken = session.accessToken
        newSession.onlineAccessInfo = session.onlineAccessInfo

        return newSession
    }

    public scope?: string
    public expires?: Date
    public accessToken?: string
    public onlineAccessInfo?: OnlineAccessInfo

    constructor(readonly id: string, public shop: string, public state: string, public isOnline: boolean) {}

    public isActive(): boolean {
        const SCOPES = new AuthScopes([process.env.SCOPES || ""])
        const scopesUnchanged = SCOPES.equals(this.scope)
        if (scopesUnchanged && this.accessToken && (!this.expires || this.expires >= new Date())) {
            return true
        }
        return false
    }
}

/**
 * Defines the strategy to be used to store sessions for the Shopify App.
 */
export interface SessionStorage {
    /**
     * Creates or updates the given session in storage.
     *
     * @param session Session to store
     */
    storeSession(session: SessionInterface): Promise<boolean>

    /**
     * Loads a session from storage.
     *
     * @param id Id of the session to load
     */
    loadSession(id: string): Promise<SessionInterface | undefined>

    /**
     * Deletes a session from storage.
     *
     * @param id Id of the session to delete
     */
    deleteSession(id: string): Promise<boolean>
}
