import { getDbUser } from "@/lib/session"
import { fetchSearchResults } from "@/lib/tools/web-search"

export async function POST(req: Request) {
  let body: { query: string }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { query } = body

  if (!query) {
    return Response.json({ error: "Missing query" }, { status: 400 })
  }

  // Auth
  try {
    await getDbUser()
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  const results = await fetchSearchResults(query)

  return Response.json({ results })
}
