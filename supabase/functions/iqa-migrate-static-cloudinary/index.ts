import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://ugcnoorstudio-ui.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const SOURCES = [
  { key: "home-hero", url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1800&q=88" },
  { key: "collection-classic", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=88" },
  { key: "collection-sport", url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=88" },
  { key: "collection-editorial", url: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1400&q=88" },
  { key: "collection-modern", url: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1400&q=88" },
  { key: "editorial-detail", url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=1400&q=88" }
];
const env = (name: string) => Deno.env.get(name)?.trim() || "";
function out(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
function key(name: string) {
  const raw = env(name);
  if (!raw) return "";
  try { const parsed = JSON.parse(raw); return typeof parsed?.default === "string" ? parsed.default : raw; }
  catch { return raw; }
}
async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function signatureParams(params: Record<string, string>) {
  return Object.keys(params).sort().map(k => k + "=" + params[k]).join("&");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  if (req.headers.get("origin") !== ORIGIN) return out({ error: "Origin not allowed" }, 403);
  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return out({ error: "Sign in required" }, 401);

  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || key("SUPABASE_PUBLISHABLE_KEYS");
  const service = env("SUPABASE_SERVICE_ROLE_KEY") || key("SUPABASE_SECRET_KEYS");
  const cloud = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const secret = env("CLOUDINARY_API_SECRET");
  if (!url || !anon || !service || !cloud || !apiKey || !secret) {
    return out({ error: "Static image migration configuration is incomplete." }, 503);
  }

  const auth = await fetch(url + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: "Bearer " + bearer[1] }
  });
  if (!auth.ok) return out({ error: "Invalid or expired owner session." }, 401);
  const user = await auth.json();
  if (!user?.id) return out({ error: "Unable to verify owner identity." }, 401);

  const profile = await fetch(url + "/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq." + encodeURIComponent(user.id), {
    headers: { apikey: service, Authorization: "Bearer " + service, Accept: "application/json" }
  });
  if (!profile.ok) return out({ error: "Could not verify owner permissions." }, 503);
  const profiles = await profile.json();
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].role !== "owner" || profiles[0].active !== true) {
    return out({ error: "Active owner permission is required." }, 403);
  }

  const results = [];
  for (const source of SOURCES) {
    try {
      const remote = await fetch(source.url, { headers: { "User-Agent": "IQA-WATCHES-Static-Media-Migration/1.0" } });
      if (!remote.ok) {
        results.push({ key: source.key, status: "source_fetch_failed", detail: "HTTP " + remote.status });
        continue;
      }
      const contentType = (remote.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!contentType.startsWith("image/")) {
        results.push({ key: source.key, status: "invalid_source_type", detail: contentType || "missing content type" });
        continue;
      }
      const bytes = new Uint8Array(await remote.arrayBuffer());
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
        results.push({ key: source.key, status: "invalid_source_size", bytes: bytes.length });
        continue;
      }
      const folder = "iqa-watches/static";
      const publicId = source.key;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const params = { folder, overwrite: "true", public_id: publicId, timestamp };
      const signature = await sha1(signatureParams(params) + secret);
      const form = new FormData();
      form.set("file", new Blob([bytes], { type: contentType }), source.key + "." + (contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1]));
      form.set("folder", folder);
      form.set("public_id", publicId);
      form.set("timestamp", timestamp);
      form.set("overwrite", "true");
      form.set("api_key", apiKey);
      form.set("signature", signature);
      const uploadedResponse = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/upload", {
        method: "POST", body: form
      });
      const uploaded = await uploadedResponse.json();
      if (!uploadedResponse.ok || typeof uploaded.secure_url !== "string" ||
          uploaded.public_id !== folder + "/" + publicId ||
          !uploaded.secure_url.startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/")) {
        results.push({ key: source.key, status: "cloudinary_upload_failed", detail: uploaded?.error?.message || "Invalid Cloudinary response" });
        continue;
      }
      results.push({ key: source.key, status: "migrated", public_id: uploaded.public_id, secure_url: uploaded.secure_url, bytes: bytes.length });
    } catch (error) {
      results.push({ key: source.key, status: "error", detail: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  const failed = results.filter(x => x.status !== "migrated").length;
  return out({ ok: failed === 0, total: SOURCES.length, migrated: results.length - failed, failed, results });
});
