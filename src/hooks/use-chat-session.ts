"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { type Persona } from "@/lib/personas"
import { type ChatMessage } from "@/lib/chat-types"
import { readSSE } from "@/lib/sse-reader"

function uuid() {
  return crypto.randomUUID()
}

type DbMessage = {
  id: string
  personaId: string | null
  content: string
  responseType: string | null
  addressedTo: string | null
  addressedPersonaId: string | null
  createdAt: string
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
      } catch (err) {
        console.error("Turn failed:", err)
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "system" as const,
            content:
              "Something went wrong. Try again or switch models.",
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
    [] // all dependencies accessed via refs
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
