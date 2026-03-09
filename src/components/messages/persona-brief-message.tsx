import { type Persona } from "@/lib/personas"
import { type PersonaResponse } from "@/lib/schema"
import { getPersonaColors } from "@/lib/colors"

type PersonaBriefMessageProps = {
  persona: Persona
  response: PersonaResponse
  addressedPersona?: Persona | null
}

export function PersonaBriefMessage({
  persona,
  response,
  addressedPersona,
}: PersonaBriefMessageProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <div className="flex items-center gap-2 pl-2">
      <span className="text-sm shrink-0">{persona.emoji}</span>
      <span className={`text-xs font-medium ${colors.name}`}>
        {persona.name}
      </span>
      {addressedPersona && (
        <span className="text-xs text-muted-foreground">
          → {addressedPersona.emoji}
        </span>
      )}
      <span className="text-sm text-muted-foreground italic">
        {response.content}
      </span>
    </div>
  )
}
