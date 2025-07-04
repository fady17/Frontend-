# Orjnz.Client.NextJs - OIDC Client Application

This repository contains a Next.js application that serves as a client for the Orjnz OpenID Connect (OIDC) ecosystem. It demonstrates how a modern, React-based Single-Page Application (SPA) can implement a secure authentication flow against a custom Identity Provider, manage user sessions, and interact with protected backend Resource APIs.

## 1. Application Overview

This application provides a user-facing interface that showcases the entire end-to-end authentication journey. Its primary features and responsibilities include:

-   **User Authentication Flow:** Implements a complete OIDC Authorization Code Flow with PKCE for secure user sign-in and sign-out.
-   **Session Management:** Leverages the `next-auth` library to manage user sessions, including the secure handling and refreshing of access tokens.
-   **Protected API Integration:** Demonstrates how to make authenticated requests to protected backend Resource APIs by attaching a JWT Bearer token.
-   **Dynamic UI:** Conditionally renders content based on the user's authentication state (e.g., showing a "Sign In" button vs. a user profile and a "Sign Out" button).
-   **Tenant-Aware Display:** Shows how custom claims (like `provider_id`) issued by the Identity Provider can be accessed and displayed on the client-side.

## 2. Authentication Flow with `next-auth`

This application uses the powerful `next-auth` library to abstract away much of the complexity of the OIDC protocol. The flow works as follows:

1.  **Sign-In:** A user clicks the "Sign In" button, which calls the `signIn('oidc')` function from `next-auth/react`.
2.  **Redirect to IdP:** `next-auth`'s backend route (`/api/auth/[...nextauth]`) constructs the OIDC authorization request (with PKCE parameters) and redirects the user's browser to our central Identity Provider.
3.  **Authentication at IdP:** The user authenticates at the Identity Provider (e.g., with email/password) and grants consent.
4.  **Redirect to Client:** The IdP redirects the user back to the client's pre-configured callback URL (`/api/auth/callback/oidc`).
5.  **Token Exchange:** The `next-auth` backend handler receives the `authorization_code` from the IdP. It then makes a secure, direct backend request to the IdP's token endpoint to exchange the code for an `id_token`, `access_token`, and `refresh_token`.
6.  **Session Creation:** `next-auth` creates its own secure, server-side session JWT (signed with `NEXTAUTH_SECRET`) which contains the OIDC tokens and user profile information. This JWT is stored in a secure, HttpOnly cookie.
7.  **Session Hydration:** The session is made available to the React application through the `useSession` hook, providing the `accessToken` needed for API calls.
8.  **Token Refresh:** The `jwt` callback in the `next-auth` configuration automatically uses the `refresh_token` to get a new `access_token` when the old one expires. This process is seamless to the user.

## 3. State Management

Authentication state is managed globally using `next-auth`'s built-in `SessionProvider`.

-   **`SessionProvider`:** This React Context provider is wrapped around the entire application in `layout.tsx`. It makes the session object available to all components.
-   **`useSession` Hook:** Components access the authentication state (e.g., `session`, `status`) via this hook.
-   **Session Object:** The session object available on the client contains the user's profile (`session.user`), the `accessToken` for API calls, and an `error` flag to detect token refresh failures.

## 4. Environment Configuration

To run this application, you must create a `.env.local` file in the root of the project with the following variables. **This file should not be committed to source control.**

```bash
# .env.local

# The Client ID for this application, as registered in the Identity Provider.
OIDC_CLIENT_ID="nextjs-client-app"

# The Client Secret. For a public client using PKCE, this should be left blank.
OIDC_CLIENT_SECRET=

# The public-facing base URL of your Identity Provider.
# This must match the 'issuer' configured in the Resource APIs.
OIDC_ISSUER="https://localhost:7066"

# A long, random string used by NextAuth.js to sign its session cookies.
# Generate one with: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-nextauth-string-here"

# The canonical URL of this Next.js application.
# Important for production deployments to ensure OIDC callbacks work correctly.
NEXTAUTH_URL="http://localhost:3000"
```

## 5. Running the Application

1.  **Prerequisites:**
    -   Node.js and npm/yarn/pnpm
    -   The `Orjnz.IdentityProvider.Web` and a `ResourceApi` project must be running.

2.  **Installation:**
    -   Clone the repository and install the dependencies:
        ```bash
        npm install
        ```

3.  **Configuration:**
    -   Create a `.env.local` file in the project root and populate it with the values described in the section above. Ensure the `OIDC_ISSUER` and `NEXTAUTH_URL` are correct for your local setup.

4.  **Execution:**
    -   Run the development server:
        ```bash
        npm run dev
        ```

The application will be available at `http://localhost:3000` (or the URL specified in `NEXTAUTH_URL`).

## 🔗 Related Projects

| Project         | Repo                                                                 |
|----------------|----------------------------------------------------------------------|
| Identity Server | (https://github.com/fady17/identityProvider-.git)|
| Protected API   | ( https://github.com/fady17/ResourceApi.git ) |

---

