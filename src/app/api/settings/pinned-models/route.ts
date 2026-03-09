import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const user = await getDbUser()
    return Response.json({ pinnedModels: user.pinnedModels })
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getDbUser()
    const { pinnedModels } = await req.json()

    if (!Array.isArray(pinnedModels)) {
      return Response.json({ error: "pinnedModels must be an array" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinnedModels },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
}
