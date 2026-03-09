import { type Persona } from "@/lib/personas"
import { type PersonaResponse } from "@/lib/schema"
import { getPersonaColors } from "@/lib/colors"
import { Markdown } from "@/components/ui/markdown"

type PersonaFullMessageProps = {
  persona: Persona
  response: PersonaResponse
  addressedPersona?: Persona | null
}

export function PersonaFullMessage({
  persona,
  response,
  addressedPersona,
}: PersonaFullMessageProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <div className="flex gap-3 max-w-[85%]">
      <span className="text-xl shrink-0 mt-1">{persona.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-xs font-medium ${colors.name}`}>
            {persona.name}
          </span>
          {addressedPersona && (
            <span className="text-xs text-muted-foreground">
              → {addressedPersona.emoji} {addressedPersona.name}
            </span>
          )}
        </div>
        <div
          className={`border-l-4 ${colors.border} ${colors.bg} rounded-2xl rounded-tl-sm px-4 py-2`}
        >
          <Markdown className="text-sm prose-sm prose-invert max-w-none">
            {response.content}
          </Markdown>
        </div>
      </div>
    </div>
  )
}
