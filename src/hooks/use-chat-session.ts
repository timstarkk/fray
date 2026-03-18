"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { type Persona } from "@/lib/personas"
import { type ChatMessage, type DbMessage } from "@/lib/chat-types"
import { readSSE } from "@/lib/sse-reader"
import { isLocalModel, callOllamaChat, callOllamaRaw, getOllamaContextLength, routeSearch } from "@/lib/ollama-client"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"
import { shuffle, buildTurnSummary, buildApiMessages } from "@/lib/turn-context"
import { shouldCompact, splitForCompaction, buildCompactionText, COMPACTION_SYSTEM_PROMPT } from "@/lib/compaction-utils"
import { enqueue, drainQueue } from "@/lib/sync-queue"

function uuid() {
  return crypto.randomUUID()
}

function dbMessageToChatMessage(msg: DbMessage): ChatMessage {
  if (msg.personaId === null) {
    return {
      id: msg.id,
      role: "user" as const,
      content: msg.content,
      timestamp: new Date(msg.createdAt),
    }
  }

  return {
    id: msg.id,
    role: "persona" as const,
    personaId: msg.personaId,
    response: {
      response_type: (msg.responseType || "full") as
        | "full"
        | "brief"
        | "emoji"
        | "silence",
      content: msg.content,
      addressed_to: (msg.addressedTo as "user" | "persona") || undefined,
      addressed_persona_id: msg.addressedPersonaId || undefined,
    },
    timestamp: new Date(msg.createdAt),
  }
}

type TurnResponse = {
  personaId: string
  response_type: "full" | "brief" | "emoji" | "silence"
  content: string
  addressed_to?: "user" | "persona"
  addressed_persona_id?: string
}

