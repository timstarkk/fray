export async function readSSE(
  response: Response,
  onEvent: (event: string, data: Record<string, unknown>) => void
) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let currentEvent = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop()! // keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7)
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6))
        onEvent(currentEvent, data)
      }
    }
  }
}
