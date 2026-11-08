const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders
  }
});

const PUBLIC_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev"
]);

function allowedOrigin(origin) {
  if (!origin) return null;
  if (PUBLIC_ORIGINS.has(origin)) return origin;
  return /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "apikey, x-client-info, content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function getBearer(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function verifyWithSupabase(token, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return { configured: false, user: null };
  }
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
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

async function publicCatalogue(request, env) {
  const originHeader = request.headers.get("origin");
  const origin = allowedOrigin(originHeader);
  if (originHeader && !origin) {
    return json({ ok: false, error: "origin_not_allowed" }, 403, { vary: "Origin" });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "GET") {
    return json({ ok: false, error: "method_not_allowed" }, 405, corsHeaders(origin));
  }
  if (request.headers.has("authorization") || request.headers.has("cookie")) {
    return json({ ok: false, error: "credentials_not_supported" }, 400, corsHeaders(origin));
  }
  if (new URL(request.url).search) {
    return json({ ok: false, error: "query_parameters_not_supported" }, 400, corsHeaders(origin));
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ ok: false, error: "catalogue_not_configured" }, 503, corsHeaders(origin));
  }
  try {
    const base = env.SUPABASE_URL.replace(/\/+$/, "");
    const upstream = await fetch(base + "/functions/v1/iqa-public-catalogue", {
      method: "GET",
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, accept: "application/json" }
    });
    if (!upstream.ok) {
      return json({ ok: false, error: "catalogue_temporarily_unavailable" }, 503, corsHeaders(origin));
    }
    const payload = await upstream.json();
    if (!payload || payload.ok !== true || !Array.isArray(payload.products)) {
      return json({ ok: false, error: "catalogue_response_invalid" }, 503, corsHeaders(origin));
    }
    return json(payload, 200, {
      ...corsHeaders(origin),
      "cache-control": "public, max-age=300, stale-while-revalidate=600"
    });
  } catch {
    return json({ ok: false, error: "catalogue_temporarily_unavailable" }, 503, corsHeaders(origin));
  }
}

async function publicContent(request, env, ctx) {
  if (request.headers.has("authorization") || request.headers.has("cookie")) {
    return json({ ok: false, error: "credentials_not_supported" }, 400);
  }
  if (new URL(request.url).search) {
    return json({ ok: false, error: "query_parameters_not_supported" }, 400);
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ ok: false, error: "public_content_not_configured" }, 503);
  }

  // Cache only the public published-content payload. CORS headers are applied
  // after cache lookup so one approved origin cannot poison another origin's CORS.
  const cache = globalThis.caches && globalThis.caches.default;
  const cacheKey = new Request(new URL("/__iqa_cache/public-content/v1", request.url).toString(), { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("x-content-cache", "HIT");
        return new Response(hit.body, { status: hit.status, headers });
      }
    } catch {
      // Cache outage must not take the public storefront offline.
    }
  }

  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  let upstream;
  try {
    upstream = await fetch(base + "/functions/v1/iqa-public-content", {
      method: "GET",
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, accept: "application/json" }
    });
  } catch {
    return json({ ok: false, error: "public_content_unavailable" }, 503);
  }
  if (!upstream.ok) {
    return json({ ok: false, error: "public_content_unavailable" }, 503);
  }
  const payload = await upstream.json();
  if (!payload || payload.ok !== true || !Array.isArray(payload.items)) {
    return json({ ok: false, error: "public_content_response_invalid" }, 503);
  }

  const cacheHeaders = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    "x-content-cache": "MISS"
  });
  const response = new Response(JSON.stringify(payload), { status: 200, headers: cacheHeaders });
  if (cache) {
    try {
      const write = cache.put(cacheKey, response.clone());
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(write);
      else await write;
    } catch {
      // Cache writes are best-effort; Supabase remains the source of truth.
    }
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const originHeader = request.headers.get("origin");
    const origin = allowedOrigin(originHeader);

    if (url.pathname === "/api/v1/catalogue") {
      return publicCatalogue(request, env);
    }
    if (url.pathname === "/api/v1/public-content") {
      if (originHeader && !origin) return json({ ok: false, error: "origin_not_allowed" }, 403, { vary: "Origin" });
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, corsHeaders(origin));
      const response = await publicContent(request, env, ctx);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ ok: true, service: "iqa-watches-api", environment: env.APP_ENV || "unknown" });
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
