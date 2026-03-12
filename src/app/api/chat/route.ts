import { generateText, Output, stepCountIs } from "ai"
import { personaResponseSchema } from "@/lib/schema"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"
import { getModel } from "@/lib/providers"
import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { webSearch, directSearch } from "@/lib/tools/web-search"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, persona, allPersonas, model, conversationId, userMessage, webSearchEnabled } =
      await req.json()

    console.log(`[chat] persona=${persona?.name} model=${model} convId=${conversationId} hasUserMsg=${!!userMessage} webSearch=${webSearchEnabled}`)

    // Save user message if this is the first persona call of a turn
    if (conversationId && userMessage) {
      await prisma.message.create({
        data: {
          conversationId,
          content: userMessage,
          personaId: null,
          responseType: null,
        },
      })
    }

    let openRouterKey: string | undefined
    if (model?.startsWith("openrouter/")) {
      const user = await getDbUser()
      const apiKey = await prisma.apiKey.findUnique({
        where: { userId_provider: { userId: user.id, provider: "openrouter" } },
      })
      if (!apiKey) {
        return Response.json(
          { error: "No OpenRouter API key configured" },
          { status: 400 }
        )
      }
      openRouterKey = decrypt(apiKey.encryptedKey)
    }

    console.log(`[chat] calling generateText for ${persona?.name}...`)

    const resolvedModel = getModel(model || "local/qwen3:32b", openRouterKey)
    let searchResults: string[] = []

    // Step 1: If web search is enabled, try tool-calling pass first (no structured output)
    if (webSearchEnabled) {
      try {
        const searchResult = await generateText({
          model: resolvedModel,
          system: `You are a search routing assistant. Your ONLY job is to decide whether to search the web.

RULES:
- If the user's message needs current/real-time information, recent events, live data, or facts that may have changed: call the webSearch tool with a clear, specific query.
- If the message is casual conversation, opinion-based, or general knowledge you're confident about: just respond with a short acknowledgment like "No search needed."
- When in doubt, search. It's better to search unnecessarily than to miss relevant information.
- Do NOT answer the user's question. Only decide whether to search.`,
          messages,
          tools: { webSearch },
          stopWhen: stepCountIs(3),
          maxOutputTokens: 300,
        })

        searchResults = searchResult.steps
          .flatMap((s) => s.toolResults)
          .filter((t) => t.toolName === "webSearch")
          .map((t) => String(t.output))

        console.log(`[chat] ${persona?.name} search step: ${searchResults.length} results`)
      } catch (err) {
        console.error(`[chat] ${persona?.name} search step failed:`, err)
      }

      // Fallback: if the model didn't call the tool (bad at tool calling),
      // do a direct SearXNG fetch using the user's last message as the query
      if (searchResults.length === 0) {
        const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")
        if (lastUserMessage) {
          const query = typeof lastUserMessage.content === "string"
            ? lastUserMessage.content
            : ""
          if (query) {
            console.log(`[chat] ${persona?.name} tool-call fallback: direct search`)
            const directResult = await directSearch(query)
            if (directResult !== "[]") {
              searchResults = [directResult]
            }
          }
        }
      }
    }

    // Step 2: Generate the structured persona response (with search results in context if available)
    const messagesWithSearch = searchResults.length > 0
      ? [...messages, { role: "user" as const, content: `[WEB SEARCH RESULTS — use these facts if relevant, cite sources:\n${searchResults.join("\n")}]` }]
      : messages

    const result = await generateText({
      model: resolvedModel,
      system: buildPersonaSystemPrompt(persona, allPersonas),
      messages: messagesWithSearch,
      output: Output.object({ schema: personaResponseSchema }),
      maxOutputTokens: 4096,
    })

    let parsed: { response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: string; addressed_persona_id?: string }
    try {
      parsed = result.output ?? { response_type: "silence", content: "" }
    } catch {
      console.warn(`[chat] ${persona?.name} produced no valid output, treating as silence`)
      parsed = { response_type: "silence", content: "" }
    }

    console.log(`[chat] ${persona?.name} responded: type=${parsed?.response_type} content=${parsed?.content?.substring(0, 50)} searches=${searchResults.length}`)

    // Save persona response to DB (skip silence)
    if (conversationId && parsed && parsed.response_type !== "silence") {
      await prisma.message.create({
        data: {
          conversationId,
          personaId: persona.id,
          content: parsed.content,
          responseType: parsed.response_type,
          addressedTo: parsed.addressed_to || null,
          addressedPersonaId: parsed.addressed_persona_id || null,
        },
      })
    }

    return Response.json({
      ...parsed,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
    })
  } catch (err) {
    console.error("[chat] FATAL:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
