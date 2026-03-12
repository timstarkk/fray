import { generateText, Output } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/providers"
import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

const expandedPersonaSchema = z.object({
  emoji: z
    .string()
    .describe("A single emoji that represents this persona's personality."),
  role: z
    .string()
    .describe(
      "A 2-3 word role label, like 'Devil\\'s Advocate' or 'Pragmatic Engineer'."
    ),
  systemPrompt: z
    .string()
    .describe(
      "A 2-4 sentence personality description written in second person ('You are...'). " +
        "Cover their perspective, what they care about, how they speak, and what kind of feedback they give. " +
        "Be specific and vivid."
    ),
})

export const maxDuration = 60

export async function POST(req: Request) {
  const { name, description, model } = await req.json()

  let openRouterKey: string | undefined
  const modelId = model || "local/qwen3:32b"

  if (modelId.startsWith("openrouter/")) {
    const user = await getDbUser()
    const apiKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
    })
    if (!apiKey) {
      return Response.json({ error: "No OpenRouter API key configured" }, { status: 400 })
    }
    openRouterKey = decrypt(apiKey.encryptedKey)
  }

  const { output } = await generateText({
    model: getModel(modelId, openRouterKey),
    system: `You are a persona designer. Given a name and short description of a character or role, generate a rich persona definition for use in a multi-perspective group chat. The persona should have a clear point of view, distinct voice, and specific areas of expertise or concern. If the input references a fictional character, capture their personality and worldview. If it's a role description, flesh it out with attitude and specifics.${modelId.startsWith("local/") ? "\n\n/no_think" : ""}`,
    messages: [
      {
        role: "user",
        content: `Create a persona for: "${name}"${description ? `\nAdditional context: "${description}"` : ""}`,
      },
    ],
    output: Output.object({ schema: expandedPersonaSchema }),
    maxOutputTokens: 1024,
  })

  return Response.json(output)
}
