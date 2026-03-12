"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { type Persona } from "@/lib/personas"

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load personas from API on mount
  useEffect(() => {
    fetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        setPersonas(
          data.map((p: Persona, i: number) => ({
            ...p,
            active: i < 3,
          }))
        )
        setLoaded(true)
      })
      .catch((err) => {
        console.error("Failed to load personas:", err)
        setLoaded(true)
      })
  }, [])

  const togglePersona = useCallback((id: string) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    )
  }, [])

  const addPersona = useCallback(
    async (persona: {
      name: string
      emoji: string
      role: string
      systemPrompt: string
      canSearch?: boolean
    }) => {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...persona, color: "slate" }),
      })
      if (!res.ok) throw new Error("Failed to create persona")
      const created = await res.json()
      setPersonas((prev) => [...prev, { ...created, active: true }])
    },
    []
  )

  const updatePersona = useCallback(
    async (
      id: string,
      updates: {
        name?: string
        emoji?: string
        role?: string
        systemPrompt?: string
        canSearch?: boolean
      }
    ) => {
      const res = await fetch(`/api/personas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Failed to update persona")
      setPersonas((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      )
    },
    []
  )

  const removePersona = useCallback(async (id: string) => {
    await fetch(`/api/personas/${id}`, { method: "DELETE" })
    setPersonas((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const setActivePersonaIds = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setPersonas((prev) =>
      prev.map((p) => ({ ...p, active: idSet.has(p.id) }))
    )
  }, [])

  const activePersonas = useMemo(
    () => personas.filter((p) => p.active),
    [personas]
  )

  return {
    personas,
    activePersonas,
    loaded,
    togglePersona,
    addPersona,
    updatePersona,
    removePersona,
    setActivePersonaIds,
  }
}
