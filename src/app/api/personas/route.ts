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
