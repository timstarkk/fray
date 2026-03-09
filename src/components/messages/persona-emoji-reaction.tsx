import { type Persona } from "@/lib/personas"
import { getPersonaColors } from "@/lib/colors"

type PersonaEmojiReactionProps = {
  persona: Persona
  content: string
}

export function PersonaEmojiReaction({
  persona,
  content,
}: PersonaEmojiReactionProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${colors.badge}`}
    >
      <span className="text-xs">{persona.emoji}</span>
      <span className="text-lg leading-none">{content}</span>
    </span>
  )
}
