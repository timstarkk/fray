import { type DbMessage } from "./chat-types"

const COMPACTION_THRESHOLD = 0.8
const RECENT_BUDGET_RATIO = 0.2

export function estimateTokens(messages: DbMessage[]): number {
  let chars = 0
  for (const m of messages) chars += m.content.length
  return Math.ceil(chars / 4)
}

export function shouldCompact(messages: DbMessage[], contextLength: number): boolean {
  return estimateTokens(messages) >= Math.floor(contextLength * COMPACTION_THRESHOLD)
}

export function splitForCompaction(
  messages: DbMessage[],
  contextLength: number
): { older: DbMessage[]; recent: DbMessage[] } | null {
  const recentBudget = Math.floor(contextLength * RECENT_BUDGET_RATIO)
  let recentTokens = 0
  let splitIdx = messages.length

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil(messages[i].content.length / 4)
    if (recentTokens + msgTokens > recentBudget) break
    recentTokens += msgTokens
    splitIdx = i
  }

  if (splitIdx <= 1) return null

  return {
    older: messages.slice(0, splitIdx),
    recent: messages.slice(splitIdx),
  }
}

export function buildCompactionText(
  olderMessages: DbMessage[],
  personas: { id: string; name: string; emoji: string }[]
): string {
  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const existingSummary = olderMessages.find((m) => m.responseType === "summary")

  const conversationText = olderMessages
    .filter((m) => m.responseType !== "summary")
    .map((m) => {
      if (m.personaId === null) return `User: ${m.content}`
      const persona = personaMap.get(m.personaId)
      const label = persona ? `${persona.emoji} ${persona.name}` : "Persona"
      return `${label}: ${m.content}`
    })
    .join("\n\n")

  const oldSummary = existingSummary
    ? `[Previous summary: ${existingSummary.content}]\n\n`
    : ""

  return `${oldSummary}Conversation:\n${conversationText}`
}

export const COMPACTION_SYSTEM_PROMPT = `Summarize this group chat conversation concisely. Preserve:
- Key topics discussed and conclusions reached
- Each persona's stated positions and disagreements
- Any decisions or action items
- Important facts, links, or data shared

Format as a narrative summary, not bullet points. Keep it under 500 words.`
