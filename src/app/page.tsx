"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatArea } from "@/components/chat-area"
import { ModelBrowser } from "@/components/model-browser"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { usePersonas } from "@/hooks/use-personas"
import { useChatSession } from "@/hooks/use-chat-session"
import { useOllamaDetection } from "@/hooks/use-ollama-detection"
import { signOut } from "aws-amplify/auth"
import { useRouter } from "next/navigation"
import type { ModelInfo } from "@/app/api/models/route"
import type { ConversationSummary } from "@/lib/chat-types"

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const router = useRouter()
  const {
    personas,
    activePersonas,
    loaded: personasLoaded,
    togglePersona,
    addPersona,
    updatePersona,
    removePersona,
    setActivePersonaIds,
  } = usePersonas()

  // Model state — restore from localStorage
  const [model, setModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fray-model") || "local/qwen3:32b"
    }
    return "local/qwen3:32b"
  })
  useEffect(() => {
    localStorage.setItem("fray-model", model)
  }, [model])

  // Web search toggle — restore from localStorage
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fray-web-search") === "true"
    }
    return false
  })
  useEffect(() => {
    localStorage.setItem("fray-web-search", String(webSearchEnabled))
  }, [webSearchEnabled])
  const [pinnedModelIds, setPinnedModelIds] = useState<string[]>([])
  const [cloudModels, setCloudModels] = useState<ModelInfo[]>([])
  const [hasApiKey, setHasApiKey] = useState(false)
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false)
  const [pinnedLoaded, setPinnedLoaded] = useState(false)
  const autoPinnedRef = useRef(false)

  // Conversation state — restore active conversation from localStorage
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fray-conversation")
    }
    return null
  })
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem("fray-conversation", conversationId)
    } else {
      localStorage.removeItem("fray-conversation")
    }
  }, [conversationId])

  const { localModels } = useOllamaDetection()

  const handleConversationCreated = useCallback(
    (id: string) => {
      setConversationId(id)
    },
    []
  )

  const handleConversationLoaded = useCallback(
    (personaIds: string[], convModel: string) => {
      setActivePersonaIds(personaIds)
      setModel(convModel)
    },
    [setActivePersonaIds]
  )

  const { messages, pendingPersonas, pendingConversationId, isLoading, isSearching, messagesLoading, sendMessage, clearChat } =
    useChatSession(
      activePersonas,
      model,
      conversationId,
      handleConversationCreated,
      handleConversationLoaded,
      webSearchEnabled
    )

  // Update conversation title in sidebar when first message is sent
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user" && conversationId) {
      const firstMsg = messages[0].content
      const title =
        firstMsg.length > 50
          ? firstMsg.substring(0, 47) + "..."
          : firstMsg
      setConversations((prev) => {
        // Add if not present (just created), or update title
        const exists = prev.some((c) => c.id === conversationId)
        if (!exists) {
          return [
            { id: conversationId, title, model, createdAt: new Date().toISOString() },
            ...prev,
          ]
        }
        return prev.map((c) =>
          c.id === conversationId ? { ...c, title } : c
        )
      })
    }
  }, [messages, conversationId, model])

  // Load conversations list on mount
  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setConversations(data)
        }
      })
      .catch(() => {})
  }, [])

  // Load pinned models and API key status on mount
  useEffect(() => {
    fetch("/api/settings/pinned-models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.pinnedModels)) {
          setPinnedModelIds(data.pinnedModels)
        }
      })
      .catch(() => {})
      .finally(() => setPinnedLoaded(true))

    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((data) => setHasApiKey(data.hasKey === true))
      .catch(() => {})
  }, [])

  // Auto-pin local models on first detection if user has no pins
  useEffect(() => {
    if (!pinnedLoaded) return
    if (autoPinnedRef.current) return
    if (localModels.length === 0) return
    if (pinnedModelIds.length > 0) return

    autoPinnedRef.current = true
    const localIds = localModels.map((m) => m.id)
    setPinnedModelIds(localIds)
    savePinnedModels(localIds)

    if (localIds.length > 0) {
      setModel(localIds[0])
    }
  }, [localModels, pinnedModelIds, pinnedLoaded])

  // Fetch cloud models when API key exists
  const fetchCloudModels = useCallback(async () => {
    if (!hasApiKey) {
      setCloudModels([])
      return
    }
    setLoadingCloud(true)
    try {
      const res = await fetch("/api/models")
      const data = await res.json()
      setCloudModels(data.cloud || [])
    } catch {
      setCloudModels([])
    }
    setLoadingCloud(false)
  }, [hasApiKey])

  useEffect(() => {
    fetchCloudModels()
  }, [fetchCloudModels])

  // Build the list of pinned ModelInfo objects for the quick menu
  const allModels = [...localModels, ...cloudModels]
  const modelMap = new Map(allModels.map((m) => [m.id, m]))
  const pinnedModels = pinnedModelIds
    .map((id) => modelMap.get(id))
    .filter((m): m is ModelInfo => m !== undefined)


  // If current local model isn't available, fall back to first pinned.
  // Cloud models load async so never auto-switch away from them.
  useEffect(() => {
    if (model.startsWith("openrouter/")) return
    if (pinnedModels.length > 0 && !modelMap.has(model)) {
      setModel(pinnedModels[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedModels.length])

  const savePinnedModels = async (ids: string[]) => {
    await fetch("/api/settings/pinned-models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinnedModels: ids }),
    }).catch(() => {})
  }

  const handleTogglePin = (modelId: string) => {
    setPinnedModelIds((prev) => {
      const next = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
      savePinnedModels(next)
      return next
    })
  }

  const handleSaveApiKey = async (key: string) => {
    await fetch("/api/settings/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    })
    setHasApiKey(true)
  }

  const handleDeleteApiKey = async () => {
    await fetch("/api/settings/api-key", { method: "DELETE" })
    setHasApiKey(false)
    setCloudModels([])
    setPinnedModelIds((prev) => {
      const next = prev.filter((id) => !id.startsWith("openrouter/"))
      savePinnedModels(next)
      return next
    })
  }

  const handleNewChat = useCallback(() => {
    setConversationId(null)
    clearChat()
  }, [clearChat])

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === conversationId) return
      setConversationId(id)
      // The hook will load messages and call onConversationLoaded with persona IDs and model
    },
    [conversationId]
  )

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(
        () => {}
      )
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (id === conversationId) {
        setConversationId(null)
        clearChat()
      }
    },
    [conversationId, clearChat]
  )

  if (!mounted) return null

  return (
    <SidebarProvider>
      <AppSidebar
        personas={personas}
        activeCount={activePersonas.length}
        model={model}
        onToggle={togglePersona}
        onAdd={addPersona}
        onUpdate={updatePersona}
        onRemove={removePersona}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />
      <SidebarInset>
        <header className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-sm font-medium">Fray</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await signOut()
                router.push("/login")
                router.refresh()
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>
        <ChatArea
          messages={messages}
          pendingPersonas={pendingConversationId === conversationId ? pendingPersonas : new Set()}
          isLoading={isLoading}
          messagesLoading={messagesLoading}
          personas={personas}
          model={model}
          onModelChange={setModel}
          pinnedModels={pinnedModels}
          onSend={sendMessage}
          onOpenModelBrowser={() => setModelBrowserOpen(true)}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={() => setWebSearchEnabled((v) => !v)}
          isSearching={pendingConversationId === conversationId && isSearching}
        />
      </SidebarInset>

      <ModelBrowser
        open={modelBrowserOpen}
        onClose={() => setModelBrowserOpen(false)}
        localModels={localModels}
        cloudModels={cloudModels}
        pinnedModelIds={pinnedModelIds}
        onTogglePin={handleTogglePin}
        hasApiKey={hasApiKey}
        onSaveApiKey={handleSaveApiKey}
        onDeleteApiKey={handleDeleteApiKey}
        loadingCloud={loadingCloud}
      />
    </SidebarProvider>
  )
}
