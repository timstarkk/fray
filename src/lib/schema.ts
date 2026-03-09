import { z } from "zod"

export const personaResponseSchema = z.object({
  response_type: z
    .enum(["full", "brief", "emoji", "silence"])
    .describe(
      "full = you disagree or have a substantive unique perspective (2-5 sentences). " +
        "brief = you agree and want to acknowledge, one sentence max. " +
        "emoji = someone already said what you were thinking, just react with a single emoji. " +
        "silence = nothing to add, topic not your area, or enough has been said."
    ),
  content: z
    .string()
    .describe(
      "Your response text for full/brief, a single emoji for emoji type, or empty string for silence."
    ),
  addressed_to: z
    .enum(["user", "persona"])
    .optional()
    .describe(
      'Who you are responding to. Default is "user". Set to "persona" if you are directly responding to something another persona said.'
    ),
  addressed_persona_id: z
    .string()
    .optional()
    .describe(
      'If addressed_to is "persona", the ID of the persona you are responding to.'
    ),
})

export type PersonaResponse = z.infer<typeof personaResponseSchema>
