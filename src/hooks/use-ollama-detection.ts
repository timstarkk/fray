"use client"

import { useState, useEffect, useCallback } from "react"
import type { ModelInfo } from "@/app/api/models/route"

export function useOllamaDetection() {
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [localModels, setLocalModels] = useState<ModelInfo[]>([])

  const check = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:11434/api/tags")
      const data = await res.json()
      const models: ModelInfo[] = (data.models || []).map(
        (m: { name: string }) => ({
          id: `local/${m.name}`,
          name: formatModelName(m.name),
          provider: "local" as const,
        })
      )
      setOllamaAvailable(true)
      setLocalModels(models)
    } catch {
      setOllamaAvailable(false)
      setLocalModels([])
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return { ollamaAvailable, localModels, recheckOllama: check }
}

function formatModelName(name: string): string {
  return name
    .replace(/:latest$/, "")
    .replace(/:/, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
