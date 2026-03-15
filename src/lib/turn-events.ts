import { type PersonaResponse } from "./schema"

export type TurnEvent =
  | { event: "turn-start"; data: { conversationId: string; personaOrder: string[] } }
  | { event: "search-start"; data: Record<string, never> }
  | { event: "search-complete"; data: { results: string[] } }
  | { event: "persona-start"; data: { personaId: string } }
  | { event: "persona-response"; data: { personaId: string; response: PersonaResponse } }
  | { event: "turn-complete"; data: Record<string, never> }
  | { event: "turn-error"; data: { message: string } }
