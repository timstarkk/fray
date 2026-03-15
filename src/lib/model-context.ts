const DEFAULT_CONTEXT_LENGTH = 4096

export async function getContextLength(
  modelId: string
): Promise<number> {
  const slashIdx = modelId.indexOf("/")
  if (slashIdx === -1) {
    return getOllamaContextLength(modelId)
  }

  const provider = modelId.slice(0, slashIdx)
  const modelName = modelId.slice(slashIdx + 1)

  if (provider === "local") {
    return getOllamaContextLength(modelName)
  }

  if (provider === "openrouter") {
    return getOpenRouterContextLength(modelName)
  }

  return DEFAULT_CONTEXT_LENGTH
}

async function getOllamaContextLength(modelName: string): Promise<number> {
  try {
    const baseURL = process.env.OLLAMA_HOST || "http://localhost:11434"
    const res = await fetch(`${baseURL}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName }),
    })
    if (!res.ok) return DEFAULT_CONTEXT_LENGTH
    const data = await res.json()
    const contextLength =
      data.model_info?.["general.context_length"] ??
      data.model_info?.context_length
    if (typeof contextLength === "number" && contextLength > 0) {
      return contextLength
    }
    return DEFAULT_CONTEXT_LENGTH
  } catch {
    return DEFAULT_CONTEXT_LENGTH
  }
}

async function getOpenRouterContextLength(modelName: string): Promise<number> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models")
    if (!res.ok) return DEFAULT_CONTEXT_LENGTH
    const data = await res.json()
    const model = data.data?.find(
      (m: { id: string; context_length?: number }) => m.id === modelName
    )
    if (model?.context_length) {
      return model.context_length
    }
    return DEFAULT_CONTEXT_LENGTH
  } catch {
    return DEFAULT_CONTEXT_LENGTH
  }
}
