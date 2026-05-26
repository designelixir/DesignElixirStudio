import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const host = req.headers.get("host") ?? ""
  const isAdminSubdomain = host.startsWith("admin.")
  const isLoginPath = req.nextUrl.pathname === "/"

  // Protect all routes on the admin subdomain
  if (isAdminSubdomain && !req.auth && !isLoginPath) {
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)).*)"],
}