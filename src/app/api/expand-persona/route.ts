import { ollama } from "ai-sdk-ollama"
import { generateText, Output } from "ai"
import { z } from "zod"

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

  const { output } = await generateText({
    model: ollama(model || "qwen3:32b"),
    system: `You are a persona designer. Given a name and short description of a character or role, generate a rich persona definition for use in a group brainstorming chat. The persona should have a clear point of view, distinct voice, and specific areas of expertise or concern. If the input references a fictional character, capture their personality and worldview. If it's a role description, flesh it out with attitude and specifics.

/no_think`,
    messages: [
      {
        role: "user",
        content: `Create a persona for: "${name}"${description ? `\nAdditional context: "${description}"` : ""}`,
      },
    ],
    output: Output.object({ schema: expandedPersonaSchema }),
  })

  return Response.json(output)
}
