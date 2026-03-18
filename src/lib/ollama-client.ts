const OLLAMA_BASE = "http://localhost:11434"

type OllamaMessage = { role: "system" | "user" | "assistant"; content: string }

export type OllamaResponse = {
  response_type: "full" | "brief" | "emoji" | "silence"
  content: string
  addressed_to?: string
  addressed_persona_id?: string
}

export function isLocalModel(modelId: string): boolean {
  return modelId.startsWith("local/")
}

function stripPrefix(modelId: string): string {
  return modelId.startsWith("local/") ? modelId.slice(6) : modelId
}

function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const segments = [...new Intl.Segmenter().segment(trimmed)]
  return segments.length === 1 && /\p{Extended_Pictographic}/u.test(segments[0].segment)
}

/**
 * Call Ollama's chat endpoint directly from the browser.
 * Uses format: "json" and a JSON schema instruction in the system prompt.
 */
export async function callOllamaChat(
  modelId: string,
  systemPrompt: string,
  messages: OllamaMessage[]
): Promise<OllamaResponse> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: stripPrefix(modelId),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
      format: "json",
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`)
  }

  const data = await res.json()
  const rawText: string = data.message?.content || ""

  // Try JSON parse
  try {
    const parsed = JSON.parse(rawText)
    const validTypes = ["full", "brief", "emoji", "silence"]
    if (validTypes.includes(parsed.response_type) && typeof parsed.content === "string") {
      let responseType = parsed.response_type as OllamaResponse["response_type"]
      // Promote fake emoji to brief
      if (responseType === "emoji" && !isEmojiOnly(parsed.content)) {
        responseType = "brief"
      }
      return {
        response_type: responseType,
        content: parsed.content,
        addressed_to: parsed.addressed_to,
        addressed_persona_id: parsed.addressed_persona_id,
      }
    }
  } catch {
    // fall through
  }

  // Fallback: treat raw text as full response
  return { response_type: "full", content: rawText }
}

/**
 * Call Ollama for plain text generation (no JSON format).
 * Used for compaction summaries.
 */
export async function callOllamaRaw(
  modelId: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: stripPrefix(modelId),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`)
  }

  const data = await res.json()
  return data.message?.content || ""
}

/**
 * Get the context length for a local Ollama model via /api/show.
 */
export async function getOllamaContextLength(modelId: string): Promise<number> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: stripPrefix(modelId) }),
    })
    if (!res.ok) return 4096
    const data = await res.json()
    const ctx = data.model_info?.["general.context_length"] ?? data.model_info?.context_length
    return typeof ctx === "number" && ctx > 0 ? ctx : 4096
  } catch {
    return 4096
  }
}

const SEARCH_ROUTING_PROMPT = `You are a search routing assistant. Your ONLY job is to decide whether the user's message needs a web search.

If the message needs current/real-time information, recent events, live data, or facts that may have changed: respond with ONLY the search query (a clear, specific query string). Nothing else.

If the message is casual conversation, opinion-based, or general knowledge: respond with exactly "NO_SEARCH".

Examples:
- User asks "what happened in tech news today" → "latest technology news today"
- User asks "what do you think about cats" → "NO_SEARCH"
- User asks "who won the Super Bowl" → "Super Bowl winner latest"
- User asks "explain recursion" → "NO_SEARCH"`

/**
 * Ask local Ollama whether a web search is needed.
 * Returns a refined search query, or null if no search needed.
 */
export async function routeSearch(
  modelId: string,
  userMessage: string
): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: stripPrefix(modelId),
        messages: [
          { role: "system", content: SEARCH_ROUTING_PROMPT },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const reply = (data.message?.content || "").trim()

    if (!reply || reply === "NO_SEARCH") return null
    return reply
  } catch {
    return null
  }
}
