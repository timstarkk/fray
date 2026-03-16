import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function GET() {
  const user = await getDbUser()

  const personas = await prisma.persona.findMany({
    where: {
      OR: [{ isDefault: true }, { userId: user.id }],
    },
    orderBy: { createdAt: "asc" },
  })

  // Sort defaults to desired order, user-created personas come after
  const defaultOrder = ["pragmatist", "optimist", "devils-advocate", "researcher", "editor"]
  personas.sort((a, b) => {
    const aIdx = defaultOrder.indexOf(a.id)
    const bIdx = defaultOrder.indexOf(b.id)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return 0
  })

  return Response.json(personas)
}

export async function POST(req: Request) {
  const user = await getDbUser()
  const { name, emoji, color, role, systemPrompt, canSearch } = await req.json()

  const persona = await prisma.persona.create({
    data: {
      userId: user.id,
      name,
      emoji: emoji || "🤖",
      color: color || "slate",
      role: role || "Custom",
      systemPrompt: systemPrompt || name,
      isDefault: false,
      canSearch: canSearch || false,
    },
  })

  return Response.json(persona)
}
