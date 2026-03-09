import { type PersonaResponse } from "./schema"

export type ChatMessage =
  | {
      id: string
      role: "user"
      content: string
      timestamp: Date
    }
  | {
      id: string
      role: "persona"
      personaId: string
      response: PersonaResponse
      timestamp: Date
    }
