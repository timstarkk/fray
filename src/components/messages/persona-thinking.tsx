import { type Persona } from "@/lib/personas"
import { getPersonaColors } from "@/lib/colors"
import { TypingLoader } from "@/components/ui/loader"

type PersonaThinkingProps = {
  persona: Persona
}

export function PersonaThinking({ persona }: PersonaThinkingProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <div className="flex gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
        <span className="text-base leading-none">{persona.emoji}</span>
      </div>
      <div>
        <span className={`text-sm font-semibold ${colors.name}`}>
          {persona.name}
        </span>
        <div className={`${colors.bubble} rounded-2xl rounded-tl-md px-4 py-2.5 mt-1`}>
          <TypingLoader size="sm" />
        </div>
      </div>
    </div>
  )
}
