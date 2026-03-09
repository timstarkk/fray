import { ollama } from "ai-sdk-ollama"
import { generateText, Output } from "ai"
import { personaResponseSchema } from "@/lib/schema"
import { buildPersonaSystemPrompt } from "@/lib/system-prompt"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, persona, allPersonas, model } = await req.json()

  const { output } = await generateText({
    model: ollama(model || "qwen3:32b"),
    system: buildPersonaSystemPrompt(persona, allPersonas),
    messages,
    output: Output.object({ schema: personaResponseSchema }),
  })

  return Response.json(output)
}
