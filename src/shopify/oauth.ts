import http from "http"
import fetch from "node-fetch"
import { v4 as uuidv4 } from "uuid"
import Cookies from "cookies"
import validateHmac, { safeCompare } from "./hmac"
import { nonce } from "./nonce"
import { OnlineAccessInfo, Session, SessionStorage } from "./session"
import { AuthQuery, AuthScopes } from "./auth"

export interface AccessTokenResponse {
    access_token: string
    scope: string
}

interface OnlineAccessResponse extends AccessTokenResponse, OnlineAccessInfo {}

export class ShopifyOAuth {
    private static SESSION_COOKIE_NAME = "shopify_app_session"
    private HOST_SCHEME = "https"
    private HOST_NAME: string
    private API_KEY: string
    private API_SECRET_KEY: string
    private SCOPES: AuthScopes

    private sessionStorage: SessionStorage

    constructor(
        sessionStorage: SessionStorage,
        hostName: string = "",
        apiKey: string = "",
        apiSecretKey: string = "",
        scopes: string | string[] | undefined
    ) {
        this.sessionStorage = sessionStorage

        this.HOST_NAME = hostName
        this.API_KEY = apiKey
        this.API_SECRET_KEY = apiSecretKey
        this.SCOPES = new AuthScopes(scopes)
    }

    async beginAuth(req: http.IncomingMessage, res: http.ServerResponse, store: string, redirectPath: string) {
        const cookies = new Cookies(req, res, {
            keys: [this.API_SECRET_KEY],
            secure: true,
        })

        const state = nonce()

        const session = new Session(uuidv4(), store, state, true)

        const sessionStored = await this.sessionStorage.storeSession(session)

        if (!sessionStored) {
            throw new Error("OAuth Session could not be saved. Please check your session storage functionality.")
        }

        cookies.set(ShopifyOAuth.SESSION_COOKIE_NAME, session.id, {
            signed: true,
            expires: new Date(Date.now() + 60000),
            sameSite: "lax",
            secure: true,
        })

        const query = {
            client_id: this.API_KEY,
            scope: this.SCOPES.toString(),
            redirect_uri: `${this.HOST_SCHEME}://${this.HOST_NAME}${redirectPath}`,
            state,
            "grant_options[]": "per-user",
        }

        const queryString = new URLSearchParams(query).toString()

        return `https://${store}/admin/oauth/authorize?${queryString}`
    }

    async validateAuthCallback(req: http.IncomingMessage, res: http.ServerResponse, query: AuthQuery) {
        const cookies = new Cookies(req, res, {
            keys: [this.API_SECRET_KEY],
            secure: true,
        })

        const sessionCookie = this.getCookieSessionId(req, res)
        if (!sessionCookie) {
            throw new Error(`Cannot complete OAuth process. Could not find an OAuth cookie for shop url: ${query.shop}`)
        }

        let currentSession = await this.sessionStorage.loadSession(sessionCookie)
        if (!currentSession) {
            throw new Error(`Cannot complete OAuth process. No session found for the specified shop url: ${query.shop}`)
        }

        if (!this.isQueryValid(query, currentSession)) {
            throw new Error("Invalid OAuth callback.")
        }

        const body = {
            client_id: this.API_KEY,
            client_secret: this.API_SECRET_KEY,
            code: query.code,
        }

        const postResponse = await fetch(`https://${currentSession.shop}/admin/oauth/access_token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        const responseBody = (await postResponse.json()) as OnlineAccessResponse
        const { access_token, scope, ...rest } = responseBody
        const sessionExpiration = new Date(Date.now() + responseBody.expires_in * 1000)
        currentSession.accessToken = access_token
        currentSession.expires = sessionExpiration
        currentSession.scope = scope
        currentSession.onlineAccessInfo = rest

        cookies.set(ShopifyOAuth.SESSION_COOKIE_NAME, currentSession.id, {
            signed: true,
            expires: currentSession.expires,
            sameSite: "lax",
            secure: true,
        })

        const sessionStored = await this.sessionStorage.storeSession(currentSession)
        if (!sessionStored) {
            throw new Error("OAuth Session could not be saved. Please check your session storage functionality.")
        }

        return currentSession
    }

    isQueryValid(query: AuthQuery, session: Session): boolean {
        return validateHmac(this.API_SECRET_KEY, query) && safeCompare(query.state, session.state as string)
    }

    getCookieSessionId(request: http.IncomingMessage, response: http.ServerResponse): string | undefined {
        const cookies = new Cookies(request, response, {
            secure: true,
            keys: [this.API_SECRET_KEY],
        })
        return cookies.get(ShopifyOAuth.SESSION_COOKIE_NAME, { signed: true })
    }

    getCurrentSessionId(request: http.IncomingMessage, response: http.ServerResponse): string | undefined {
        let currentSessionId: string | undefined

        // Non-embedded apps will always load sessions using cookies. However, we fall back to the cookie session for
        // embedded apps to allow apps to load their skeleton page after OAuth, so they can set up App Bridge and get a new
        // JWT.
        if (!currentSessionId) {
            // We still want to get the offline session id from the cookie to make sure it's validated
            currentSessionId = this.getCookieSessionId(request, response)
        }

        return currentSessionId
    }

    loadCurrentSession(req: http.IncomingMessage, res: http.ServerResponse) {
        const sessionId = this.getCurrentSessionId(req, res)
        if (!sessionId) {
            return Promise.resolve(undefined)
        }

        return this.sessionStorage.loadSession(sessionId)
    }
}
