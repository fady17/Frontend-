import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

/**
 * This file uses TypeScript's module augmentation to extend the default types
 * provided by NextAuth.js. This is crucial for ensuring type safety when we add
 * custom properties (like `accessToken`, `providerId`, `error`) to the session
 * and JWT objects in our `[...nextauth]` route handler.
 */

// Extend the `session` object available on the client-side (e.g., via `useSession`).
declare module "next-auth" {
  interface Session {
    /** The access token from the OIDC provider. */
    accessToken?: string
    /** An error string, typically set when a token refresh fails. */
    error?: string
    /** The user object, extended with our custom properties. */
    user: {
      /** Our custom claim from the IdP, identifying the user's tenant. */
      providerId?: string
    } & DefaultSession["user"]
  }

  // Extend the `user` object, which is returned by the `profile` callback.
  interface User extends DefaultUser {
    /** Our custom claim from the IdP, identifying the user's tenant. */
    providerId?: string
  }
}

// Extend the `token` object, which is the server-side JWT managed by NextAuth.
// This is the object that the `jwt` callback works with.
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    /** The access token from the OIDC provider. */
    accessToken?: string
    /** The refresh token from the OIDC provider. */
    refreshToken?: string
    /** The ID token from the OIDC provider. */
    idToken?: string
    /** The expiry timestamp (in milliseconds) of the access token. */
    accessTokenExpires?: number
    /** The user profile object, as returned by the `profile` callback. */
    user?: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      providerId?: string
    }
    /** An error string, typically set when a token refresh fails. */
    error?: string
  }
}