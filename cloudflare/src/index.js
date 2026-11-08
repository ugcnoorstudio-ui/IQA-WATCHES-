const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

const PUBLIC_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev"
]);

function corsHeaders(origin) {
  const headers = {
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "apikey, authorization, x-client-info",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
  if (origin && PUBLIC_ORIGINS.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function getBearer(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\\s+(.+)$/i);
  return match ? match[1] : null;
}

async function verifyWithSupabase(token, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return { configured: false, user: null };
  }
  const base = env.SUPABASE_URL.replace(/\\/+$/, "");
  const response = await fetch(base + "/auth/v1/user", {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: "Bearer " + token
    }
  });
  if (!response.ok) return { configured: true, user: null };
  const user = await response.json();
  if (!user || typeof user.id !== "string") return { configured: true, user: null };
  return { configured: true, user: { id: user.id, email: user.email || null } };
}

async function publicContent(request, env, ctx) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ ok: false, error: "public_content_not_configured" }, 503);
  }

  // The cache key deliberately excludes cookies, authorization and query strings:
  // this endpoint contains published, public-only content and accepts GET only.
  const cache = globalThis.caches && globalThis.caches.default;
  const cacheKey = new Request(new URL("/__iqa_cache/public-content/v1", request.url).toString(), { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      // A cache outage must not take the public storefront offline.
    }
  }

  const base = env.SUPABASE_URL.replace(/\\/+$/, "");
  let upstream;
  try {
    upstream = await fetch(base + "/functions/v1/iqa-public-content", {
      method: "GET",
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY }
    });
  } catch {
    return json({ ok: false, error: "public_content_unavailable" }, 503);
  }

  if (!upstream.ok) {
    return json({ ok: false, error: "public_content_unavailable" }, upstream.status >= 500 ? 503 : upstream.status);
  }

  const headers = new Headers(upstream.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  headers.set("x-content-cache", "MISS");
  const response = new Response(upstream.body, { status: 200, headers });

  if (cache) {
    try {
      const stored = new Response(response.clone().body, { status: response.status, headers: new Headers(response.headers) });
      const write = cache.put(cacheKey, stored);
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(write);
      else await write;
    } catch {
      // Cache writes are best-effort; origin remains the source of truth.
    }
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);

    if (url.pathname === "/healthz" && request.method === "GET") {
      return json({ ok: true, service: "iqa-watches-api", environment: env.APP_ENV || "unknown" });
    }

    if (url.pathname === "/api/v1/public-content") {
      if (origin && !PUBLIC_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, cors);
      const response = await publicContent(request, env, ctx);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }

    if (url.pathname === "/api/v1/me" && request.method === "GET") {
      const token = getBearer(request);
      if (!token) return json({ ok: false, error: "unauthorized" }, 401);
      try {
        const result = await verifyWithSupabase(token, env);
        if (!result.configured) return json({ ok: false, error: "auth_not_configured" }, 503);
        if (!result.user) return json({ ok: false, error: "invalid_session" }, 401);
        return json({ ok: true, user: result.user });
      } catch {
        return json({ ok: false, error: "authentication_unavailable" }, 503);
      }
    }
    return json({ ok: false, error: "not_found" }, 404);
  }
};
