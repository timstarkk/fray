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
      const rawModels = data.models || []

      const models: ModelInfo[] = await Promise.all(
        rawModels.map(async (m: { name: string }) => {
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
