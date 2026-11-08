import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

const env = {
  APP_ENV: "test",
  SUPABASE_URL: "https://project.example",
  SUPABASE_PUBLISHABLE_KEY: "test-public-key"
};

function makeCache() {
  const entries = new Map();
  return {
    entries,
    async match(key) { return entries.get(key.url)?.clone() || undefined; },
    async put(key, response) { entries.set(key.url, response.clone()); }
  };
}

test("public content is fetched once and then served from shared cache", async () => {
  const previousCaches = globalThis.caches;
  const previousFetch = globalThis.fetch;
  const cache = makeCache();
  globalThis.caches = { default: cache };
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ ok: true, items: [{ content_type: "story", title: "Public story" }] }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  try {
    const ctx = { waitUntil(promise) { this.pending = promise; } };
    const request = () => new Request("https://api.example/api/v1/public-content", {
      headers: { origin: "https://iqa-watches-storefront.pages.dev" }
    });
    const first = await worker.fetch(request(), env, ctx);
    await ctx.pending;
    assert.equal(first.status, 200);
    assert.match(first.headers.get("cache-control"), /s-maxage=60/);
    assert.equal(first.headers.get("x-content-cache"), "MISS");
    const second = await worker.fetch(request(), env, ctx);
    assert.equal(second.status, 200);
    assert.equal(second.headers.get("x-content-cache"), "HIT");
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.caches = previousCaches;
    globalThis.fetch = previousFetch;
  }
});

test("public content rejects unapproved origins and never accepts mutation methods", async () => {
  const badOrigin = await worker.fetch(new Request("https://api.example/api/v1/public-content", {
    headers: { origin: "https://untrusted.example" }
  }), env);
  assert.equal(badOrigin.status, 403);
  const post = await worker.fetch(new Request("https://api.example/api/v1/public-content", { method: "POST" }), env);
  assert.equal(post.status, 405);
});

test("public content OPTIONS is answered at the edge with a one-day preflight cache", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/v1/public-content", {
    method: "OPTIONS", headers: { origin: "https://ugcnoorstudio-ui.github.io" }
  }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-max-age"), "86400");
});

test("private customer identity endpoint remains no-store and requires a bearer token", async () => {
  const response = await worker.fetch(new Request("https://api.example/api/v1/me"), env);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
