import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import { getAuthSession } from '@/lib/auth'
import "./globals.css";


const inter = Inter({ subsets: ['latin'] })


export const metadata: Metadata = {
  title: "orjnz client",
  description: "GIS System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession()

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
