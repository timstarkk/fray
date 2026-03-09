"use client"

import { useState, useRef, useEffect } from "react"
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ChevronDownIcon } from "lucide-react"
import { type ChatMessage } from "@/lib/chat-types"
import { type Persona } from "@/lib/personas"

type ChatAreaProps = {
  messages: ChatMessage[]
  pendingPersonas: Set<string>
  isLoading: boolean
  personas: Persona[]
  model: string
  onModelChange: (model: string) => void
  availableModels: string[]
  onSend: (text: string) => void
}

export function ChatArea({
  messages,
  pendingPersonas,
  isLoading,
  personas,
  model,
  onModelChange,
  availableModels,
  onSend,
}: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [modelOpen, setModelOpen] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    if (modelOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [modelOpen])

  const personaMap = new Map(personas.map((p) => [p.id, p]))

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    onSend(text)
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChatContainerRoot className="flex-1 p-4">
        <ChatContainerContent className="gap-4 max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation. Your active personas will join in.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                )
              }

              const persona = personaMap.get(msg.personaId)
              if (!persona) return null

              const { response } = msg

              if (response.response_type === "silence") return null

              if (response.response_type === "emoji") {
                return (
                  <div key={msg.id} className="flex items-center gap-2 pl-2">
                    <span className="text-xs text-muted-foreground">
                      {persona.emoji}
                    </span>
                    <span className="text-lg">{response.content}</span>
                  </div>
                )
              }

              const addressedPersona =
                response.addressed_to === "persona" &&
                response.addressed_persona_id
                  ? personaMap.get(response.addressed_persona_id)
                  : null

              return (
                <div key={msg.id} className="flex gap-3 max-w-[85%]">
                  <span className="text-xl shrink-0 mt-1">{persona.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium">
                        {persona.name}
                      </span>
                      {addressedPersona && (
                        <span className="text-xs text-muted-foreground">
                          → {addressedPersona.emoji} {addressedPersona.name}
                        </span>
                      )}
                    </div>
                    {response.response_type === "brief" ? (
                      <p className="text-sm text-muted-foreground italic">
                        {response.content}
                      </p>
                    ) : (
                      <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2">
                        <p className="text-sm">{response.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {pendingPersonas.size > 0 && (
            <div className="flex flex-col gap-1 pl-2">
              {Array.from(pendingPersonas).map((id) => {
                const persona = personaMap.get(id)
                if (!persona) return null
                return (
                  <p
                    key={id}
                    className="text-xs text-muted-foreground animate-pulse"
                  >
                    {persona.emoji} {persona.name} is thinking...
                  </p>
                )
              })}
            </div>
          )}

          <ChatContainerScrollAnchor />
        </ChatContainerContent>
      </ChatContainerRoot>

      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={handleSend}
            disabled={isLoading}
          >
            <PromptInputTextarea placeholder="Type your message..." />
            <PromptInputActions className="justify-between px-2 pb-2">
              <div className="relative" ref={modelRef}>
                <button
                  type="button"
                  onClick={() => setModelOpen(!modelOpen)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                >
                  {model.replace(":latest", "")}
                  <ChevronDownIcon className="size-3" />
                </button>
                {modelOpen && availableModels.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 bg-card border rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                    {availableModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          onModelChange(m)
                          setModelOpen(false)
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
                      >
                        <span>{m.replace(":latest", "")}</span>
                        {m === model && (
                          <span className="text-emerald-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                className="rounded-full size-8"
                disabled={!input.trim() || isLoading}
                onClick={handleSend}
              >
                <ArrowUpIcon className="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
