"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
import { ArrowUpIcon, ChevronDownIcon, MonitorIcon, CloudIcon, SettingsIcon, GlobeIcon } from "lucide-react"
import { type ChatMessage } from "@/lib/chat-types"
import { type Persona } from "@/lib/personas"
import type { ModelInfo } from "@/app/api/models/route"
import {
  UserMessage,
  PersonaFullMessage,
  PersonaBriefMessage,
  PersonaEmojiReaction,
  PersonaThinking,
} from "@/components/messages"

type ChatAreaProps = {
  messages: ChatMessage[]
  pendingPersonas: Set<string>
  isLoading: boolean
  messagesLoading: boolean
  personas: Persona[]
  model: string
  onModelChange: (model: string) => void
  pinnedModels: ModelInfo[]
  onSend: (text: string) => void
  onOpenModelBrowser: () => void
  webSearchEnabled: boolean
  onWebSearchToggle: () => void
  isSearching: boolean
}

type MessageTurn = {
  userMessage: ChatMessage & { role: "user" }
  responses: {
    full: (ChatMessage & { role: "persona" })[]
    brief: (ChatMessage & { role: "persona" })[]
    emoji: (ChatMessage & { role: "persona" })[]
  }
}

function getDisplayName(modelId: string): string {
  // "local/qwen3:32b" → "qwen3:32b", "openrouter/meta-llama/llama-3-70b" → "llama-3-70b"
  if (modelId.startsWith("local/")) return modelId.slice(6).replace(/:latest$/, "")
  if (modelId.startsWith("openrouter/")) {
    const parts = modelId.slice(11).split("/")
    return parts[parts.length - 1]
  }
  return modelId.replace(/:latest$/, "")
}

function groupMessagesByTurn(messages: ChatMessage[]): MessageTurn[] {
  const turns: MessageTurn[] = []
  let current: MessageTurn | null = null

  for (const msg of messages) {
    if (msg.role === "user") {
      current = {
        userMessage: msg,
        responses: { full: [], brief: [], emoji: [] },
      }
      turns.push(current)
    } else if (msg.role === "persona" && current) {
      const { response_type } = msg.response
      if (response_type === "silence") continue
      if (response_type === "full") current.responses.full.push(msg)
      else if (response_type === "brief") current.responses.brief.push(msg)
      else if (response_type === "emoji") current.responses.emoji.push(msg)
    }
  }

  return turns
}

export function ChatArea({
  messages,
  pendingPersonas,
  isLoading,
  messagesLoading,
  personas,
  model,
  onModelChange,
  pinnedModels,
  onSend,
  onOpenModelBrowser,
  webSearchEnabled,
  onWebSearchToggle,
  isSearching,
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

  const personaMap = useMemo(
    () => new Map(personas.map((p) => [p.id, p])),
    [personas]
  )

  const turns = useMemo(() => groupMessagesByTurn(messages), [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    onSend(text)
  }

  const getAddressedPersona = (msg: ChatMessage & { role: "persona" }) => {
    const { response } = msg
    if (response.addressed_to === "persona" && response.addressed_persona_id) {
      return personaMap.get(response.addressed_persona_id) ?? null
    }
    return null
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChatContainerRoot className="flex-1 p-4">
        <ChatContainerContent className="gap-4 max-w-3xl mx-auto w-full">
          {turns.length === 0 && !messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation. Your active personas will join in.
              </p>
            </div>
          ) : turns.length === 0 ? null : (
            turns.map((turn) => (
              <div key={turn.userMessage.id} className="flex flex-col gap-3">
                <UserMessage content={turn.userMessage.content} />

                {(turn.responses.full.length > 0 ||
                  turn.responses.brief.length > 0 ||
                  turn.responses.emoji.length > 0) && (
                  <div className="flex flex-col gap-2 mt-1">
                    {turn.responses.full.map((msg) => {
                      const persona = personaMap.get(msg.personaId)
                      if (!persona) return null
                      return (
                        <PersonaFullMessage
                          key={msg.id}
                          persona={persona}
                          response={msg.response}
                          addressedPersona={getAddressedPersona(msg)}
                        />
                      )
                    })}

                    {turn.responses.brief.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {turn.responses.brief.map((msg) => {
                          const persona = personaMap.get(msg.personaId)
                          if (!persona) return null
                          return (
                            <PersonaBriefMessage
                              key={msg.id}
                              persona={persona}
                              response={msg.response}
                              addressedPersona={getAddressedPersona(msg)}
                            />
                          )
                        })}
                      </div>
                    )}

                    {turn.responses.emoji.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {turn.responses.emoji.map((msg) => {
                          const persona = personaMap.get(msg.personaId)
                          if (!persona) return null
                          return (
                            <PersonaEmojiReaction
                              key={msg.id}
                              persona={persona}
                              content={msg.response.content}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {pendingPersonas.size > 0 && (
            <div className="flex flex-col gap-1">
              {isSearching && (
                <div className="flex items-center gap-1.5 pl-2 text-xs text-muted-foreground">
                  <GlobeIcon className="size-3 animate-pulse" />
                  Searching the web...
                </div>
              )}
              {Array.from(pendingPersonas).map((id) => {
                const persona = personaMap.get(id)
                if (!persona) return null
                return <PersonaThinking key={id} persona={persona} />
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
              <div className="flex items-center gap-1">
              <div className="relative" ref={modelRef}>
                <button
                  type="button"
                  onClick={() => setModelOpen(!modelOpen)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                >
                  {model.startsWith("local/") ? (
                    <MonitorIcon className="size-3 text-emerald-500" />
                  ) : model.startsWith("openrouter/") ? (
                    <CloudIcon className="size-3 text-blue-400" />
                  ) : null}
                  {getDisplayName(model)}
                  <ChevronDownIcon className="size-3" />
                </button>
                {modelOpen && (
                  <div className="absolute bottom-full left-0 mb-1 bg-card border rounded-lg shadow-lg py-1 min-w-[240px] z-50">
                    {pinnedModels.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No pinned models.{" "}
                        <button
                          className="underline hover:text-foreground"
                          onClick={() => {
                            setModelOpen(false)
                            onOpenModelBrowser()
                          }}
                        >
                          Browse models
                        </button>
                      </div>
                    ) : (
                      <>
                        {pinnedModels.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              onModelChange(m.id)
                              setModelOpen(false)
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-secondary transition-colors text-left gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {m.provider === "local" ? (
                                <MonitorIcon className="size-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <CloudIcon className="size-3.5 text-blue-400 shrink-0" />
                              )}
                              <span className="truncate">{m.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {m.provider === "local" && (
                                <span className="text-xs text-emerald-500">Free</span>
                              )}
                              {m.pricing && (
                                <span className="text-xs text-muted-foreground">
                                  ${m.pricing.prompt.toFixed(2)}/M
                                </span>
                              )}
                              {m.id === model && (
                                <span className="text-emerald-500">✓</span>
                              )}
                            </div>
                          </button>
                        ))}
                        <div className="border-t mt-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setModelOpen(false)
                              onOpenModelBrowser()
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                          >
                            <SettingsIcon className="size-3.5" />
                            Browse all models
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onWebSearchToggle}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                  webSearchEnabled
                    ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title={webSearchEnabled ? "Web search enabled" : "Web search disabled"}
              >
                <GlobeIcon className="size-3" />
                {webSearchEnabled && <span>Search</span>}
              </button>
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
