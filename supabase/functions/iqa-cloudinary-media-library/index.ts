import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://iqa-watches-storefront.pages.dev";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return out({ error: "POST required" }, 405);
  if (req.headers.get("origin") !== ORIGIN) return out({ error: "Origin not allowed" }, 403);
  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return out({ error: "Sign in required" }, 401);

  const supabaseUrl = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || secretValue("SUPABASE_PUBLISHABLE_KEYS");
  const service = env("SUPABASE_SERVICE_ROLE_KEY") || secretValue("SUPABASE_SECRET_KEYS");
  const cloud = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (!supabaseUrl || !anon || !service || !cloud || !apiKey || !apiSecret) {
    return out({ error: "Cloudinary media library configuration is incomplete." }, 503);
  }

  const auth = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: "Bearer " + bearer[1] }
  });
  if (!auth.ok) return out({ error: "Invalid or expired staff session." }, 401);
  const user = await auth.json();
  if (!user?.id) return out({ error: "Unable to verify staff identity." }, 401);

  const profile = await fetch(supabaseUrl + "/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq." + encodeURIComponent(user.id), {
    headers: { apikey: service, Authorization: "Bearer " + service, Accept: "application/json" }
  });
  if (!profile.ok) return out({ error: "Could not verify staff permissions." }, 503);
  const profiles = await profile.json();
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].role !== "owner" || profiles[0].active !== true) {
    return out({ error: "Active owner permission is required." }, 403);
  }

  const endpoint = new URL("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/resources/image/upload");
  endpoint.searchParams.set("prefix", "iqa-watches/");
  endpoint.searchParams.set("max_results", "500");
  const response = await fetch(endpoint, {
    headers: { Authorization: "Basic " + btoa(apiKey + ":" + apiSecret), Accept: "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.resources)) {
    return out({
      error: "Cloudinary asset listing failed.",
      detail: payload?.error?.message || "Unexpected Admin API response"
    }, 502);
  }

  const resources = payload.resources.map((asset: Record<string, unknown>) => ({
    public_id: String(asset.public_id || ""),
    secure_url: String(asset.secure_url || ""),
    version: Number(asset.version || 0),
    format: String(asset.format || ""),
    resource_type: String(asset.resource_type || "image"),
    bytes: Number(asset.bytes || 0),
    width: Number(asset.width || 0),
    height: Number(asset.height || 0),
    created_at: String(asset.created_at || ""),
    asset_folder: String(asset.asset_folder || "")
  })).filter((asset: { public_id: string; secure_url: string }) =>
    asset.public_id.startsWith("iqa-watches/") &&
    asset.secure_url.startsWith("https://res.cloudinary.com/" + cloud + "/")
  );

  return out({
    ok: true,
    cloud_name: cloud,
    total: resources.length,
    complete: !payload.next_cursor,
    next_cursor: payload.next_cursor || null,
    resources
  });
});
