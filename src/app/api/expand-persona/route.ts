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

  const systemPrompt = `You are a persona designer. Given a name and short description of a character or role, generate a rich persona definition for use in a multi-perspective group chat. The persona should have a clear point of view, distinct voice, and specific areas of expertise or concern. If the input references a fictional character, capture their personality and worldview. If it's a role description, flesh it out with attitude and specifics.${modelId.startsWith("local/") ? "\n\n/no_think" : ""}`
  const messages = [
    {
      role: "user" as const,
      content: `Create a persona for: "${name}"${description ? `\nAdditional context: "${description}"` : ""}\n\nRespond with JSON: { "emoji": "single emoji", "role": "2-3 word role label", "systemPrompt": "2-4 sentence personality description starting with 'You are...'" }`,
    },
  ]

  try {
    const { output } = await generateText({
      model: getModel(modelId, openRouterKey),
      system: systemPrompt,
      messages,
      output: Output.object({ schema: expandedPersonaSchema }),
      maxOutputTokens: 1024,
    })
    return Response.json(output)
  } catch {
    // Structured output failed — fall back to raw text and parse JSON
    console.warn("[expand-persona] structured output failed, trying raw text")
    try {
      const fallback = await generateText({
        model: getModel(modelId, openRouterKey),
        system: systemPrompt,
        messages,
        maxOutputTokens: 1024,
      })
      const text = fallback.text || ""
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return Response.json({
          emoji: parsed.emoji || "🤖",
          role: parsed.role || "Custom",
          systemPrompt: parsed.systemPrompt || text,
        })
      }
      // No JSON found — use the raw text as the system prompt
      return Response.json({
        emoji: "🤖",
        role: "Custom",
        systemPrompt: text,
      })
    } catch (err) {
      console.error("[expand-persona] raw fallback also failed:", err)
      return Response.json({ error: "Failed to generate persona" }, { status: 500 })
    }
  }
}
