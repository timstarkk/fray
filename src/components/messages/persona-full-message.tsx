import { type Persona } from "@/lib/personas"
import { type PersonaResponse } from "@/lib/schema"
import { getPersonaColors } from "@/lib/colors"
import { Markdown } from "@/components/ui/markdown"

type Reaction = {
  persona: Persona
  content: string
}

type PersonaFullMessageProps = {
  persona: Persona
  response: PersonaResponse
  addressedPersona?: Persona | null
  reactions?: Reaction[]
}

export function PersonaFullMessage({
  persona,
  response,
  addressedPersona,
  reactions,
}: PersonaFullMessageProps) {
  const colors = getPersonaColors(persona.color)

  return (
    <div className="flex gap-2.5 max-w-[75%]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary mt-1">
        <span className="text-base leading-none">{persona.emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-sm font-semibold ${colors.name}`}>
            {persona.name}
          </span>
          {addressedPersona && (
            <span className="text-xs text-muted-foreground">
              replying to {addressedPersona.emoji} {addressedPersona.name}
            </span>
          )}
        </div>
        <div className={`${colors.bubble} rounded-2xl rounded-tl-md px-4 py-3`}>
          <Markdown className="text-[15px] leading-relaxed prose-invert max-w-none">
            {response.content}
          </Markdown>
        </div>
        {reactions && reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-1">
            {reactions.map((r, i) => {
              const rColors = getPersonaColors(r.persona.color)
              return (
                <span
                  key={i}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 ${rColors.badge} cursor-default`}
                  title={`${r.persona.emoji} ${r.persona.name}`}
                >
                  <span className="text-sm leading-none">{r.content}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
