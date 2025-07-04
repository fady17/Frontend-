import NextAuth from "next-auth"
import { NextAuthOptions } from "next-auth"
import { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth"

/**
 * This file defines the core authentication logic for the Next.js application using the NextAuth.js library.
 * It acts as a backend-for-frontend (BFF) API route that handles all OIDC interactions, including:
 * - Initiating the login flow.
 * - Handling the callback from the Identity Provider.
 * - Exchanging the authorization code for tokens.
 * - Managing token refresh cycles.
 * - Structuring the user session.
 */

// A secret used by NextAuth.js to sign its own session JWTs. This is NOT the OIDC client secret.
// It's crucial for securing the session cookie between the user's browser and this Next.js backend route.
const nextAuthSecret = process.env.NEXTAUTH_SECRET || "your-default-secret-for-dev-only";

// A startup warning for developers to ensure a proper secret is set in production.
if (process.env.NODE_ENV === 'development' && nextAuthSecret === "your-default-secret-for-dev-only") {
  console.warn(
    "\x1b[33mwarn\x1b[0m",
    "Using default NEXTAUTH_SECRET in development. Please set a proper secret in .env.local for better security."
  );
}

// --- Custom Type Definitions for our OIDC Provider ---
interface OidcProfile {
  sub: string
  name?: string
  email?: string
  picture?: string
  provider_id?: string // Our custom claim from the IdP
  [key: string]: any
}

interface CustomOidcConfig {
  id?: string
  name?: string
  clientId: string
  clientSecret?: string
  issuer: string
  wellKnown?: string
  authorization?: {
    params?: Record<string, any>
  }
  profile?: (profile: OidcProfile, tokens: any) => any
}

/**
 * A helper function to create a generic OIDC provider configuration for NextAuth.
 * This encapsulates the standard OIDC provider setup.
 * @param config - The configuration specific to our Identity Provider.
 * @returns A NextAuth compatible OAuthConfig object.
 */
function createOidcProvider(config: CustomOidcConfig): OAuthConfig<OidcProfile> {
  const providerConfig: OAuthConfig<OidcProfile> = {
    id: config.id || "oidc",
    name: config.name || "OIDC",
    type: "oauth",
    version: "2.0",
    clientId: config.clientId,
    issuer: config.issuer,
    // The discovery document URL. NextAuth uses this to automatically find token/userinfo endpoints and signing keys.
    wellKnown: config.wellKnown || `${config.issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: "openid profile email", // Default scopes
        response_type: "code",
        code_challenge_method: "S256", // Enforces PKCE
        ...(typeof config.authorization === 'object' && config.authorization.params ? config.authorization.params : {}),
      },
    },
    token: `${config.issuer}/connect/token`,
    userinfo: `${config.issuer}/connect/userinfo`,
    checks: ["pkce", "state"], // Enforce security checks.
    idToken: true,
    // The default profile mapper.
    profile: config.profile || ((profile) => ({
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
    })),
  };

  // Only include the client secret if it is explicitly provided.
  // For public clients using PKCE (like this one), the secret should be omitted.
  if (config.clientSecret && config.clientSecret.trim() !== "") {
    providerConfig.clientSecret = config.clientSecret;
  }
  
  return providerConfig;
}

/**
 * The main configuration object for NextAuth.js. This defines providers, callbacks, and other settings.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // Configure our custom IdP as an OIDC provider.
    createOidcProvider({
      id: "oidc",
      name: "My Custom IDP",
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET, // This should be empty/undefined for a public client.
      issuer: process.env.OIDC_ISSUER!,
      authorization: {
        params: {
          // Requesting scopes. 'offline_access' is critical for getting a refresh token.
          // 'api:healthcare:read' is a custom API scope.
          scope: "openid profile email offline_access api:healthcare:read",
        },
      },
      // The `profile` callback maps claims from the IdP to the NextAuth `user` object.
      // This is where we ensure our custom claims are correctly processed.
      async profile(profile, tokens) {
        console.log("OIDC Profile from IDP:", profile);
        console.log("OIDC Tokens received:", tokens);
        return {
          id: profile.sub, // 'sub' is the standard unique identifier for the user.
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          providerId: profile.provider_id, // Mapping our custom `provider_id` claim.
        };
      },
    }),
  ],
  callbacks: {
    /**
     * The `jwt` callback is executed whenever a NextAuth session JWT is created or updated.
     * It's the central place for managing the OIDC tokens (access, refresh) and embedding them
     * into NextAuth's own session token.
     */
    async jwt({ token, user, account, profile }) {
      // This block runs only on the initial sign-in.
      if (account && user) {
        // Persist the OIDC tokens from the IdP (`account`) into our secure, server-side NextAuth JWT (`token`).
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined; // Convert expiry to milliseconds.
        token.user = user; // Embed the user profile into the JWT.
        return token;
      }

      // If the access token has not expired, return the existing token without modification.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // If the access token has expired, we must try to refresh it using the refresh token.
      if (!token.refreshToken) {
        console.error("No refresh token available to refresh access token.");
        // Set an error flag that the session callback can pass to the client.
        return { ...token, error: "RefreshAccessTokenError" };
      }

      try {
        // Make a request to our IdP's token endpoint to get a new set of tokens.
        const response = await fetch(`${process.env.OIDC_ISSUER}connect/token`, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.OIDC_CLIENT_ID!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
          method: "POST",
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          console.error("Error refreshing access token:", refreshedTokens);
          throw refreshedTokens;
        }

        // Update our session JWT with the new tokens from the IdP.
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + (refreshedTokens.expires_in * 1000),
          // IdPs may issue a new refresh token or expect the old one to be reused.
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
          idToken: refreshedTokens.id_token ?? token.idToken,
        };
      } catch (error) {
        console.error("Error refreshing access token catch block:", error);
        // Set the error flag on the token.
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    /**
     * The `session` callback is executed whenever a client-side component requests the session
     * (e.g., via `useSession()`). It takes the data from the secure NextAuth JWT (`token`) and
     * prepares a safe subset of that data to be sent to the browser.
     */
    async session({ session, token }) {
      // Expose the user object from our JWT to the client-side session.
      if (token.user) {
        session.user = token.user;
      }
      // Expose the access token to the client so it can be used for API calls.
      session.accessToken = token.accessToken;
      // Expose the error state so the client can react to token refresh failures.
      session.error = token.error;
      
      // We explicitly DO NOT expose the refresh token to the browser for security reasons.
      return session;
    },
  },
   debug: process.env.NODE_ENV === 'development',
  secret: nextAuthSecret,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };