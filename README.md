# Next.js + NextAuth.js (Custom OpenIddict Provider)

A minimal Next.js frontend using **NextAuth.js** with a **custom OAuth 2.0 / OIDC provider**, integrated with a self-hosted OpenIddict Identity Server.

This setup demonstrates how to:

- Authenticate using OpenID Connect (Authorization Code Flow + PKCE)
- Manage sessions with access and ID tokens
- Call a protected API using the access token

---

## 🔗 Related Projects

| Project         | Repo                                                                 |
|----------------|----------------------------------------------------------------------|
| Identity Server | (https://github.com/fady17/identityProvider-.git)|
| Protected API   | ( https://github.com/fady17/ResourceApi.git ) |

---

## 🧱 Stack

- **Next.js** (App Router)
- **NextAuth.js** (Custom Provider)
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=some-random-secret

OIDC_ISSUER=https://localhost:5005
OIDC_CLIENT_ID=nextjs-client
OIDC_CLIENT_SECRET=not_used_with_pkce
---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
bun install

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

