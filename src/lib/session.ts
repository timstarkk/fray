import { cookies } from "next/headers"
import { getCurrentUser } from "aws-amplify/auth/server"
import { runWithAmplifyServerContext } from "@/lib/amplify-server"
import { prisma } from "@/lib/db"

export async function getAuthUser() {
  const currentUser = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (contextSpec) => getCurrentUser(contextSpec),
  })

  return currentUser
}

export async function getDbUser() {
  const authUser = await getAuthUser()

  const user = await prisma.user.findUnique({
    where: { cognitoSub: authUser.userId },
  })

  if (!user) {
    throw new Error("User not found in database")
  }

  return user
}
