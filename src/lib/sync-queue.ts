const STORAGE_KEY = "fray-sync-queue"

type SavePayload = {
  conversationId: string
  personaId: string | null
  content: string
  responseType: string
  addressedTo?: string | null
  addressedPersonaId?: string | null
  timestamp: number
}

export function enqueue(payload: SavePayload) {
  const queue = getQueue()
  queue.push(payload)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

function getQueue(): SavePayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function drainQueue(): Promise<number> {
  const queue = getQueue()
  if (queue.length === 0) return 0

  localStorage.removeItem(STORAGE_KEY)
  let saved = 0
  const failures: SavePayload[] = []

  for (const payload of queue) {
    try {
      const res = await fetch("/api/turn/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        saved++
      } else {
        failures.push(payload)
      }
    } catch {
      failures.push(payload)
    }
  }

  if (failures.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(failures))
  }

  return saved
}
