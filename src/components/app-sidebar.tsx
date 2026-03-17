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
import {
  PlusIcon,
  LoaderIcon,
  PencilIcon,
  MessageSquareIcon,
  TrashIcon,
  ChevronRightIcon,
} from "lucide-react"
import { type Persona } from "@/lib/personas"
import { type ConversationSummary } from "@/lib/chat-types"

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
    canSearch?: boolean
  }) => Promise<void>
  onUpdate: (
    id: string,
    updates: { name?: string; emoji?: string; role?: string; systemPrompt?: string; canSearch?: boolean }
  ) => Promise<void>
  onRemove: (id: string) => void
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
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

function getDateGroup(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  if (then >= today) return "Today"
  if (then >= yesterday) return "Yesterday"
  return "Earlier"
}

function groupConversationsByDate(conversations: ConversationSummary[]): { label: string; items: ConversationSummary[] }[] {
  const groups: Map<string, ConversationSummary[]> = new Map()
  const order = ["Today", "Yesterday", "Earlier"]

  for (const conv of conversations) {
    const label = getDateGroup(conv.createdAt)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(conv)
  }

  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }))
}

export function AppSidebar({
  personas,
  activeCount,
  model,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: AppSidebarProps) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState<PendingPersona[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeletePersonaId, setConfirmDeletePersonaId] = useState<string | null>(null)
  const [personasManualToggle, setPersonasManualToggle] = useState<boolean | null>(null)

  const defaultPersonas = personas.filter((p) => p.isDefault)
  const customPersonas = personas.filter((p) => !p.isDefault)
  const activePersonas = personas.filter((p) => p.active)

  // Auto-collapse when there are 8+ total personas, but user can always override
  const personasExpanded = personasManualToggle ?? personas.length < 8
  const setPersonasExpanded = (v: boolean) => setPersonasManualToggle(v)

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
        if (!res.ok) throw new Error("Expansion failed")
        const expanded = await res.json()
        await onAdd({
          name: trimmedName,
          emoji: expanded.emoji || "🤖",
          role: expanded.role || "Custom",
          systemPrompt: expanded.systemPrompt || trimmedDesc || trimmedName,
        })
      } catch {
        await onAdd({
          name: trimmedName,
          emoji: "🤖",
          role: "Custom",
          systemPrompt: trimmedDesc || trimmedName,
        })
      }
    } else {
      await onAdd({
        name: trimmedName,
        emoji: "🤖",
        role: "Custom",
        systemPrompt: trimmedDesc,
      })
    }

    setPending((prev) => prev.filter((p) => p.id !== pendingId))
  }

  const handleSaveEdit = async () => {
    if (modal.mode !== "edit") return
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName) return

    await onUpdate(modal.persona.id, {
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
            <h2 className="text-lg font-semibold">Fray</h2>
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex flex-col overflow-hidden">
          {/* Personas section — collapsible */}
          <div className="shrink-0">
            <SidebarGroup>
              <SidebarGroupLabel
                className="flex items-center justify-between cursor-pointer !text-sm !font-semibold !text-foreground"
                onClick={() => setPersonasExpanded(!personasExpanded)}
              >
                <div className="flex items-center gap-1.5">
                  <ChevronRightIcon className={`size-3.5 transition-transform ${personasExpanded ? "rotate-90" : ""}`} />
                  <span>Personas</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCreate()
                  }}
                >
                  <PlusIcon className="size-3 mr-0.5" />
                  New
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {personasExpanded ? (
                  <>
                    <SidebarMenu className="gap-1.5">
                      {defaultPersonas.map((persona) => (
                        <PersonaRow
                          key={persona.id}
                          persona={persona}
                          onToggle={onToggle}
                        />
                      ))}
                    </SidebarMenu>
                    {(customPersonas.length > 0 || pending.length > 0) && (
                      <>
                        <div className="flex items-center gap-2 px-1 pt-3 pb-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Custom</p>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                        <SidebarMenu className="gap-1.5">
                          {customPersonas.map((persona) => (
                            <PersonaRow
                              key={persona.id}
                              persona={persona}
                              onToggle={onToggle}
                              onRemove={() => setConfirmDeletePersonaId(persona.id)}
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
                      </>
                    )}
                  </>
                ) : (
                  <div
                    className="flex flex-wrap gap-1.5 px-3 py-1.5 cursor-pointer"
                    onClick={() => setPersonasExpanded(true)}
                  >
                    {activePersonas.length > 0 ? (
                      activePersonas.map((p) => (
                        <span
                          key={p.id}
                          className="text-sm"
                          title={p.name}
                        >
                          {p.emoji}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No active personas</p>
                    )}
                    {activePersonas.length > 0 && (
                      <span className="text-xs text-muted-foreground self-center ml-0.5">
                        {activePersonas.length} active
                      </span>
                    )}
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />
          </div>

          {/* Conversations section — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between !text-sm !font-semibold !text-foreground">
                <span>Conversations</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs"
                  onClick={onNewChat}
                >
                  <PlusIcon className="size-3 mr-0.5" />
                  New
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {conversations.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground">
                    No conversations yet
                  </p>
                ) : (
                  groupConversationsByDate(conversations).map((group) => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{group.label}</p>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                      <SidebarMenu>
                        {group.items.map((conv) => (
                          <SidebarMenuItem key={conv.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectConversation(conv.id)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectConversation(conv.id) }}
                              className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-left group transition-colors cursor-pointer ${
                                conv.id === activeConversationId
                                  ? "bg-secondary"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              <p className="text-sm truncate min-w-0">{conv.title}</p>
                              <button
                                className="size-6 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDeleteId(conv.id)
                                }}
                              >
                                <TrashIcon className="size-3" />
                              </button>
                            </div>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </div>
                  ))
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </SidebarContent>

      </Sidebar>

      {confirmDeletePersonaId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setConfirmDeletePersonaId(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-card border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">Delete persona?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete this custom persona.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeletePersonaId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onRemove(confirmDeletePersonaId)
                  setConfirmDeletePersonaId(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-card border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">Delete conversation?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete this conversation and all its messages.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDeleteConversation(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

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
  onRemove?: () => void
  onEdit?: () => void
}) {
  return (
    <SidebarMenuItem>
      <div className={`flex items-center justify-between w-full group rounded-lg border px-3 py-2.5 transition-colors ${
        persona.active ? "border-white/10 bg-white/[0.03]" : "border-transparent bg-transparent"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{persona.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{persona.name}</p>
            <p className="text-xs text-muted-foreground">{persona.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onEdit && (
            <button
              className="size-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
              onClick={onEdit}
            >
              <PencilIcon className="size-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              className="size-7 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              onClick={onRemove}
            >
              <TrashIcon className="size-3.5" />
            </button>
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
