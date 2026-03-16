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
    <div className="flex gap-2.5 max-w-[70%]">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary">
        <span className="text-sm leading-none">{persona.emoji}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-semibold ${colors.name}`}>
            {persona.name}
          </span>
          {addressedPersona && (
            <span className="text-[10px] text-muted-foreground">
              replying to {addressedPersona.emoji}
            </span>
          )}
        </div>
        <div className={`${colors.bubble} rounded-xl rounded-tl-md px-3 py-1.5`}>
          <span className="text-sm text-foreground/80">
            {response.content}
          </span>
        </div>
      </div>
    </div>
  )
}
