"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  XIcon,
  MonitorIcon,
  CloudIcon,
  SearchIcon,
  PinIcon,
  PinOffIcon,
  KeyIcon,
  LoaderIcon,
} from "lucide-react"
import type { ModelInfo } from "@/app/api/models/route"

type ModelBrowserProps = {
  open: boolean
  onClose: () => void
  localModels: ModelInfo[]
  cloudModels: ModelInfo[]
  pinnedModelIds: string[]
  onTogglePin: (modelId: string) => void
  hasApiKey: boolean
  onSaveApiKey: (key: string) => Promise<void>
  onDeleteApiKey: () => Promise<void>
  loadingCloud: boolean
}

export function ModelBrowser({
  open,
  onClose,
  localModels,
  cloudModels,
  pinnedModelIds,
  onTogglePin,
  hasApiKey,
  onSaveApiKey,
  onDeleteApiKey,
  loadingCloud,
}: ModelBrowserProps) {
  const [search, setSearch] = useState("")
  const [keyInput, setKeyInput] = useState("")
  const [savingKey, setSavingKey] = useState(false)

  if (!open) return null

  const pinnedSet = new Set(pinnedModelIds)

  const filteredCloud = search
    ? cloudModels.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : cloudModels

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    setSavingKey(true)
    await onSaveApiKey(keyInput.trim())
    setKeyInput("")
    setSavingKey(false)
  }

  const handleDeleteKey = async () => {
    setSavingKey(true)
    await onDeleteApiKey()
    setSavingKey(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-card border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Models</h3>
          <Button variant="ghost" size="sm" className="size-8 p-0" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Local Models */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <MonitorIcon className="size-3.5" />
              Local Models
              {localModels.length > 0 && (
                <span className="text-xs text-emerald-500 ml-1">Ollama detected</span>
              )}
            </h4>
            {localModels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 px-2">
                No local models detected. Install{" "}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline"
                >
                  Ollama
                </a>{" "}
                and pull a model to use free local inference.
              </p>
            ) : (
              <div className="space-y-1">
                {localModels.map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    pinned={pinnedSet.has(m.id)}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Cloud Models */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <CloudIcon className="size-3.5" />
              Cloud Models
              <span className="text-xs text-muted-foreground ml-1">via OpenRouter</span>
            </h4>

            {!hasApiKey ? (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add your OpenRouter API key to access cloud models. Your key is encrypted at rest.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="sk-or-..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                  />
                  <Button size="sm" onClick={handleSaveKey} disabled={!keyInput.trim() || savingKey}>
                    {savingKey ? <LoaderIcon className="size-4 animate-spin" /> : <KeyIcon className="size-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <SearchIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search models..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={handleDeleteKey}
                    disabled={savingKey}
                  >
                    Remove key
                  </Button>
                </div>

                {loadingCloud ? (
                  <div className="flex items-center gap-2 py-4 px-2 text-sm text-muted-foreground">
                    <LoaderIcon className="size-4 animate-spin" />
                    Loading models...
                  </div>
                ) : filteredCloud.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 px-2">
                    {search ? "No models match your search." : "No cloud models available."}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                    {filteredCloud.map((m) => (
                      <ModelRow
                        key={m.id}
                        model={m}
                        pinned={pinnedSet.has(m.id)}
                        onTogglePin={onTogglePin}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function ModelRow({
  model,
  pinned,
  onTogglePin,
}: {
  model: ModelInfo
  pinned: boolean
  onTogglePin: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-secondary/50 group transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {model.provider === "local" ? (
          <MonitorIcon className="size-3.5 text-emerald-500 shrink-0" />
        ) : (
          <CloudIcon className="size-3.5 text-blue-400 shrink-0" />
        )}
        <span className="text-sm truncate">{model.name}</span>
        {model.provider === "local" && (
          <span className="text-xs text-emerald-500 shrink-0">Free</span>
        )}
        {model.pricing && (
          <span className="text-xs text-muted-foreground shrink-0">
            ${model.pricing.prompt.toFixed(2)}/M
          </span>
        )}
      </div>
      <button
        onClick={() => onTogglePin(model.id)}
        className={`shrink-0 p-1 rounded transition-colors ${
          pinned
            ? "text-foreground"
            : "text-muted-foreground opacity-0 group-hover:opacity-100"
        } hover:text-foreground`}
      >
        {pinned ? <PinIcon className="size-3.5" /> : <PinOffIcon className="size-3.5" />}
      </button>
    </div>
  )
}
