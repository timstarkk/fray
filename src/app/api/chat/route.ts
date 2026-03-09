import { generateText, Output } from "ai"
import { personaResponseSchema } from "@/lib/schema"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"
import { getModel } from "@/lib/providers"
import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, persona, allPersonas, model } = await req.json()

  let openRouterKey: string | undefined
  if (model?.startsWith("openrouter/")) {
    const user = await getDbUser()
    const apiKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
    })
    if (!apiKey) {
      return Response.json({ error: "No OpenRouter API key configured" }, { status: 400 })
    }
    openRouterKey = decrypt(apiKey.encryptedKey)
  }

  try {
    const { output } = await generateText({
      model: getModel(model || "local/qwen3:32b", openRouterKey),
      system: buildPersonaSystemPrompt(persona, allPersonas),
      messages,
      output: Output.object({ schema: personaResponseSchema }),
      maxOutputTokens: 32000,
    })

    return Response.json(output)
  } catch (err) {
    console.error("Chat error:", err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
