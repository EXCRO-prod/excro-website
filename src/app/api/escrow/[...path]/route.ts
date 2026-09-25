// Forwards /api/escrow/* to the Excro escrow API (escrow/server), so the /app pages talk to one origin.
// The API itself holds all the money-safety rules; this route only relays requests and responses.
// Set ESCROW_API_URL per environment; locally `npm run dev` starts the API on :8787 alongside the site.
const API = process.env.ESCROW_API_URL ?? "http://127.0.0.1:8787";

const FORWARD_HEADERS = ["authorization", "content-type"];

async function relay(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Taken from the raw URL (not the decoded params) so paths like /v1/accounts/signup:verify pass through unchanged.
  const target = API + url.pathname.replace(/^\/api\/escrow/, "") + url.search;
  const headers = new Headers();
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, { method: request.method, headers, body: hasBody ? await request.text() : undefined, cache: "no-store" });
  } catch {
    return Response.json(
      { error: "escrow_api_unavailable", message: "The Excro platform service isn't reachable right now. If you're running locally, start it with `npm run dev`." },
      { status: 503 },
    );
  }
  return new Response(upstream.body, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
export const PATCH = relay;
export const DELETE = relay;
