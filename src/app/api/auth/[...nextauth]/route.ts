// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { NextAuthOptions } from "next-auth"
import { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth"

// For Vercel deployment, you'll need a secret for JWT signing
// For local development, it's good practice too.
// Generate one with: openssl rand -base64 32
const nextAuthSecret = process.env.NEXTAUTH_SECRET || "your-default-secret-for-dev-only";

if (process.env.NODE_ENV === 'development' && nextAuthSecret === "your-default-secret-for-dev-only") {
  console.warn(
    "\x1b[33mwarn\x1b[0m",
    "Using default NEXTAUTH_SECRET in development. Please set a proper secret in .env.local for better security."
  );
}

// Custom OIDC Provider
interface OidcProfile {
  sub: string
  name?: string
  email?: string
  picture?: string
  provider_id?: string
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
console.log("NODE_TLS_REJECT_UNAUTHORIZED:", process.env.NODE_TLS_REJECT_UNAUTHORIZED);
function createOidcProvider(config: CustomOidcConfig): OAuthConfig<OidcProfile> {
 const providerConfig: OAuthConfig<OidcProfile> = {
    id: config.id || "oidc",
    name: config.name || "OIDC",
    type: "oauth",
    version: "2.0",
    clientId: config.clientId,
    issuer: config.issuer,
    // wellKnown:`https://localhost:7066/.well-known/openid-configuration`,
    wellKnown: config.wellKnown || `${config.issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: "openid profile email",
        response_type: "code",
        code_challenge_method: "S256",
        ...(typeof config.authorization === 'object' && config.authorization.params ? config.authorization.params : {}),
      },
    },
    token: `${config.issuer}/connect/token`,
    userinfo: `${config.issuer}/connect/userinfo`,
    checks: ["pkce", "state"],
    idToken: true,
    profile: config.profile || ((profile) => ({
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
    })),
  }


  // Ensure clientSecret is not passed as an empty string if it should be omitted
  if (config.clientSecret && config.clientSecret.trim() !== "") {
    providerConfig.clientSecret = config.clientSecret;
  }
  // Otherwise, clientSecret remains undefined on providerConfig, which is correct for PKCE.

  // Logging the final provider config before returning it can be helpful:
  console.log("Final OIDC Provider Config for NextAuth:", JSON.stringify(providerConfig, null, 2));

  return providerConfig;
}

export const authOptions: NextAuthOptions = {
  providers: [
    createOidcProvider({
      id: "oidc", // A unique ID for this provider configuration
      name: "My Custom IDP", // Display name for the login button
      clientId: process.env.OIDC_CLIENT_ID!,
      // For public clients with PKCE, clientSecret should not be sent or should be an empty string.
      // NextAuth's OIDC provider handles PKCE automatically if clientSecret is not provided for a "code" response_type.
      clientSecret: process.env.OIDC_CLIENT_SECRET, // Should be empty or undefined for PKCE
      issuer: process.env.OIDC_ISSUER!,
      authorization: {
        params: {
          scope: "openid profile email offline_access api:healthcare:read", // Your desired scopes
          // prompt: "consent", // Optionally force consent screen every time for testing
        },
      },
      // wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`, // Auto-discovered if issuer is set

      // This profile callback maps claims from the IDP's UserInfo endpoint or ID Token
      // to the NextAuth `user` object in the session.
      async profile(profile, tokens) {
        // 'profile' here is the JSON response from UserInfo endpoint or decoded ID Token claims
        // 'tokens' contains access_token, id_token, refresh_token
        console.log("OIDC Profile from IDP:", profile);
        console.log("OIDC Tokens received:", tokens);
        return {
          id: profile.sub, // 'sub' claim is the standard user identifier
          name: profile.name,
          email: profile.email,
          image: profile.picture, // If picture claim is available
          providerId: profile.provider_id, // Your custom claim
          // Add any other claims from 'profile' you want in the NextAuth user object
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // console.log("JWT Callback - token:", token);
      // console.log("JWT Callback - user (from profile):", user);
      // console.log("JWT Callback - account (from OIDC provider response):", account);
      // console.log("JWT Callback - profile (from OIDC provider userinfo/id_token):", profile);

      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined; // Convert to ms
        token.user = user; // Embed user object (from profile callback) into JWT token
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        // console.log("Access token still valid");
        return token;
      }

      // Access token has expired, try to update it
      // console.log("Access token expired, attempting refresh...");
      if (!token.refreshToken) {
        console.error("No refresh token available to refresh access token.");
        // You might want to propagate an error to the session here
        return { ...token, error: "RefreshAccessTokenError" };
      }

      try {
        const response = await fetch(`${process.env.OIDC_ISSUER}connect/token`, { // Your IDP's token endpoint
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.OIDC_CLIENT_ID!,
            // client_secret: process.env.OIDC_CLIENT_SECRET, // NOT for public clients
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

        // console.log("Tokens refreshed successfully:", refreshedTokens);
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + (refreshedTokens.expires_in * 1000),
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token if new one not provided
          idToken: refreshedTokens.id_token ?? token.idToken,
        };
      } catch (error) {
        console.error("Error refreshing access token catch block:", error);
        // The error property will be passed to the session callback
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      // console.log("Session Callback - session:", session);
      // console.log("Session Callback - token (from JWT callback):", token);

      // Send properties to the client, like an access_token and user id from JWT.
      if (token.user) { // If user object is embedded in JWT
        session.user = token.user; // Use user details from JWT (populated by profile callback)
      }
      session.accessToken = token.accessToken;
      session.error = token.error; // Propagate refresh error to client
      // session.refreshToken = token.refreshToken; // Don't usually expose refresh token to client-side
      return session;
    },
  },
   debug: process.env.NODE_ENV === 'development', // Enable debug messages in dev
  secret: nextAuthSecret, // For signing JWTs used by NextAuth itself
  // pages: { // Optional: Custom pages
  //   signIn: '/auth/signin',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };