export async function GET() {
  try {
    const res = await fetch("http://localhost:11434/api/tags")
    const data = await res.json()
    const models = (data.models || []).map(
      (m: { name: string }) => m.name
    )
    return Response.json({ models })
  } catch {
    return Response.json({ models: [] })
  }
}
