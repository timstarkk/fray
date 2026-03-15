import { type Persona } from "./personas"

type DbMessage = {
  id: string
  personaId: string | null
  content: string
  responseType: string | null
  addressedTo: string | null
  addressedPersonaId: string | null
  createdAt: Date
}

type TurnResponse = {
  personaId: string
  response_type: "full" | "brief" | "emoji" | "silence"
  content: string
  addressed_to?: "user" | "persona"
  addressed_persona_id?: string
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildTurnSummary(
  turnResponses: TurnResponse[],
  personas: Persona[]
): string | null {
  if (turnResponses.length === 0) return null

  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const fullCount = turnResponses.filter((r) => r.response_type === "full").length
  const briefCount = turnResponses.filter((r) => r.response_type === "brief").length
  const emojiCount = turnResponses.filter((r) => r.response_type === "emoji").length

  const names = turnResponses.map((r) => {
    const p = personaMap.get(r.personaId)
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

export function buildApiMessages(
  dbMessages: DbMessage[],
  turnResponses: TurnResponse[],
  currentPersonaId: string,
  personas: Persona[],
  turnSummary: string | null,
  sharedSearchResults: string | null
) {
  const personaMap = new Map(personas.map((p) => [p.id, p]))

  // Map DB messages (history before this turn)
  const mapped: { role: "user" | "assistant"; content: string }[] = dbMessages
    .filter((m) => {
      // Skip silence responses
      if (m.personaId !== null && m.responseType === "silence") return false
      return true
    })
    .map((m) => {
      if (m.personaId === null) {
        // Summary message — inject as labeled context
        if (m.responseType === "summary") {
          return { role: "user" as const, content: `[CONVERSATION SUMMARY — earlier messages condensed:\n${m.content}]` }
        }
        // User message
        return { role: "user" as const, content: m.content }
      }

      // Persona message — perspective framing
      if (m.personaId === currentPersonaId) {
        return { role: "assistant" as const, content: m.content }
      }

      const persona = personaMap.get(m.personaId)
      const label = persona
        ? `${persona.emoji} ${persona.name}`
        : m.personaId
      return { role: "user" as const, content: `[${label}]: ${m.content}` }
    })

  // Append turn responses from current turn (already persisted to DB but
  // we use the in-memory list for consistency within the turn loop)
  for (const tr of turnResponses) {
    if (tr.response_type === "silence") continue

    if (tr.personaId === currentPersonaId) {
      mapped.push({ role: "assistant" as const, content: tr.content })
    } else {
      const persona = personaMap.get(tr.personaId)
      const label = persona
        ? `${persona.emoji} ${persona.name}`
        : tr.personaId
      mapped.push({ role: "user" as const, content: `[${label}]: ${tr.content}` })
    }
  }

  if (turnSummary) {
    mapped.push({ role: "user" as const, content: turnSummary })
  }

  if (sharedSearchResults) {
    mapped.push({ role: "user" as const, content: sharedSearchResults })
  }

  return mapped
}
