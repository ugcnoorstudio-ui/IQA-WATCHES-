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
