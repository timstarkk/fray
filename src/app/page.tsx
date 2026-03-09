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

export default function Home() {
  const router = useRouter()
  const { personas, activePersonas, togglePersona, addPersona, updatePersona, removePersona } =
    usePersonas()

  // Model state
  const [model, setModel] = useState("local/qwen3:32b")
  const [pinnedModelIds, setPinnedModelIds] = useState<string[]>([])
  const [cloudModels, setCloudModels] = useState<ModelInfo[]>([])
  const [hasApiKey, setHasApiKey] = useState(false)
  const [loadingCloud, setLoadingCloud] = useState(false)
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false)
  const [pinnedLoaded, setPinnedLoaded] = useState(false)
  const autoPinnedRef = useRef(false)

  const { localModels } = useOllamaDetection()

  const { messages, pendingPersonas, isLoading, sendMessage, clearChat } =
    useChatSession(activePersonas, model)

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

    // Default to the first local model
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

  // If current model isn't available, fall back to first pinned
  useEffect(() => {
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
    // Remove cloud model pins
    setPinnedModelIds((prev) => {
      const next = prev.filter((id) => !id.startsWith("openrouter/"))
      savePinnedModels(next)
      return next
    })
  }

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
      />
      <SidebarInset>
        <header className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-sm font-medium">Fray</h1>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear chat
              </button>
            )}
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
          pendingPersonas={pendingPersonas}
          isLoading={isLoading}
          personas={personas}
          model={model}
          onModelChange={setModel}
          pinnedModels={pinnedModels}
          onSend={sendMessage}
          onOpenModelBrowser={() => setModelBrowserOpen(true)}
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
