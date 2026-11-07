import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev",
]);
const FOLDER = "iqa-watches/brand";
const SOURCES = [
  { key: "favicon", path: "assets/iqa-watches-favicon.svg", publicId: "iqa-watches-favicon" },
  { key: "header-logo", path: "assets/iqa-watches-header-logo.svg", publicId: "iqa-watches-header-logo" },
  { key: "primary-logo", path: "assets/iqa-watches-primary-logo.svg", publicId: "iqa-watches-primary-logo" }
];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const env = (name: string) => Deno.env.get(name)?.trim() || "";
function secretValue(name: string) {
  const raw = env(name);
  if (!raw) return "";
  try { const parsed = JSON.parse(raw); return typeof parsed?.default === "string" ? parsed.default : raw; }
  catch { return raw; }
}
function out(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function canonical(params: Record<string, string>) {
  return Object.keys(params).sort().map(k => k + "=" + params[k]).join("&");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return ALLOWED_ORIGINS.has(req.headers.get("origin") || "")
      ? new Response("ok", { headers: CORS })
      : new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  if (!ALLOWED_ORIGINS.has(req.headers.get("origin") || "")) return out({ error: "Origin not allowed" }, 403);
  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return out({ error: "Sign in required" }, 401);

  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || secretValue("SUPABASE_PUBLISHABLE_KEYS");
  const service = env("SUPABASE_SERVICE_ROLE_KEY") || secretValue("SUPABASE_SECRET_KEYS");
  const cloud = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (!url || !anon || !service || !cloud || !apiKey || !apiSecret) {
    return out({ error: "Brand asset migration configuration is incomplete." }, 503);
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
      const sourceUrl = "https://raw.githubusercontent.com/ugcnoorstudio-ui/IQA-WATCHES-/main/" + source.path;
      const remote = await fetch(sourceUrl, { headers: { "User-Agent": "IQA-WATCHES-Brand-Asset-Migration/1.0" } });
      if (!remote.ok) {
        results.push({ key: source.key, status: "source_fetch_failed", detail: "HTTP " + remote.status });
        continue;
      }
      const bytes = new Uint8Array(await remote.arrayBuffer());
      if (!bytes.length || bytes.length > 1024 * 1024) {
        results.push({ key: source.key, status: "invalid_source_size", bytes: bytes.length });
        continue;
      }
      const svg = new TextDecoder().decode(bytes);
      if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg) ||
          /<script\b|\bon[a-z]+\s*=|<foreignObject\b|(?:href|xlink:href)\s*=\s*["']https?:/i.test(svg)) {
        results.push({ key: source.key, status: "unsafe_or_invalid_svg" });
        continue;
      }

      const timestamp = String(Math.floor(Date.now() / 1000));
      const params = { folder: FOLDER, overwrite: "true", public_id: source.publicId, timestamp };
      const signature = await sha1(canonical(params) + apiSecret);
      const form = new FormData();
      form.set("file", new Blob([bytes], { type: "image/svg+xml" }), source.path.split("/").pop() || "brand.svg");
      form.set("folder", FOLDER);
      form.set("public_id", source.publicId);
      form.set("timestamp", timestamp);
      form.set("overwrite", "true");
      form.set("api_key", apiKey);
      form.set("signature", signature);

      const uploadResponse = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/upload", {
        method: "POST",
        body: form
      });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok || typeof uploaded.secure_url !== "string" ||
          uploaded.public_id !== FOLDER + "/" + source.publicId ||
          !uploaded.secure_url.startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/") ||
          !uploaded.secure_url.endsWith(".svg")) {
        results.push({ key: source.key, status: "cloudinary_upload_failed", detail: uploaded?.error?.message || "Unexpected Cloudinary response" });
        continue;
      }
      results.push({
        key: source.key,
        status: "migrated",
        source_path: source.path,
        public_id: uploaded.public_id,
        secure_url: uploaded.secure_url,
        bytes: bytes.length
      });
    } catch (error) {
      results.push({ key: source.key, status: "error", detail: error instanceof Error ? error.message : String(error) });
    }
  }

  const migrated = results.filter(x => x.status === "migrated").length;
  return out({ ok: migrated === SOURCES.length, total: SOURCES.length, migrated, failed: SOURCES.length - migrated, results });
});
