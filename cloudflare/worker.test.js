import test from "node:test";
import assert from "node:assert/strict";
import worker from "./src/index.js";

const request = (path, headers = {}) => new Request("https://staging.example" + path, { headers });

test("health endpoint identifies staging without exposing configuration", async () => {
  const response = await worker.fetch(request("/healthz"), { APP_ENV: "staging" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "iqa-watches-api",
    environment: "staging"
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unknown routes return 404", async () => {
  const response = await worker.fetch(request("/not-a-route"), {});
  assert.equal(response.status, 404);
});

test("me endpoint rejects missing bearer token", async () => {
  const response = await worker.fetch(request("/api/v1/me"), {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "public-test-key"
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
});

test("me endpoint fails closed when Supabase Auth is not configured", async () => {
  const response = await worker.fetch(request("/api/v1/me", {
    authorization: "Bearer test-access-token"
  }), {});
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "auth_not_configured" });
});

test("me endpoint returns only identity fields after Supabase validates the token", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.supabase.co/auth/v1/user");
    assert.equal(options.headers.apikey, "publishable-test-key");
    assert.equal(options.headers.authorization, "Bearer valid-access-token");
    return new Response(JSON.stringify({
      id: "user-123",
      email: "test@example.com",
      role: "authenticated",
      app_metadata: { provider: "google" }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(request("/api/v1/me", {
      authorization: "Bearer valid-access-token"
    }), {
      SUPABASE_URL: "https://example.supabase.co/",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      user: { id: "user-123", email: "test@example.com" }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("me endpoint rejects a token Supabase Auth does not validate", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "invalid token" }), { status: 401 });
  try {
    const response = await worker.fetch(request("/api/v1/me", {
      authorization: "Bearer invalid-access-token"
    }), {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_session" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cache probe is staging-only and returns a cacheable origin-specific response", async () => {
  const origin = "https://iqa-watches-storefront.pages.dev";
  const response = await worker.fetch(request("/api/v1/cache-probe", { origin }), { APP_ENV: "staging" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    probe: "cloudflare-edge-cache",
    environment: "staging"
  });
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, s-maxage=60");
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("vary"), "Origin");
  assert.equal(response.headers.get("x-iqa-cache-probe"), "true");
});

test("cache probe is unavailable outside staging", async () => {
  const response = await worker.fetch(request("/api/v1/cache-probe"), { APP_ENV: "production" });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { ok: false, error: "not_found" });
});

test("production catalogue route stays disabled until its Supabase function is deployed", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ ok: true, products: [] }), { status: 200 });
  };
  try {
    const response = await worker.fetch(request("/api/v1/catalogue"), {
      APP_ENV: "production",
      PUBLIC_CATALOGUE_ENABLED: "false",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 404);
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public-content caches Supabase Cached Egress 402 for 30 seconds", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const entries = new Map();
  let upstreamCalls = 0;
  globalThis.caches = {
    default: {
      match: async (key) => entries.get(key.url)?.clone() || null,
      put: async (key, response) => { entries.set(key.url, response.clone()); }
    }
  };
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ message: "exceed_cached_egress_quota" }), { status: 402 });
  };
  const env = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
  };
  try {
    const first = await worker.fetch(request("/api/v1/public-content"), env);
    assert.equal(first.status, 503);
    assert.equal(first.headers.get("x-content-cache"), "MISS");
    assert.equal(first.headers.get("retry-after"), "30");
    assert.equal(first.headers.get("x-iqa-upstream-status"), "402");

    const second = await worker.fetch(request("/api/v1/public-content"), env);
    assert.equal(second.status, 503);
    assert.equal(second.headers.get("x-content-cache"), "HIT");
    assert.equal(second.headers.get("cache-control"), "public, max-age=30, s-maxage=30, stale-while-revalidate=60");
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test("catalogue route is available only when explicitly enabled for staging", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async (url) => {
    upstreamCalls += 1;
    assert.equal(url, "https://example.supabase.co/functions/v1/iqa-public-catalogue");
    return new Response(JSON.stringify({ ok: true, products: [] }), { status: 200 });
  };
  try {
    const response = await worker.fetch(request("/api/v1/catalogue"), {
      APP_ENV: "staging",
      PUBLIC_CATALOGUE_ENABLED: "true",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=600");
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unrelated HTTP 402 responses are not cached as Supabase quota restrictions", async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const entries = new Map();
  let upstreamCalls = 0;
  globalThis.caches = {
    default: {
      match: async (key) => entries.get(key.url)?.clone() || null,
      put: async (key, response) => { entries.set(key.url, response.clone()); }
    }
  };
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ message: "payment_required" }), { status: 402 });
  };
  try {
    const env = {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    };
    const first = await worker.fetch(request("/api/v1/public-content"), env);
    const second = await worker.fetch(request("/api/v1/public-content"), env);
    assert.equal(first.status, 503);
    assert.equal(second.status, 503);
    assert.equal(first.headers.get("x-iqa-upstream-status"), null);
    assert.equal(second.headers.get("x-content-cache"), null);
    assert.equal(upstreamCalls, 2);
    assert.equal(entries.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  }
});

test("Production upstream pause blocks public-content requests before Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("Supabase must not be called"); };
  try {
    const response = await worker.fetch(request("/api/v1/public-content"), {
      SUPABASE_UPSTREAM_CHECK_ENABLED: "false",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "supabase_upstream_paused");
    assert.equal(response.headers.get("retry-after"), "300");
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Production upstream pause blocks catalogue requests before Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("Supabase must not be called"); };
  try {
    const response = await worker.fetch(request("/api/v1/catalogue"), {
      APP_ENV: "staging",
      PUBLIC_CATALOGUE_ENABLED: "true",
      SUPABASE_UPSTREAM_CHECK_ENABLED: "false",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "supabase_upstream_paused");
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Production upstream pause blocks Supabase Auth verification", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("Supabase Auth must not be called"); };
  try {
    const response = await worker.fetch(request("/api/v1/me", {
      authorization: "Bearer valid-looking-token"
    }), {
      SUPABASE_UPSTREAM_CHECK_ENABLED: "false",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "publishable-test-key"
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "auth_not_configured");
    assert.equal(upstreamCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
