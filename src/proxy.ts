import { fetchAuthSession } from "aws-amplify/auth/server"
import { NextRequest, NextResponse } from "next/server"
import { runWithAmplifyServerContext } from "@/lib/amplify-server"

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec)
        return session.tokens !== undefined
      } catch {
        return false
      }
    },
  })

  if (authenticated) {
    return response
  }

  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: [
    "/((?!login|signup|landing|privacy|terms|_next/static|_next/image|favicon.ico|logo.png|screenshot.png|screenshot-b.png).+)",
  ],
}
