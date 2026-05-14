// Proxies /api/* and /questions/* requests to the private questions backend.
// Everything else is served as a static asset (configured in wrangler.jsonc).
//
// Required environment secrets (set in Cloudflare dashboard):
//   QUESTIONS_URL    e.g. "https://quizzer-questions.example.workers.dev"
//   QUESTIONS_TOKEN  matches SHARED_TOKEN in the backend project

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export default {
  async fetch(request, env) {
    if (!env.QUESTIONS_URL || !env.QUESTIONS_TOKEN) {
      return json({ error: "backend not configured" }, 500);
    }

    const incoming = new URL(request.url);
    const backend = new URL(env.QUESTIONS_URL);
    backend.pathname = incoming.pathname;
    backend.search = incoming.search;

    // Forward the request with the shared token. We deliberately drop
    // request headers to avoid leaking anything from the browser.
    const proxied = new Request(backend.toString(), {
      method: request.method,
      headers: { Authorization: `Bearer ${env.QUESTIONS_TOKEN}` },
    });

    try {
      const upstream = await fetch(proxied);
      // Pass body through; rewrite headers to a known-good minimal set.
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") || "application/json",
          "cache-control": "no-store",
        },
      });
    } catch (e) {
      return json({ error: "backend unreachable", detail: e.message }, 502);
    }
  },
};
