"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { type Persona } from "@/lib/personas"
import { type PersonaResponse } from "@/lib/schema"
import { type ChatMessage } from "@/lib/chat-types"

function uuid() {
  return crypto.randomUUID()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateTitle(text: string): string {
  if (text.length <= 50) return text
  const truncated = text.substring(0, 47)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + "..."
}

function buildTurnSummary(
  turnResponses: ChatMessage[],
  personas: Persona[]
): string | null {
  if (turnResponses.length === 0) return null

  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const fullCount = turnResponses.filter(
    (m) => m.role === "persona" && m.response.response_type === "full"
  ).length
  const briefCount = turnResponses.filter(
    (m) => m.role === "persona" && m.response.response_type === "brief"
  ).length
  const emojiCount = turnResponses.filter(
    (m) => m.role === "persona" && m.response.response_type === "emoji"
  ).length

  const names = turnResponses
    .filter((m) => m.role === "persona")
    .map((m) => {
      const p = personaMap.get((m as { personaId: string }).personaId)
      return p ? p.name : "someone"
    })

  const parts: string[] = []
  parts.push(
    `[TURN STATUS: ${names.join(", ")} already responded this round.`
  )
  if (fullCount > 0) parts.push(`${fullCount} full response(s) given.`)
  if (briefCount > 0) parts.push(`${briefCount} brief acknowledgment(s).`)
  if (emojiCount > 0) parts.push(`${emojiCount} emoji reaction(s).`)
  parts.push(
    "If they already covered your point or asked your question, use emoji/brief/silence. Do NOT repeat what's been said.]"
  )

  return parts.join(" ")
}

function buildApiMessages(
  messages: ChatMessage[],
  currentPersonaId: string,
  personas: Persona[],
  turnSummary: string | null
) {
  const personaMap = new Map(personas.map((p) => [p.id, p]))

  const mapped = messages
    .filter((m) => {
      if (m.role === "system") return false
      if (m.role === "persona" && m.response.response_type === "silence")
        return false
      return true
    })
    .map((m) => {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content }
      }
      if (m.role !== "persona") {
        return { role: "user" as const, content: "" }
      }

      const persona = personaMap.get(m.personaId)
      const label = persona
        ? `${persona.emoji} ${persona.name}`
        : m.personaId

      const content = `[${label}]: ${m.response.content}`

      if (m.personaId === currentPersonaId) {
        return { role: "assistant" as const, content: m.response.content }
      }

      return { role: "user" as const, content }
    })

  if (turnSummary) {
    mapped.push({ role: "user" as const, content: turnSummary })
  }

  return mapped
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
          // Notify parent about loaded conversation metadata
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

      let convId = conversationIdRef.current

      // Create conversation if none exists
      if (!convId) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: generateTitle(text),
              model: modelRef.current,
              personaIds: personas.map((p) => p.id),
            }),
          })
          const conv = await res.json()
          const newId: string = conv.id
          convId = newId
          conversationIdRef.current = newId
          justCreatedRef.current = true
          onConversationCreatedRef.current(newId)
        } catch (err) {
          console.error("Failed to create conversation:", err)
          return
        }
      }

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setPendingConvId(convId)

      const shuffled = shuffle([...personas])
      const delays = shuffled
        .map(() => 500 + Math.random() * 2500)
        .sort((a, b) => a - b)

      setPendingPersonas(new Set(shuffled.map((p) => p.id)))

      const turnResponses: ChatMessage[] = []
      let sharedSearchResults: string | null = null

      for (let i = 0; i < shuffled.length; i++) {
        const persona = shuffled[i]
        const delay = i === 0 ? delays[i] : delays[i] - delays[i - 1]

        await sleep(Math.max(delay, 200))

        const allMessages = await new Promise<ChatMessage[]>((resolve) => {
          setMessages((prev) => {
            resolve([...prev])
            return prev
          })
        })

        const historyBeforeTurn = allMessages.filter(
          (m) => !turnResponses.some((tr) => tr.id === m.id)
        )
        const fullContext = [...historyBeforeTurn, ...turnResponses]

        const turnSummary = buildTurnSummary(turnResponses, personas)
        const apiMessages = buildApiMessages(
          fullContext,
          persona.id,
          personas,
          turnSummary
        )

        // Inject shared search results from a previous persona's search
        if (sharedSearchResults) {
          apiMessages.push({
            role: "user" as const,
            content: sharedSearchResults,
          })
        }

        // Show "Searching..." indicator for the first persona when web search is enabled
        const willSearch = !sharedSearchResults && webSearchEnabledRef.current && i === 0
        if (willSearch) setIsSearching(true)

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiMessages,
              persona,
              allPersonas: personas,
              model: modelRef.current,
              conversationId: convId,
              userMessage: i === 0 ? text : undefined,
              webSearchEnabled: !sharedSearchResults && webSearchEnabledRef.current,
            }),
          })

          if (willSearch) setIsSearching(false)

          if (!res.ok) throw new Error(`API ${res.status}`)
          const data = await res.json()
          const { searchResults, ...response } = data as PersonaResponse & {
            searchResults?: string[]
          }

          // Capture search results to share with subsequent personas
          if (searchResults && searchResults.length > 0 && !sharedSearchResults) {
            sharedSearchResults = `[WEB SEARCH RESULTS (from ${persona.name}'s search — use these facts if relevant, do not search again):\n${searchResults.join("\n")}]`
          }

          if (response.response_type !== "silence" && response.content) {
            const personaMsg: ChatMessage = {
              id: uuid(),
              role: "persona",
              personaId: persona.id,
              response,
              timestamp: new Date(),
            }
            turnResponses.push(personaMsg)
            setMessages((prev) => [...prev, personaMsg])
          }
        } catch (err) {
          if (willSearch) setIsSearching(false)
          console.error(`Error calling persona ${persona.name}:`, err)
        }

        setPendingPersonas((prev) => {
          const next = new Set(prev)
          next.delete(persona.id)
          return next
        })
      }

      if (turnResponses.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "system" as const,
            content: "No personas could respond. The selected model may not be compatible — try switching to a different model.",
            timestamp: new Date(),
          },
        ])
      }

      setPendingConvId(null)
      setIsLoading(false)
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