async function saveMessage(payload: {
  conversationId: string
  personaId: string | null
  content: string
  responseType: string
  addressedTo?: string | null
  addressedPersonaId?: string | null
}) {
  try {
    const res = await fetch("/api/turn/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Save failed: ${res.status}`)
  } catch {
    enqueue({ ...payload, timestamp: Date.now() })
  }
}

export function useChatSession(
  activePersonas: Persona[],
  model: string,
  conversationId: string | null,
  onConversationCreated: (id: string) => void,
  onConversationLoaded?: (personaIds: string[], model: string) => void,
  webSearchEnabled?: boolean
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingPersonas, setPendingPersonas] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(!!conversationId)

  const activePersonasRef = useRef(activePersonas)
  const modelRef = useRef(model)
  const conversationIdRef = useRef(conversationId)
  const onConversationCreatedRef = useRef(onConversationCreated)
  const onConversationLoadedRef = useRef(onConversationLoaded)
  const webSearchEnabledRef = useRef(webSearchEnabled)
  const justCreatedRef = useRef(false)
  const [pendingConvId, setPendingConvId] = useState<string | null>(null)

  useEffect(() => {
    activePersonasRef.current = activePersonas
  }, [activePersonas])
  useEffect(() => {
    modelRef.current = model
  }, [model])
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])
  useEffect(() => {
    onConversationCreatedRef.current = onConversationCreated
  }, [onConversationCreated])
  useEffect(() => {
    onConversationLoadedRef.current = onConversationLoaded
  }, [onConversationLoaded])
  useEffect(() => {
    webSearchEnabledRef.current = webSearchEnabled
  }, [webSearchEnabled])

  // Drain sync queue on mount
  useEffect(() => {
    drainQueue().then((count) => {
      if (count > 0) console.log(`[sync-queue] drained ${count} queued saves`)
    })
  }, [])

  // Load messages when conversation changes (skip if we just created it)
  useEffect(() => {
    if (conversationId) {
      if (justCreatedRef.current) {
        justCreatedRef.current = false
        setMessagesLoading(false)
        return
      }
      setMessagesLoading(true)
      fetch(`/api/conversations/${conversationId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) {
            setMessages(data.messages.map(dbMessageToChatMessage))
          }
          if (onConversationLoadedRef.current && data.personas) {
            onConversationLoadedRef.current(
              data.personas.map(
                (p: { personaId: string }) => p.personaId
              ),
              data.model
            )
          }
        })
        .catch(() => setMessages([]))
        .finally(() => setMessagesLoading(false))
    } else {
      setMessages([])
      setMessagesLoading(false)
    }
  }, [conversationId])

  // ── Local model turn ──────────────────────────────────────────────
  const sendLocalTurn = useCallback(
    async (text: string, personas: Persona[]) => {
      const currentModel = modelRef.current

      // 1. Prepare — server creates conversation, persists user message, fetches URLs
      const prepareRes = await fetch("/api/turn/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          conversationId: conversationIdRef.current,
          personaIds: personas.map((p) => p.id),
          model: currentModel,
        }),
      })

      if (!prepareRes.ok) {
        const err = await prepareRes.json()
        throw new Error(err.error || `Prepare failed: ${prepareRes.status}`)
      }

      const prepared = await prepareRes.json() as {
        conversationId: string
        messages: DbMessage[]
        urlContent: string | null
      }

      const convId = prepared.conversationId

      // Emit conversation created
      if (!conversationIdRef.current) {
        conversationIdRef.current = convId
        justCreatedRef.current = true
        onConversationCreatedRef.current(convId)
      }

      const shuffledPersonas = shuffle(personas)
      setPendingPersonas(new Set(shuffledPersonas.map((p) => p.id)))
      setPendingConvId(convId)

      // 2. Search routing — ask local Ollama if we need to search
      let searchResults: string | null = null
      if (webSearchEnabledRef.current) {
        setIsSearching(true)
        try {
          const query = await routeSearch(currentModel, text)
          if (query) {
            const searchRes = await fetch("/api/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query }),
            })
            if (searchRes.ok) {
              const searchData = await searchRes.json()
              if (searchData.results && searchData.results !== "[]") {
                searchResults = `[WEB SEARCH RESULTS (use these facts if relevant):\n${searchData.results}]`
              }
            }
          }
        } catch (err) {
          console.warn("[local-turn] search routing failed:", err)
        }
        setIsSearching(false)
      }

      // 3. Context compaction
      let dbMessages = prepared.messages
      try {
        const contextLength = await getOllamaContextLength(currentModel)
        if (shouldCompact(dbMessages, contextLength)) {
          const split = splitForCompaction(dbMessages, contextLength)
          if (split) {
            const compactionText = buildCompactionText(split.older, personas)
            const summaryText = await callOllamaRaw(
              currentModel,
              COMPACTION_SYSTEM_PROMPT,
              compactionText
            )
            if (summaryText) {
              // Persist summary to server
              await saveMessage({
                conversationId: convId,
                personaId: null,
                content: summaryText,
                responseType: "summary",
              })
              // Use compacted messages for the turn
              const summaryDbMessage: DbMessage = {
                id: uuid(),
                personaId: null,
                content: summaryText,
                responseType: "summary",
                addressedTo: null,
                addressedPersonaId: null,
                createdAt: new Date().toISOString(),
              }
              dbMessages = [summaryDbMessage, ...split.recent]
              console.log(`[local-turn] compacted: ${split.older.length} older → summary + ${split.recent.length} recent`)
            }
          }
        }
      } catch (err) {
        console.warn("[local-turn] compaction failed, proceeding without:", err)
      }

      // 4. Persona loop
      const turnResponses: TurnResponse[] = []

      for (const persona of shuffledPersonas) {
        const turnSummary = buildTurnSummary(turnResponses, personas)
        const apiMessages = buildApiMessages(
          dbMessages, turnResponses, persona.id, personas, turnSummary, searchResults, prepared.urlContent
        )

        // Show thinking indicator
        setPendingPersonas((prev) => {
          const next = new Set(prev)
          next.add(persona.id)
          return next
        })

        let response: { response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: string; addressed_persona_id?: string }

        try {
          const systemPrompt = buildPersonaSystemPrompt(persona, personas, { jsonFormat: true })
          response = await callOllamaChat(currentModel, systemPrompt, apiMessages)
        } catch (err) {
          console.warn(`[local-turn] ${persona.name} inference failed:`, err)
          response = { response_type: "silence", content: "" }
        }

        // Add to UI + persist
        if (response.response_type !== "silence" && response.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: uuid(),
              role: "persona" as const,
              personaId: persona.id,
              response: {
                response_type: response.response_type,
                content: response.content,
                addressed_to: response.addressed_to as "user" | "persona" | undefined,
                addressed_persona_id: response.addressed_persona_id,
              },
              timestamp: new Date(),
            },
          ])

          saveMessage({
            conversationId: convId,
            personaId: persona.id,
            content: response.content,
            responseType: response.response_type,
            addressedTo: response.addressed_to || null,
            addressedPersonaId: response.addressed_persona_id || null,
          })

          turnResponses.push({
            personaId: persona.id,
            response_type: response.response_type,
            content: response.content,
            addressed_to: response.addressed_to as "user" | "persona" | undefined,
            addressed_persona_id: response.addressed_persona_id,
          })
        }

        // Clear this persona from pending
        setPendingPersonas((prev) => {
          const next = new Set(prev)
          next.delete(persona.id)
          return next
        })
      }

      // 5. Follow-up round — addressed personas get a second chance
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
        console.log(`[local-turn] follow-up round: ${followupPersonas.length} persona(s) addressed`)

        for (const persona of followupPersonas) {
          const turnSummary = buildTurnSummary(turnResponses, personas)
          const apiMessages = buildApiMessages(
            dbMessages, turnResponses, persona.id, personas, turnSummary, searchResults, prepared.urlContent
          )

          setPendingPersonas((prev) => {
            const next = new Set(prev)
            next.add(persona.id)
            return next
          })

          let response: { response_type: "full" | "brief" | "emoji" | "silence"; content: string; addressed_to?: string; addressed_persona_id?: string }

          try {
            const systemPrompt = buildPersonaSystemPrompt(persona, personas, { jsonFormat: true })
            response = await callOllamaChat(currentModel, systemPrompt, apiMessages)
          } catch {
            console.warn(`[local-turn] follow-up ${persona.name} inference failed`)
            response = { response_type: "silence", content: "" }
          }

          if (response.response_type !== "silence" && response.content) {
            setMessages((prev) => [
              ...prev,
              {
                id: uuid(),
                role: "persona" as const,
                personaId: persona.id,
                response: {
                  response_type: response.response_type,
                  content: response.content,
                  addressed_to: response.addressed_to as "user" | "persona" | undefined,
                  addressed_persona_id: response.addressed_persona_id,
                },
                timestamp: new Date(),
              },
            ])

            saveMessage({
              conversationId: convId,
              personaId: persona.id,
              content: response.content,
              responseType: response.response_type,
              addressedTo: response.addressed_to || null,
              addressedPersonaId: response.addressed_persona_id || null,
            })

            turnResponses.push({
              personaId: persona.id,
              response_type: response.response_type,
              content: response.content,
              addressed_to: response.addressed_to as "user" | "persona" | undefined,
              addressed_persona_id: response.addressed_persona_id,
            })
          }

          setPendingPersonas((prev) => {
            const next = new Set(prev)
            next.delete(persona.id)
            return next
          })
        }
      }

      // 6. No responses at all
      if (turnResponses.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "system" as const,
            content: "Could not reach Ollama on your machine. Make sure Ollama is running at localhost:11434.",
            timestamp: new Date(),
          },
        ])
      }
    },
    [] // all dependencies accessed via refs
  )

  // ── Cloud model turn (existing SSE path) ──────────────────────────
  const sendCloudTurn = useCallback(
    async (text: string, personas: Persona[]) => {
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          conversationId: conversationIdRef.current,
          personaIds: personas.map((p) => p.id),
          model: modelRef.current,
          webSearchEnabled: webSearchEnabledRef.current,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `API ${res.status}`)
      }

      await readSSE(res, (event, data) => {
        switch (event) {
          case "turn-start": {
            const d = data as { conversationId: string; personaOrder: string[] }
            if (!conversationIdRef.current) {
              conversationIdRef.current = d.conversationId
              justCreatedRef.current = true
              onConversationCreatedRef.current(d.conversationId)
            }
            setPendingPersonas(new Set(d.personaOrder))
            setPendingConvId(d.conversationId)
            break
          }

          case "search-start":
            setIsSearching(true)
            break

          case "search-complete":
            setIsSearching(false)
            break

          case "persona-start": {
            const d = data as { personaId: string }
            setPendingPersonas((prev) => {
              const next = new Set(prev)
              next.add(d.personaId)
              return next
            })
            break
          }

          case "persona-response": {
            const d = data as {
              personaId: string
              response: {
                response_type: "full" | "brief" | "emoji" | "silence"
                content: string
                addressed_to?: string
                addressed_persona_id?: string
              }
            }
            if (d.response.response_type !== "silence" && d.response.content) {
              setMessages((prev) => [
                ...prev,
                {
                  id: uuid(),
                  role: "persona" as const,
                  personaId: d.personaId,
                  response: {
                    response_type: d.response.response_type,
                    content: d.response.content,
                    addressed_to: d.response.addressed_to as "user" | "persona" | undefined,
                    addressed_persona_id: d.response.addressed_persona_id,
                  },
                  timestamp: new Date(),
                },
              ])
            }
            setPendingPersonas((prev) => {
              const next = new Set(prev)
              next.delete(d.personaId)
              return next
            })
            break
          }

          case "turn-error": {
            const d = data as { message: string }
            setMessages((prev) => [
              ...prev,
              {
                id: uuid(),
                role: "system" as const,
                content: d.message,
                timestamp: new Date(),
              },
            ])
            break
          }

          case "turn-complete":
            break
        }
      })
    },
    [] // all dependencies accessed via refs
  )

  // ── Main sendMessage dispatch ─────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const personas = activePersonasRef.current
      if (personas.length === 0) return

      // Optimistic user message
      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        if (isLocalModel(modelRef.current)) {
          await sendLocalTurn(text, personas)
        } else {
          await sendCloudTurn(text, personas)
        }
      } catch (err) {
        console.error("Turn failed:", err)
        const isLocal = isLocalModel(modelRef.current)
        const errorMsg = isLocal && err instanceof TypeError
          ? "Could not reach Ollama on your machine. Make sure Ollama is running at localhost:11434."
          : "Something went wrong. Try again or switch models."
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "system" as const,
            content: errorMsg,
            timestamp: new Date(),
          },
        ])
      } finally {
        setPendingConvId(null)
        setIsLoading(false)
        setIsSearching(false)
        setPendingPersonas(new Set())
      }
    },
    [sendLocalTurn, sendCloudTurn]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setPendingPersonas(new Set())
    setPendingConvId(null)
    setIsLoading(false)
    setIsSearching(false)
  }, [])

  return {
    messages,
    pendingPersonas,
    pendingConversationId: pendingConvId,
    isLoading,
    isSearching,
    messagesLoading,
    sendMessage,
    clearChat,
  }
}
