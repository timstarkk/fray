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
      if (m.role === "persona" && m.response.response_type === "silence")
        return false
      return true
    })
    .map((m) => {
      if (m.role === "user") {
        return { role: "user" as const, content: m.content }
      }

      const persona = personaMap.get(m.personaId)
      const label = persona
        ? `${persona.emoji} ${persona.name}`
        : m.personaId

      const content = `[${label}]: ${m.response.content}`

      // Current persona's own prior messages are 'assistant', others are 'user'
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

export function useChatSession(activePersonas: Persona[], model: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingPersonas, setPendingPersonas] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(false)
  const activePersonasRef = useRef(activePersonas)
  const modelRef = useRef(model)
  useEffect(() => {
    activePersonasRef.current = activePersonas
  }, [activePersonas])
  useEffect(() => {
    modelRef.current = model
  }, [model])

  const sendMessage = useCallback(
    async (text: string) => {
      const personas = activePersonasRef.current
      if (personas.length === 0) return

      const userMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      const shuffled = shuffle([...personas])
      const delays = shuffled
        .map(() => 500 + Math.random() * 2500)
        .sort((a, b) => a - b)

      setPendingPersonas(new Set(shuffled.map((p) => p.id)))

      const turnResponses: ChatMessage[] = []

      for (let i = 0; i < shuffled.length; i++) {
        const persona = shuffled[i]
        const delay = i === 0 ? delays[i] : delays[i] - delays[i - 1]

        await sleep(Math.max(delay, 200))

        // Snapshot current messages + this turn's responses
        const allMessages = await new Promise<ChatMessage[]>((resolve) => {
          setMessages((prev) => {
            resolve([...prev])
            return prev
          })
        })

        // turnResponses are already in allMessages via setMessages calls,
        // but we rebuild from our tracked list for ordering consistency
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

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: apiMessages,
              persona,
              allPersonas: personas,
              model: modelRef.current,
            }),
          })

          const response: PersonaResponse = await res.json()

          if (response.response_type !== "silence") {
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
          console.error(`Error calling persona ${persona.name}:`, err)
        }

        setPendingPersonas((prev) => {
          const next = new Set(prev)
          next.delete(persona.id)
          return next
        })
      }

      setIsLoading(false)
    },
    [] // activePersonas accessed via ref
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setPendingPersonas(new Set())
    setIsLoading(false)
  }, [])

  return {
    messages,
    pendingPersonas,
    isLoading,
    sendMessage,
    clearChat,
  }
}
