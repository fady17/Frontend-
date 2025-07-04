import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import { getAuthSession } from '@/lib/auth'
import "./globals.css";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "orjnz client",
  description: "GIS System",
};

/**
 * This is the Root Layout for the Next.js App Router. It's a Server Component.
 * Its key role in authentication is to fetch the session on the server during the
 * initial render and pass it down to the client-side `SessionProvider`.
 * This is a performance optimization that avoids a client-side fetch for the session on page load.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `getAuthSession` is a server-side helper to get the current session.
  const session = await getAuthSession()

  return (
    <html lang="en">
      <body className={inter.className}>
        {/*
          The SessionProviderWrapper receives the initial session state from the server.
          It then manages the session state on the client-side, making it available
          to all child components via the `useSession` hook.
        */}
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}