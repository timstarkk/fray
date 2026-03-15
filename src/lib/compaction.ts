import { generateText } from "ai"
import type { LanguageModel } from "ai"
import { prisma } from "@/lib/db"
import { type Persona } from "@/lib/personas"

const COMPACTION_THRESHOLD = 0.8 // compact at 80% of context window
const RECENT_BUDGET_RATIO = 0.2 // keep ~20% of context budget for recent messages

type DbMessage = {
  id: string
  personaId: string | null
  content: string
  responseType: string | null
  addressedTo: string | null
  addressedPersonaId: string | null
  createdAt: Date
}

function estimateTokens(messages: DbMessage[]): number {
  let chars = 0
  for (const m of messages) {
    chars += m.content.length
  }
  return Math.ceil(chars / 4)
}

export async function compactIfNeeded(
  dbMessages: DbMessage[],
  contextLength: number,
  resolvedModel: LanguageModel,
  conversationId: string,
  personas: Persona[]
): Promise<{ messages: DbMessage[]; compacted: boolean }> {
  const estimatedTokens = estimateTokens(dbMessages)
  const threshold = Math.floor(contextLength * COMPACTION_THRESHOLD)

  console.log(`[compaction] estimated=${estimatedTokens} threshold=${threshold} contextLength=${contextLength}`)

  if (estimatedTokens < threshold) {
    return { messages: dbMessages, compacted: false }
  }

  // Check if we already have a summary — if so, the conversation was
  // compacted before. We need to re-summarize including the old summary
  // since more messages have accumulated.
  const existingSummaryIdx = dbMessages.findIndex(
    (m) => m.responseType === "summary"
  )

  // Determine split point: keep recent messages worth ~20% of context budget
  const recentBudget = Math.floor(contextLength * RECENT_BUDGET_RATIO)
  let recentTokens = 0
  let splitIdx = dbMessages.length

  for (let i = dbMessages.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil(dbMessages[i].content.length / 4)
    if (recentTokens + msgTokens > recentBudget) break
    recentTokens += msgTokens
    splitIdx = i
  }

  // Don't compact if there aren't enough old messages to summarize
  if (splitIdx <= 1) {
    return { messages: dbMessages, compacted: false }
  }

  const olderMessages = dbMessages.slice(0, splitIdx)
  const recentMessages = dbMessages.slice(splitIdx)

  // Build conversation text for summarization
  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const conversationText = olderMessages
    .filter((m) => m.responseType !== "summary")
    .map((m) => {
      if (m.personaId === null) {
        return `User: ${m.content}`
      }
      const persona = personaMap.get(m.personaId)
      const label = persona
        ? `${persona.emoji} ${persona.name}`
        : "Persona"
      return `${label}: ${m.content}`
    })
    .join("\n\n")

  // Include old summary in the text if one existed
  const oldSummary = existingSummaryIdx >= 0
    ? `[Previous summary: ${dbMessages[existingSummaryIdx].content}]\n\n`
    : ""

  console.log(`[compaction] summarizing ${olderMessages.length} older messages, keeping ${recentMessages.length} recent`)

  try {
    const result = await generateText({
      model: resolvedModel,
      system: `Summarize this group chat conversation concisely. Preserve:
- Key topics discussed and conclusions reached
- Each persona's stated positions and disagreements
- Any decisions or action items
- Important facts, links, or data shared

Format as a narrative summary, not bullet points. Keep it under 500 words.`,
      messages: [
        {
          role: "user",
          content: `${oldSummary}Conversation:\n${conversationText}`,
        },
      ],
      maxOutputTokens: 1024,
    })

    const summaryText = result.text
    if (!summaryText) {
      console.error("[compaction] summarization returned empty text")
      return { messages: dbMessages, compacted: false }
    }

    // Delete old summary if one exists
    if (existingSummaryIdx >= 0) {
      await prisma.message.delete({
        where: { id: dbMessages[existingSummaryIdx].id },
      })
    }

    // Persist new summary
    const summaryMessage = await prisma.message.create({
      data: {
        conversationId,
        content: summaryText,
        personaId: null,
        responseType: "summary",
      },
    })

    console.log(`[compaction] summary persisted: ${summaryText.substring(0, 100)}...`)

    // Return summary + recent messages
    const summaryDbMessage: DbMessage = {
      id: summaryMessage.id,
      personaId: null,
      content: summaryText,
      responseType: "summary",
      addressedTo: null,
      addressedPersonaId: null,
      createdAt: summaryMessage.createdAt,
    }

    return {
      messages: [summaryDbMessage, ...recentMessages],
      compacted: true,
    }
  } catch (err) {
    console.error("[compaction] summarization failed:", err)
    return { messages: dbMessages, compacted: false }
  }
}
