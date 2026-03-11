import { generateText, Output } from "ai"
import { personaResponseSchema } from "@/lib/schema"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"
import { getModel } from "@/lib/providers"
import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, persona, allPersonas, model, conversationId, userMessage } =
      await req.json()

    console.log(`[chat] persona=${persona?.name} model=${model} convId=${conversationId} hasUserMsg=${!!userMessage}`)

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

    const { output } = await generateText({
      model: getModel(model || "local/qwen3:32b", openRouterKey),
      system: buildPersonaSystemPrompt(persona, allPersonas),
      messages,
      output: Output.object({ schema: personaResponseSchema }),
      maxOutputTokens: 32000,
    })

    console.log(`[chat] ${persona?.name} responded: type=${output?.response_type} content=${output?.content?.substring(0, 50)}`)

    // Save persona response to DB (skip silence)
    if (conversationId && output && output.response_type !== "silence") {
      await prisma.message.create({
        data: {
          conversationId,
          personaId: persona.id,
          content: output.content,
          responseType: output.response_type,
          addressedTo: output.addressed_to || null,
          addressedPersonaId: output.addressed_persona_id || null,
        },
      })
    }

    return Response.json(output)
  } catch (err) {
    console.error("[chat] FATAL:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
