export type PersonaColorSet = {
  bg: string
  border: string
  name: string
  badge: string
}

const colorMap: Record<string, PersonaColorSet> = {
  red: {
    bg: "bg-red-950/20",
    border: "border-l-red-500",
    name: "text-red-400",
    badge: "bg-red-900/40",
  },
  blue: {
    bg: "bg-blue-950/20",
    border: "border-l-blue-500",
    name: "text-blue-400",
    badge: "bg-blue-900/40",
  },
  emerald: {
    bg: "bg-emerald-950/20",
    border: "border-l-emerald-500",
    name: "text-emerald-400",
    badge: "bg-emerald-900/40",
  },
  purple: {
    bg: "bg-purple-950/20",
    border: "border-l-purple-500",
    name: "text-purple-400",
    badge: "bg-purple-900/40",
  },
  amber: {
    bg: "bg-amber-950/20",
    border: "border-l-amber-500",
    name: "text-amber-400",
    badge: "bg-amber-900/40",
  },
  slate: {
    bg: "bg-slate-950/20",
    border: "border-l-slate-500",
    name: "text-slate-400",
    badge: "bg-slate-900/40",
  },
}

const fallback = colorMap.slate

export function getPersonaColors(color: string): PersonaColorSet {
  return colorMap[color] ?? fallback
}
