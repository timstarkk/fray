import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { encrypt } from "@/lib/encryption"

export async function GET() {
  try {
    const user = await getDbUser()

    const apiKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
      select: { provider: true },
    })

    return Response.json({
      provider: "openrouter",
      hasKey: !!apiKey,
    })
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getDbUser()
    const { key } = await req.json()

    if (!key || typeof key !== "string" || key.trim().length === 0) {
      return Response.json({ error: "Invalid key" }, { status: 400 })
    }

    const encryptedKey = encrypt(key.trim())

    await prisma.apiKey.upsert({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
      create: {
        userId: user.id,
        provider: "openrouter",
        encryptedKey,
      },
      update: {
        encryptedKey,
      },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE() {
  try {
    const user = await getDbUser()

    await prisma.apiKey.deleteMany({
      where: { userId: user.id, provider: "openrouter" },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
}
