import { generateText } from "ai"
import type { LanguageModel } from "ai"
import { prisma } from "@/lib/db"
import { type Persona } from "@/lib/personas"
import { type DbMessage } from "@/lib/chat-types"
import {
  estimateTokens,
  shouldCompact,
  splitForCompaction,
  buildCompactionText,
  COMPACTION_SYSTEM_PROMPT,
} from "@/lib/compaction-utils"

export async function compactIfNeeded(
  dbMessages: DbMessage[],
  contextLength: number,
  resolvedModel: LanguageModel,
  conversationId: string,
  personas: Persona[]
): Promise<{ messages: DbMessage[]; compacted: boolean }> {
  const estimatedTokens = estimateTokens(dbMessages)

  console.log(`[compaction] estimated=${estimatedTokens} threshold=${Math.floor(contextLength * 0.8)} contextLength=${contextLength}`)

  if (!shouldCompact(dbMessages, contextLength)) {
    return { messages: dbMessages, compacted: false }
  }

  const split = splitForCompaction(dbMessages, contextLength)
  if (!split) {
    return { messages: dbMessages, compacted: false }
  }

  const { older: olderMessages, recent: recentMessages } = split

  const existingSummaryIdx = dbMessages.findIndex(
    (m) => m.responseType === "summary"
  )

  const compactionText = buildCompactionText(olderMessages, personas)

  console.log(`[compaction] summarizing ${olderMessages.length} older messages, keeping ${recentMessages.length} recent`)

  try {
    const result = await generateText({
      model: resolvedModel,
      system: COMPACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: compactionText,
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
