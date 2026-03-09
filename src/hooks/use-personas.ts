"use client"

import { useState, useMemo, useCallback } from "react"
import { type Persona, DEFAULT_PERSONAS } from "@/lib/personas"

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>(() =>
    DEFAULT_PERSONAS.map((p, i) => ({
      ...p,
      active: i < 3,
      custom: false,
    }))
  )

  const togglePersona = useCallback((id: string) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    )
  }, [])

  const addPersona = useCallback(
    (persona: {
      name: string
      emoji: string
      role: string
      systemPrompt: string
    }) => {
      const id = `custom-${Date.now()}`
      const newPersona: Persona = {
        id,
        name: persona.name,
        emoji: persona.emoji,
        color: "slate",
        role: persona.role,
        systemPrompt: persona.systemPrompt,
        active: true,
        custom: true,
      }
      setPersonas((prev) => [...prev, newPersona])
    },
    []
  )

  const updatePersona = useCallback(
    (
      id: string,
      updates: { name?: string; emoji?: string; role?: string; systemPrompt?: string }
    ) => {
      setPersonas((prev) =>
        prev.map((p) => (p.id === id && p.custom ? { ...p, ...updates } : p))
      )
    },
    []
  )

  const removePersona = useCallback((id: string) => {
    setPersonas((prev) => prev.filter((p) => !(p.id === id && p.custom)))
  }, [])

  const activePersonas = useMemo(
    () => personas.filter((p) => p.active),
    [personas]
  )

  return {
    personas,
    activePersonas,
    togglePersona,
    addPersona,
    updatePersona,
    removePersona,
  }
}
