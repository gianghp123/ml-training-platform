export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ artifactId: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function apiUrl(path: string): string {
  const baseUrl = process.env.API_URL
  if (!baseUrl) throw new Error("API_URL environment variable is missing.")
  return `${baseUrl.replace(/\/$/, "")}${path}`
}

function readDownloadUrl(value: unknown): string | null {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value
  if (!isRecord(candidate) || typeof candidate.url !== "string") return null

  try {
    const url = new URL(candidate.url)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const { artifactId } = await context.params
    const headers = new Headers({ Accept: "application/json" })
    if (process.env.API_KEY) headers.set("apikey", process.env.API_KEY)

    const upstream = await fetch(
      apiUrl(`/artifacts/${encodeURIComponent(artifactId)}/download`),
      {
        headers,
        cache: "no-store",
        signal: request.signal,
      }
    )

    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      })
    }

    const downloadUrl = readDownloadUrl(await upstream.json())
    if (!downloadUrl) {
      return Response.json(
        { message: "The artifact service returned an invalid download URL." },
        { status: 502 }
      )
    }

    return Response.redirect(downloadUrl, 307)
  } catch {
    return Response.json(
      { message: "The artifact download service is unavailable." },
      { status: 502 }
    )
  }
}
