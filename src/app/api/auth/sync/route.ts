import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const authUser = await getAuthUser()

    await prisma.user.upsert({
      where: { cognitoSub: authUser.userId },
      update: {},
      create: {
        cognitoSub: authUser.userId,
        email: authUser.signInDetails?.loginId || "",
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
}
