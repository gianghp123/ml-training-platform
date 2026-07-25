export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiUrl(path: string): string {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) throw new Error("API_URL environment variable is missing.");
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": request.headers.get("content-type") ?? "application/json",
    });
    if (process.env.API_KEY) headers.set("apikey", process.env.API_KEY);
    const upstream = await fetch(apiUrl("/workflow-runs/execute"), {
      method: "POST",
      headers,
      body: await request.text(),
      cache: "no-store",
      signal: request.signal,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ message: "The workflow execution service is unavailable." }, { status: 502 });
  }
}
