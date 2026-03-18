import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  let body: {
    conversationId: string
    personaId: string | null
    content: string
    responseType: string
    addressedTo?: string | null
    addressedPersonaId?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { conversationId, personaId, content, responseType, addressedTo, addressedPersonaId } = body

  if (!conversationId || !content || !responseType) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Auth
  let user
  try {
    user = await getDbUser()
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Verify conversation belongs to user
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  })

  if (!conversation || conversation.userId !== user.id) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  // Summary messages: replace existing summary
  if (responseType === "summary") {
    // Delete existing summary for this conversation
    await prisma.message.deleteMany({
      where: {
        conversationId,
        responseType: "summary",
      },
    })

    const message = await prisma.message.create({
      data: {
        conversationId,
        personaId: null,
        content,
        responseType: "summary",
      },
    })

    return Response.json({ ok: true, messageId: message.id })
  }

  // Regular message
  const message = await prisma.message.create({
    data: {
      conversationId,
      personaId: personaId || null,
      content,
      responseType,
      addressedTo: addressedTo || null,
      addressedPersonaId: addressedPersonaId || null,
    },
  })

  return Response.json({ ok: true, messageId: message.id })
}
