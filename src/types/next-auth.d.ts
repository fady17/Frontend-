// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      providerId?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    providerId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string
    refreshToken?: string
    idToken?: string
    accessTokenExpires?: number
    user?: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      providerId?: string
    }
    error?: string
  }
}