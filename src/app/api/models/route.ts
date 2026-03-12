import { getDbUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export type ModelInfo = {
  id: string
  name: string
  provider: "local" | "openrouter"
  pricing?: { prompt: number; completion: number }
  supportsTools?: boolean
}

export async function GET() {
  const local = await getLocalModels()
  const cloud = await getCloudModels()

  return Response.json({ local, cloud })
}

async function getLocalModels(): Promise<ModelInfo[]> {
  try {
    const res = await fetch("http://localhost:11434/api/tags")
    const data = await res.json()
    const models = data.models || []

    // Fetch capabilities for each model via /api/show
    const results = await Promise.all(
      models.map(async (m: { name: string }) => {
        let supportsTools = false
        try {
          const showRes = await fetch("http://localhost:11434/api/show", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: m.name }),
          })
          const showData = await showRes.json()
          supportsTools = Array.isArray(showData.capabilities) && showData.capabilities.includes("tools")
        } catch {}
        return {
          id: `local/${m.name}`,
          name: formatModelName(m.name),
          provider: "local" as const,
          supportsTools,
        }
      })
    )

    return results
  } catch {
    return []
  }
}

async function getCloudModels(): Promise<ModelInfo[]> {
  try {
    const user = await getDbUser()
    const apiKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId: user.id, provider: "openrouter" } },
    })

    if (!apiKey) return []

    const key = decrypt(apiKey.encryptedKey)
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    })
    const data = await res.json()

    return (data.data || []).map(
      (m: {
        id: string
        name: string
        pricing?: { prompt: string; completion: string }
        supported_parameters?: string[]
      }) => ({
        id: `openrouter/${m.id}`,
        name: m.name,
        provider: "openrouter" as const,
        pricing: m.pricing
          ? {
              prompt: parseFloat(m.pricing.prompt) * 1_000_000,
              completion: parseFloat(m.pricing.completion) * 1_000_000,
            }
          : undefined,
        supportsTools: Array.isArray(m.supported_parameters) && m.supported_parameters.includes("tools"),
      })
    )
  } catch {
    return []
  }
}

function formatModelName(name: string): string {
  // "qwen3:32b" → "Qwen3 32B"
  return name
    .replace(/:latest$/, "")
    .replace(/:/, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
