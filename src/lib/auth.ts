// lib/auth.ts
import { getServerSession } from "next-auth/next"
import { authOptions } from "../app/api/auth/[...nextauth]/route";

export function getAuthSession() {
  return getServerSession(authOptions)
}

// Usage in Server Components:
// import { getAuthSession } from "@/lib/auth"
// 
// export default async function Page() {
//   const session = await getAuthSession()
//   
//   if (!session) {
//     return <div>Please sign in</div>
//   }
//   
//   return <div>Hello {session.user?.name}</div>
// }