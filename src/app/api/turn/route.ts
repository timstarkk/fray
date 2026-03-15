import { generateText, Output, stepCountIs } from "ai"
import { personaResponseSchema } from "@/lib/schema"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"
import { getModel } from "@/lib/providers"
import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { webSearch, directSearch } from "@/lib/tools/web-search"
import { shuffle, buildTurnSummary, buildApiMessages } from "@/lib/turn-context"
import { getContextLength } from "@/lib/model-context"
import { compactIfNeeded } from "@/lib/compaction"
import { type Persona } from "@/lib/personas"

export const maxDuration = 120

function generateTitle(text: string): string {
  if (text.length <= 50) return text
  const truncated = text.substring(0, 47)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + "..."
}

export async function POST(req: Request) {
  // --- Pre-stream validation ---
  let body: {
    userMessage: string
    conversationId?: string
    personaIds: string[]
    model: string
    webSearchEnabled?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { userMessage, conversationId, personaIds, model, webSearchEnabled } = body

  if (!userMessage || !personaIds?.length) {
    return Response.json({ error: "Missing userMessage or personaIds" }, { status: 400 })
  }

  // Auth
  let user
  try {
    user = await getDbUser()
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Load personas from DB
  const personas: Persona[] = (
    await prisma.persona.findMany({
      where: { id: { in: personaIds } },
    })
  ).map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    role: p.role,
    systemPrompt: p.systemPrompt,
    canSearch: p.canSearch,
    isDefault: p.isDefault,
    active: true,
  }))

  if (personas.length === 0) {
    return Response.json({ error: "No valid personas found" }, { status: 400 })
  }

  // Resolve model + API key before streaming
  let openRouterKey: string | undefined
  if (model?.startsWith("openrouter/")) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
    })
    if (!apiKey) {
      return Response.json({ error: "No OpenRouter API key configured" }, { status: 400 })
    }
    openRouterKey = decrypt(apiKey.encryptedKey)
  }

  const resolvedModel = getModel(model || "local/qwen3:32b", openRouterKey)

  // --- Start SSE stream ---
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function emit(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Create conversation if needed
        let convId = conversationId
        if (!convId) {
          const conversation = await prisma.conversation.create({
            data: {
              userId: user.id,
              title: generateTitle(userMessage),
              model: model || "local/qwen3:32b",
              personas: {
                create: personaIds.map((personaId) => ({ personaId })),
              },
            },
          })
          convId = conversation.id
        }

        // Shuffle personas
        const shuffledPersonas = shuffle(personas)

        // Emit turn-start
        emit("turn-start", {
          conversationId: convId,
          personaOrder: shuffledPersonas.map((p) => p.id),
        })

        // Persist user message
        await prisma.message.create({
          data: {
            conversationId: convId,
            content: userMessage,
            personaId: null,
            responseType: null,
          },
        })

        // Load full message history from DB (includes the user message we just wrote)
        const allDbMessages = await prisma.message.findMany({
          where: { conversationId: convId },
          orderBy: { createdAt: "asc" },
        })

        // Context compaction — summarize older messages if approaching context limit
        const contextLength = await getContextLength(model || "local/qwen3:32b")
        const { messages: dbMessages, compacted } = await compactIfNeeded(
          allDbMessages, contextLength, resolvedModel, convId, personas
        )
        if (compacted) {
          console.log(`[turn] context compacted for conversation ${convId}`)
        }

        // Turn loop
        const turnResponses: { personaId: string; response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: "user" | "persona"; addressed_persona_id?: string }[] = []
        let sharedSearchResults: string | null = null

        for (let i = 0; i < shuffledPersonas.length; i++) {
          const persona = shuffledPersonas[i]

          // Web search (first persona only)
          if (i === 0 && webSearchEnabled) {
            emit("search-start", {})

            let searchResults: string[] = []

            // Build messages for search pass
            const searchMessages = buildApiMessages(
              dbMessages, [], persona.id, personas, null, null
            )

            try {
              const searchResult = await generateText({
                model: resolvedModel,
                system: `You are a search routing assistant. Your ONLY job is to decide whether to search the web.

RULES:
- If the user's message needs current/real-time information, recent events, live data, or facts that may have changed: call the webSearch tool with a clear, specific query.
- If the message is casual conversation, opinion-based, or general knowledge you're confident about: just respond with a short acknowledgment like "No search needed."
- When in doubt, search. It's better to search unnecessarily than to miss relevant information.
- Do NOT answer the user's question. Only decide whether to search.`,
                messages: searchMessages,
                tools: { webSearch },
                stopWhen: stepCountIs(3),
                maxOutputTokens: 300,
              })

              searchResults = searchResult.steps
                .flatMap((s) => s.toolResults)
                .filter((t) => t.toolName === "webSearch")
                .map((t) => String(t.output))

              console.log(`[turn] ${persona.name} search step: ${searchResults.length} results`)
            } catch (err) {
              console.error(`[turn] ${persona.name} search step failed:`, err)
            }

            // Fallback: direct SearXNG fetch if model didn't call the tool
            if (searchResults.length === 0) {
              console.log(`[turn] ${persona.name} tool-call fallback: direct search`)
              const directResult = await directSearch(userMessage)
              if (directResult !== "[]") {
                searchResults = [directResult]
              }
            }

            emit("search-complete", { results: searchResults })

            if (searchResults.length > 0) {
              sharedSearchResults = `[WEB SEARCH RESULTS (from ${persona.name}'s search — use these facts if relevant, do not search again):\n${searchResults.join("\n")}]`
            }
          }

          // Build context for this persona
          const turnSummary = buildTurnSummary(turnResponses, personas)
          const apiMessages = buildApiMessages(
            dbMessages, turnResponses, persona.id, personas, turnSummary, sharedSearchResults
          )

          // Emit persona-start
          emit("persona-start", { personaId: persona.id })

          // Generate persona response
          let parsed: { response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: string; addressed_persona_id?: string }

          try {
            const result = await generateText({
              model: resolvedModel,
              system: buildPersonaSystemPrompt(persona, personas),
              messages: apiMessages,
              output: Output.object({ schema: personaResponseSchema }),
              maxOutputTokens: 4096,
            })
            parsed = result.output ?? { response_type: "silence", content: "" }
          } catch (structuredErr) {
            // Model can't do structured output — fall back to raw text
            console.warn(`[turn] ${persona.name} structured output failed:`, structuredErr)
            try {
              const fallback = await generateText({
                model: resolvedModel,
                system: buildPersonaSystemPrompt(persona, personas),
                messages: apiMessages,
                maxOutputTokens: 4096,
              })
              parsed = { response_type: "full", content: fallback.text || "" }
            } catch (fallbackErr) {
              console.error(`[turn] ${persona.name} raw fallback also failed:`, fallbackErr)
              parsed = { response_type: "silence", content: "" }
            }
          }

          console.log(`[turn] ${persona.name} responded: type=${parsed.response_type} content=${parsed.content?.substring(0, 50)}`)

          // Persist non-silence response
          if (parsed.response_type !== "silence" && parsed.content) {
            await prisma.message.create({
              data: {
                conversationId: convId,
                personaId: persona.id,
                content: parsed.content,
                responseType: parsed.response_type,
                addressedTo: parsed.addressed_to || null,
                addressedPersonaId: parsed.addressed_persona_id || null,
              },
            })

            turnResponses.push({
              personaId: persona.id,
              response_type: parsed.response_type,
              content: parsed.content,
              addressed_to: parsed.addressed_to as "user" | "persona" | undefined,
              addressed_persona_id: parsed.addressed_persona_id,
            })
          }

          // Emit persona response (including silence so client can remove from pending)
          emit("persona-response", {
            personaId: persona.id,
            response: {
              response_type: parsed.response_type,
              content: parsed.content,
              addressed_to: parsed.addressed_to,
              addressed_persona_id: parsed.addressed_persona_id,
            },
          })
        }

        // Follow-up round: give addressed personas a chance to respond
        const addressedPersonaIds = [
          ...new Set(
            turnResponses
              .filter((r) => r.addressed_to === "persona" && r.addressed_persona_id)
              .map((r) => r.addressed_persona_id!)
          ),
        ]
        const followupPersonas = addressedPersonaIds
          .map((id) => personas.find((p) => p.id === id))
          .filter((p): p is Persona => p !== undefined)

        if (followupPersonas.length > 0) {
          console.log(`[turn] follow-up round: ${followupPersonas.length} persona(s) addressed`)

          for (const persona of followupPersonas) {
            const turnSummary = buildTurnSummary(turnResponses, personas)
            const apiMessages = buildApiMessages(
              dbMessages, turnResponses, persona.id, personas, turnSummary, sharedSearchResults
            )

            emit("persona-start", { personaId: persona.id })

            let parsed: { response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: string; addressed_persona_id?: string }

            try {
              const result = await generateText({
                model: resolvedModel,
                system: buildPersonaSystemPrompt(persona, personas),
                messages: apiMessages,
                output: Output.object({ schema: personaResponseSchema }),
                maxOutputTokens: 4096,
              })
              parsed = result.output ?? { response_type: "silence", content: "" }
            } catch {
              console.warn(`[turn] follow-up ${persona.name} structured output failed, falling back to raw text`)
              try {
                const fallback = await generateText({
                  model: resolvedModel,
                  system: buildPersonaSystemPrompt(persona, personas),
                  messages: apiMessages,
                  maxOutputTokens: 4096,
                })
                parsed = { response_type: "full", content: fallback.text || "" }
              } catch {
                console.error(`[turn] follow-up ${persona.name} raw fallback also failed`)
                parsed = { response_type: "silence", content: "" }
              }
            }

            console.log(`[turn] follow-up ${persona.name} responded: type=${parsed.response_type} content=${parsed.content?.substring(0, 50)}`)

            if (parsed.response_type !== "silence" && parsed.content) {
              await prisma.message.create({
                data: {
                  conversationId: convId,
                  personaId: persona.id,
                  content: parsed.content,
                  responseType: parsed.response_type,
                  addressedTo: parsed.addressed_to || null,
                  addressedPersonaId: parsed.addressed_persona_id || null,
                },
              })

              turnResponses.push({
                personaId: persona.id,
                response_type: parsed.response_type,
                content: parsed.content,
                addressed_to: parsed.addressed_to as "user" | "persona" | undefined,
                addressed_persona_id: parsed.addressed_persona_id,
              })
            }

            emit("persona-response", {
              personaId: persona.id,
              response: {
                response_type: parsed.response_type,
                content: parsed.content,
                addressed_to: parsed.addressed_to,
                addressed_persona_id: parsed.addressed_persona_id,
              },
            })
          }
        }

        // No responses at all — likely model incompatibility
        if (turnResponses.length === 0) {
          emit("turn-error", {
            message: "No personas could respond. The selected model may not be compatible — try switching to a different model.",
          })
        }

        emit("turn-complete", {})
      } catch (err) {
        console.error("[turn] FATAL:", err)
        emit("turn-error", { message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
