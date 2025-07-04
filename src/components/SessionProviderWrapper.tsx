"use client" // This directive marks the component as a Client Component.

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

interface SessionProviderWrapperProps {
  children: ReactNode
  session?: any // The initial session object, passed from a Server Component.
}

/**
 * A simple wrapper component for the `SessionProvider` from `next-auth/react`.
 * This is necessary because `SessionProvider` uses React Context, which requires it to be
 * a Client Component. The wrapper pattern allows our server-side `RootLayout` to
 * remain a Server Component while still providing the client-side context provider.
 */
export default function SessionProviderWrapper({
  children,
  session,
}: SessionProviderWrapperProps) {
  return (
    // The SessionProvider makes the session data available to all descendant components
    // through the `useSession` hook.
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  )
}