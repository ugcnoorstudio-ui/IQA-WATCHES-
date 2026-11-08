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
