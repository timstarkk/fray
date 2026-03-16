export type PersonaColorSet = {
  bubble: string
  name: string
  accent: string
  badge: string
}

const colorMap: Record<string, PersonaColorSet> = {
  red: {
    bubble: "bg-white/[0.04]",
    name: "text-red-400",
    accent: "text-red-400/60",
    badge: "bg-white/[0.06]",
  },
  blue: {
    bubble: "bg-white/[0.04]",
    name: "text-blue-400",
    accent: "text-blue-400/60",
    badge: "bg-white/[0.06]",
  },
  emerald: {
    bubble: "bg-white/[0.04]",
    name: "text-emerald-400",
    accent: "text-emerald-400/60",
    badge: "bg-white/[0.06]",
  },
  purple: {
    bubble: "bg-white/[0.04]",
    name: "text-purple-400",
    accent: "text-purple-400/60",
    badge: "bg-white/[0.06]",
  },
  amber: {
    bubble: "bg-white/[0.04]",
    name: "text-amber-400",
    accent: "text-amber-400/60",
    badge: "bg-white/[0.06]",
  },
  slate: {
    bubble: "bg-white/[0.04]",
    name: "text-slate-400",
    accent: "text-slate-400/60",
    badge: "bg-white/[0.06]",
  },
}

const fallback = colorMap.slate

export function getPersonaColors(color: string): PersonaColorSet {
  return colorMap[color] ?? fallback
}
