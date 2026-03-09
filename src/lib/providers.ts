import { ollama } from "ai-sdk-ollama"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

/**
 * Takes a model string like "local/qwen3:32b" or "openrouter/meta-llama/llama-3-70b"
 * and returns the correct AI SDK provider instance.
 */
export function getModel(modelId: string, openRouterKey?: string): LanguageModel {
  const slashIdx = modelId.indexOf("/")
  if (slashIdx === -1) {
    // Bare model name — treat as local Ollama
    return ollama(modelId)
  }

  const provider = modelId.slice(0, slashIdx)
  const modelName = modelId.slice(slashIdx + 1)

  if (provider === "local") {
    return ollama(modelName)
  }

  if (provider === "openrouter") {
    if (!openRouterKey) {
      throw new Error("OpenRouter API key required for cloud models")
    }
    const openrouter = createOpenRouter({ apiKey: openRouterKey })
    return openrouter(modelName)
  }

  throw new Error(`Unknown provider: ${provider}`)
}
