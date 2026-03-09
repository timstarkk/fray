import { type Persona } from "@/lib/personas"
import { getPersonaColors } from "@/lib/colors"
import { TypingLoader } from "@/components/ui/loader"

type PersonaThinkingProps = {
  persona: Persona
}

export function PersonaThinking({ persona }: PersonaThinkingProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <div className="flex items-center gap-2 pl-2">
      <span className="text-sm">{persona.emoji}</span>
      <span className={`text-xs font-medium ${colors.name}`}>
        {persona.name}
      </span>
      <TypingLoader size="sm" />
    </div>
  )
}
