export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ runId: string }>;
}

function apiUrl(path: string): string {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) throw new Error("API_URL environment variable is missing.");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { runId } = await context.params;
    const requestUrl = new URL(request.url);
    const after = requestUrl.searchParams.get("after") ?? request.headers.get("last-event-id");
    const upstreamUrl = new URL(apiUrl(`/workflow-runs/${encodeURIComponent(runId)}/events`));
    if (after) upstreamUrl.searchParams.set("after", after);
    const headers = new Headers({ Accept: "text/event-stream" });
    if (after) headers.set("Last-Event-ID", after);
    if (process.env.API_KEY) headers.set("apikey", process.env.API_KEY);
    const upstream = await fetch(upstreamUrl, { headers, cache: "no-store", signal: request.signal });
    if (!upstream.ok || !upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status || 502,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
      });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json({ message: "The workflow event stream is unavailable." }, { status: 502 });
  }
}
