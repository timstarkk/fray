import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function GET() {
  const user = await getDbUser()

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
    },
  })

  return Response.json(conversations)
}

export async function POST(req: Request) {
  const user = await getDbUser()
  const { title, model, personaIds } = await req.json()

  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title: title || "New Conversation",
      model: model || "local/qwen3:32b",
      personas: {
        create: (personaIds as string[]).map((personaId) => ({ personaId })),
      },
    },
  })

  return Response.json(conversation)
}
