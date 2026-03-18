import { tool } from "ai"
import { z } from "zod"

const SEARCH_TIMEOUT_MS = 8000

export async function fetchSearchResults(query: string): Promise<string> {
  const url = process.env.SEARXNG_URL
  if (!url) {
    console.error("[web-search] SEARXNG_URL not set")
    return "[]"
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const res = await fetch(
      `${url}/search?q=${encodeURIComponent(query)}&format=json`,
      { signal: controller.signal }
    )

    if (!res.ok) {
      console.error(`[web-search] SearXNG returned ${res.status}`)
      return "[]"
    }

    const data = await res.json()

    if (!data.results || !Array.isArray(data.results)) {
      console.error("[web-search] Malformed SearXNG response")
      return "[]"
    }

    const results = data.results.slice(0, 5).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }))
    return JSON.stringify(results)
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("[web-search] SearXNG request timed out")
    } else {
      console.error("[web-search] SearXNG fetch failed:", err.message)
    }
    return "[]"
  } finally {
    clearTimeout(timeout)
  }
}

export const webSearch = tool({
  description: "Search the web for current information. Call this when the user's question requires up-to-date facts, recent events, real-time data, or anything that may have changed after your training cutoff.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    console.log(`[web-search] Tool called with query: "${query}"`)
    return fetchSearchResults(query)
  },
})

/** Direct search bypass — used when the model fails to call the tool */
export async function directSearch(query: string): Promise<string> {
  console.log(`[web-search] Direct fallback search for: "${query}"`)
  return fetchSearchResults(query)
}
