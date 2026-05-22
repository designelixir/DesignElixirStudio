import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const host = req.headers.get("host") ?? ""
  const isAdminSubdomain = host.startsWith("admin.")
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin")

  // Protect /admin routes before any rewrite
  if ((isAdminSubdomain || isAdminPath) && !req.auth) {
    return NextResponse.redirect(new URL("/api/auth/signin", req.url))
  }

  // Rewrite admin subdomain to /admin path
  if (isAdminSubdomain && !isAdminPath) {
    const url = req.nextUrl.clone()
    url.pathname = `/admin${url.pathname}`
    return NextResponse.rewrite(url)
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}