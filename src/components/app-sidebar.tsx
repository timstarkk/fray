"use client"

import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XIcon, PlusIcon, LoaderIcon, PencilIcon } from "lucide-react"
import { type Persona } from "@/lib/personas"

type AppSidebarProps = {
  personas: Persona[]
  activeCount: number
  model: string
  onToggle: (id: string) => void
  onAdd: (persona: {
    name: string
    emoji: string
    role: string
    systemPrompt: string
  }) => void
  onUpdate: (
    id: string,
    updates: { name?: string; emoji?: string; role?: string; systemPrompt?: string }
  ) => void
  onRemove: (id: string) => void
}

const WORD_THRESHOLD = 20

type PendingPersona = {
  id: string
  name: string
}

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; persona: Persona }

export function AppSidebar({
  personas,
  activeCount,
  model,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
}: AppSidebarProps) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState<PendingPersona[]>([])

  const defaultPersonas = personas.filter((p) => !p.custom)
  const customPersonas = personas.filter((p) => p.custom)

  const openCreate = () => {
    setName("")
    setDescription("")
    setModal({ mode: "create" })
  }

  const openEdit = (persona: Persona) => {
    setName(persona.name)
    setDescription(persona.systemPrompt)
    setModal({ mode: "edit", persona })
  }

  const closeModal = () => {
    setModal({ mode: "closed" })
    setName("")
    setDescription("")
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName) return

    const pendingId = `pending-${Date.now()}`
    setPending((prev) => [...prev, { id: pendingId, name: trimmedName }])
    closeModal()

    const totalWords = `${trimmedName} ${trimmedDesc}`.split(/\s+/).length
    const needsExpansion = totalWords < WORD_THRESHOLD

    if (needsExpansion) {
      try {
        const res = await fetch("/api/expand-persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            description: trimmedDesc,
            model,
          }),
        })
        const expanded = await res.json()
        onAdd({
          name: trimmedName,
          emoji: expanded.emoji || "🤖",
          role: expanded.role || "Custom",
          systemPrompt: expanded.systemPrompt || trimmedDesc || trimmedName,
        })
      } catch {
        onAdd({
          name: trimmedName,
          emoji: "🤖",
          role: "Custom",
          systemPrompt: trimmedDesc || trimmedName,
        })
      }
    } else {
      onAdd({
        name: trimmedName,
        emoji: "🤖",
        role: "Custom",
        systemPrompt: trimmedDesc,
      })
    }

    setPending((prev) => prev.filter((p) => p.id !== pendingId))
  }

  const handleSaveEdit = () => {
    if (modal.mode !== "edit") return
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName) return

    onUpdate(modal.persona.id, {
      name: trimmedName,
      systemPrompt: trimmedDesc,
    })
    closeModal()
  }

  const isOpen = modal.mode !== "closed"
  const isEdit = modal.mode === "edit"

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Brainstorm Room</h2>
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Personas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {defaultPersonas.map((persona) => (
                  <PersonaRow
                    key={persona.id}
                    persona={persona}
                    onToggle={onToggle}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(customPersonas.length > 0 || pending.length > 0) && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Custom</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {customPersonas.map((persona) => (
                      <PersonaRow
                        key={persona.id}
                        persona={persona}
                        onToggle={onToggle}
                        onRemove={onRemove}
                        onEdit={() => openEdit(persona)}
                      />
                    ))}
                    {pending.map((p) => (
                      <SidebarMenuItem key={p.id}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <LoaderIcon className="size-4 animate-spin text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Generating persona...
                            </p>
                          </div>
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter className="p-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={openCreate}
          >
            <PlusIcon className="size-4 mr-1" />
            Create persona
          </Button>
        </SidebarFooter>
      </Sidebar>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-card border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">
              {isEdit ? "Edit persona" : "Create persona"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isEdit
                ? "Edit the name and system prompt for this persona."
                : "Short names get auto-expanded by AI into full personalities."}
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  placeholder="e.g. Gandalf the Gray, A salty VC, Elon Musk"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {isEdit ? "System prompt" : "Description"}{" "}
                  {!isEdit && (
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  )}
                </label>
                <textarea
                  placeholder={
                    isEdit
                      ? "The system prompt that defines this persona's personality and behavior."
                      : "Personality, expertise, how they give feedback... leave blank for AI to figure it out from the name."
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={isEdit ? 8 : 3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={isEdit ? handleSaveEdit : handleCreate}
                  disabled={!name.trim()}
                >
                  {isEdit ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PersonaRow({
  persona,
  onToggle,
  onRemove,
  onEdit,
}: {
  persona: Persona
  onToggle: (id: string) => void
  onRemove?: (id: string) => void
  onEdit?: () => void
}) {
  return (
    <SidebarMenuItem>
      <div className="flex items-center justify-between px-2 py-1.5 w-full group">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{persona.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{persona.name}</p>
            <p className="text-xs text-muted-foreground">{persona.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              <PencilIcon className="size-3" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(persona.id)}
            >
              <XIcon className="size-3" />
            </Button>
          )}
          <Switch
            checked={persona.active}
            onCheckedChange={() => onToggle(persona.id)}
          />
        </div>
      </div>
    </SidebarMenuItem>
  )
}
