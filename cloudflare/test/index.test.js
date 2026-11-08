import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = {
  APP_ENV: "staging",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test"
};

test("health endpoint remains available", async () => {
  const response = await worker.fetch(new Request("https://worker.test/healthz"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "iqa-watches-api",
    environment: "staging"
  });
});

test("me endpoint rejects requests without a bearer token", async () => {
  const response = await worker.fetch(new Request("https://worker.test/api/v1/me"), env);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "unauthorized" });
});

test("me endpoint returns 503 when Supabase auth is not configured", async () => {
  const response = await worker.fetch(
    new Request("https://worker.test/api/v1/me", { headers: { authorization: "Bearer test-token" } }),
    { APP_ENV: "staging" }
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "auth_not_configured" });
});

test("me endpoint rejects invalid Supabase sessions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.supabase.co/auth/v1/user");
    assert.equal(options.headers.apikey, "sb_publishable_test");
    assert.equal(options.headers.authorization, "Bearer invalid-token");
    return new Response(JSON.stringify({ message: "invalid token" }), { status: 401 });
  };
  try {
    const response = await worker.fetch(
      new Request("https://worker.test/api/v1/me", { headers: { authorization: "Bearer invalid-token" } }),
      env
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_session" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("me endpoint returns only the verified user identity", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: "user-123",
    email: "staging-user@example.com",
    app_metadata: { role: "admin" },
    user_metadata: { display_name: "Staging User" }
  }), { status: 200 });
  try {
    const response = await worker.fetch(
      new Request("https://worker.test/api/v1/me", { headers: { authorization: "Bearer valid-token" } }),
      env
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      user: { id: "user-123", email: "staging-user@example.com" }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("public catalogue proxies only the read-only Supabase function and returns an edge-cacheable response", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, "https://example.supabase.co/functions/v1/iqa-public-catalogue");
    assert.equal(options.method, "GET");
    assert.equal(options.headers.apikey, "sb_publishable_test");
    assert.equal(options.headers.accept, "application/json");
    return new Response(JSON.stringify({ ok: true, products: [{ id: "public-product" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await worker.fetch(new Request("https://worker.test/api/v1/catalogue", {
      headers: { origin: "https://iqa-watches-storefront.pages.dev" }
    }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=300, stale-while-revalidate=600");
    assert.equal(response.headers.get("access-control-allow-origin"), "https://iqa-watches-storefront.pages.dev");
    assert.equal(response.headers.get("vary"), "Origin");
    assert.deepEqual(await response.json(), { ok: true, products: [{ id: "public-product" }] });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public catalogue rejects unknown browser origins without calling Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("must not call upstream"); };
  try {
    const response = await worker.fetch(new Request("https://worker.test/api/v1/catalogue", {
      headers: { origin: "https://attacker.example" }
    }), env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public catalogue refuses credentials and query-string variants to prevent unsafe cache sharing", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("must not call upstream"); };
  try {
    const credentialed = await worker.fetch(new Request("https://worker.test/api/v1/catalogue", {
      headers: { authorization: "Bearer private-token" }
    }), env);
    const queryVariant = await worker.fetch(new Request("https://worker.test/api/v1/catalogue?customer=1"), env);
    assert.equal(credentialed.status, 400);
    assert.equal(queryVariant.status, 400);
    assert.equal(credentialed.headers.get("cache-control"), "no-store");
    assert.equal(queryVariant.headers.get("cache-control"), "no-store");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public catalogue preflight is cached by the browser and does not call Supabase", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error("must not call upstream"); };
  try {
    const response = await worker.fetch(new Request("https://worker.test/api/v1/catalogue", {
      method: "OPTIONS",
      headers: { origin: "https://ugcnoorstudio-ui.github.io" }
    }), env);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-max-age"), "86400");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public catalogue errors are never cacheable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("quota unavailable", { status: 402 });
  try {
    const response = await worker.fetch(new Request("https://worker.test/api/v1/catalogue"), env);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
