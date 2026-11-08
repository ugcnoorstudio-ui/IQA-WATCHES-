import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set(["https://ugcnoorstudio-ui.github.io", "https://iqa-watches-storefront.pages.dev"]);
function allowedOrigin(origin: string | null): boolean {
  return !!origin && (ALLOWED_ORIGINS.has(origin) || /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin));
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
const env = (name: string) => Deno.env.get(name)?.trim() || "";
function secretValue(name: string) {
  const raw = env(name);
  if (!raw) return "";
  try { const parsed = JSON.parse(raw); return typeof parsed?.default === "string" ? parsed.default : raw; }
  catch { return raw; }
}
function out(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const send = (body: unknown, status = 200) => out(body, status, origin);
  if (req.method === "OPTIONS") {
    if (!allowedOrigin(origin)) return new Response("Origin not allowed.", { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return send({ error: "POST required" }, 405);
  if (!allowedOrigin(origin)) return send({ error: "Origin not allowed" }, 403);
  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return send({ error: "Sign in required" }, 401);

  const supabaseUrl = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || secretValue("SUPABASE_PUBLISHABLE_KEYS");
  const service = env("SUPABASE_SERVICE_ROLE_KEY") || secretValue("SUPABASE_SECRET_KEYS");
  const cloud = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (!supabaseUrl || !anon || !service || !cloud || !apiKey || !apiSecret) {
    return send({ error: "Cloudinary media library configuration is incomplete." }, 503);
  }

  const auth = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: "Bearer " + bearer[1] }
  });
  if (!auth.ok) return send({ error: "Invalid or expired staff session." }, 401);
  const user = await auth.json();
  if (!user?.id) return send({ error: "Unable to verify staff identity." }, 401);

  const profile = await fetch(supabaseUrl + "/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq." + encodeURIComponent(user.id), {
    headers: { apikey: service, Authorization: "Bearer " + service, Accept: "application/json" }
  });
  if (!profile.ok) return send({ error: "Could not verify staff permissions." }, 503);
  const profiles = await profile.json();
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].role !== "owner" || profiles[0].active !== true) {
    return send({ error: "Active owner permission is required." }, 403);
  }

  const endpoint = new URL("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/resources/image/upload");
  endpoint.searchParams.set("prefix", "iqa-watches/");
  endpoint.searchParams.set("max_results", "500");
  const response = await fetch(endpoint, {
    headers: { Authorization: "Basic " + btoa(apiKey + ":" + apiSecret), Accept: "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.resources)) {
    return send({
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

  return send({
    ok: true,
    cloud_name: cloud,
    total: resources.length,
    complete: !payload.next_cursor,
    next_cursor: payload.next_cursor || null,
    resources
  });
});
