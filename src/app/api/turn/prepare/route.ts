import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { fetchAllUrls } from "@/lib/tools/url-fetch"

function generateTitle(text: string): string {
  if (text.length <= 50) return text
  const truncated = text.substring(0, 47)
  const lastSpace = truncated.lastIndexOf(" ")
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + "..."
}

export async function POST(req: Request) {
  let body: {
    userMessage: string
    conversationId?: string
    personaIds: string[]
    model: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { userMessage, conversationId, personaIds, model } = body

  if (!userMessage || !personaIds?.length) {
    return Response.json({ error: "Missing userMessage or personaIds" }, { status: 400 })
  }

  // Auth
  let user
  try {
    user = await getDbUser()
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Validate personas exist
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
  })
  if (personas.length === 0) {
    return Response.json({ error: "No valid personas found" }, { status: 400 })
  }

  // Create conversation if needed
  let convId = conversationId
  if (!convId) {
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: generateTitle(userMessage),
        model: model || "local/qwen3:32b",
        personas: {
          create: personaIds.map((personaId) => ({ personaId })),
        },
      },
    })
    convId = conversation.id
  }

  // Persist user message
  await prisma.message.create({
    data: {
      conversationId: convId,
      content: userMessage,
      personaId: null,
      responseType: null,
    },
  })

  // Fetch any URLs in the user message
  const fetchedPages = await fetchAllUrls(userMessage)
  let urlContent: string | null = null
  if (fetchedPages.length > 0) {
    urlContent = fetchedPages
      .map((p) => `[PAGE CONTENT from ${p.url}:\n${p.content}]`)
      .join("\n\n")
    console.log(`[prepare] fetched ${fetchedPages.length} URL(s) from user message`)
  }

  // Load full message history from DB (includes the user message we just wrote)
  const messages = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
  })

  return Response.json({
    conversationId: convId,
    messages,
    urlContent,
  })
}
