"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatArea } from "@/components/chat-area"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { usePersonas } from "@/hooks/use-personas"
import { useChatSession } from "@/hooks/use-chat-session"

export default function Home() {
  const { personas, activePersonas, togglePersona, addPersona, updatePersona, removePersona } =
    usePersonas()
  const [model, setModel] = useState("qwen3:32b")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const { messages, pendingPersonas, isLoading, sendMessage, clearChat } =
    useChatSession(activePersonas, model)

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.models?.length) {
          setAvailableModels(data.models)
          // default to first available if current isn't found
          if (!data.models.includes(model)) {
            setModel(data.models[0])
          }
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
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
            <h1 className="text-sm font-medium">Brainstorm Room</h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear chat
            </button>
          )}
        </header>
        <ChatArea
          messages={messages}
          pendingPersonas={pendingPersonas}
          isLoading={isLoading}
          personas={personas}
          model={model}
          onModelChange={setModel}
          availableModels={availableModels}
          onSend={sendMessage}
        />
      </SidebarInset>
    </>
  )
}
