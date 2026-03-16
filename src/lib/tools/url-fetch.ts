import { fetchUrl, sanitize } from "mcp-safe-fetch"

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi
const MAX_CONTENT_LENGTH = 4000

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX)
  if (!matches) return []
  return [...new Set(matches)]
}

async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const fetched = await fetchUrl(url)
    const result = sanitize(fetched.html)
    let content = result.content
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH) + "\n[...truncated]"
    }
    console.log(`[url-fetch] fetched ${url}: ${result.content.length} chars -> ${content.length} chars`)
    return content || null
  } catch (err) {
    console.error(`[url-fetch] Failed to fetch ${url}:`, err)
    return null
  }
}

export async function fetchAllUrls(
  text: string
): Promise<{ url: string; content: string }[]> {
  const urls = extractUrls(text)
  if (urls.length === 0) return []

  console.log(`[url-fetch] detected ${urls.length} URL(s): ${urls.join(", ")}`)

  const results: { url: string; content: string }[] = []
  const fetches = await Promise.allSettled(
    urls.map(async (url) => {
      const content = await fetchUrlContent(url)
      return content ? { url, content } : null
    })
  )

  for (const result of fetches) {
    if (result.status === "fulfilled" && result.value) {
      results.push(result.value)
    }
  }

  return results
}
