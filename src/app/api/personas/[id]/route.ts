import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getDbUser()
  const { id } = await params

  const persona = await prisma.persona.findUnique({ where: { id } })
  if (!persona || persona.userId !== user.id) {
    return Response.json({ error: "Not found or not owned" }, { status: 403 })
  }

  const updates = await req.json()
  // Only allow updating safe fields
  const { name, emoji, role, systemPrompt } = updates
  const updated = await prisma.persona.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(emoji !== undefined && { emoji }),
      ...(role !== undefined && { role }),
      ...(systemPrompt !== undefined && { systemPrompt }),
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getDbUser()
  const { id } = await params

  const persona = await prisma.persona.findUnique({ where: { id } })
  if (!persona || persona.userId !== user.id) {
    return Response.json({ error: "Not found or not owned" }, { status: 403 })
  }

  await prisma.persona.delete({ where: { id } })
  return Response.json({ ok: true })
}
