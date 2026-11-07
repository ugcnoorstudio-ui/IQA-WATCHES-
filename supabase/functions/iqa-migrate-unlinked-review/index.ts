import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev",
]);
const BUCKET = "product-images";
const SOURCE_PATH = "7fea8610-9261-4bbe-b80a-5ba1e2745510/MP000000025248756_437Wx649H_202502030016151.jpeg";
const FOLDER = "iqa-watches/unassigned-review";
const PUBLIC_ID = "legacy-MP000000025248756-437Wx649H-202502030016151";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const env = (name: string) => Deno.env.get(name)?.trim() || "";
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
function secretValue(name: string) {
  const raw = env(name);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.default === "string" ? parsed.default : raw;
  } catch { return raw; }
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
    return out({ error: "Migration configuration is incomplete." }, 503);
  }

  const auth = await fetch(url + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: "Bearer " + bearer[1] }
  });
  if (!auth.ok) return out({ error: "Invalid or expired owner session." }, 401);
  const user = await auth.json();
  if (!user?.id) return out({ error: "Unable to verify user identity." }, 401);

  const headers = { apikey: service, Authorization: "Bearer " + service };
  const profileResponse = await fetch(
    url + "/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq." + encodeURIComponent(user.id),
    { headers: { ...headers, Accept: "application/json" } }
  );
  if (!profileResponse.ok) return out({ error: "Could not verify owner permissions." }, 503);
  const profiles = await profileResponse.json();
  if (!Array.isArray(profiles) || profiles.length !== 1 ||
      profiles[0].role !== "owner" || profiles[0].active !== true) {
    return out({ error: "Active owner permission is required." }, 403);
  }

  const downloadUrl = url + "/storage/v1/object/" + BUCKET + "/" +
    SOURCE_PATH.split("/").map(encodeURIComponent).join("/");
  const download = await fetch(downloadUrl, { headers });
  if (!download.ok) return out({
    error: "Could not download the approved unlinked source image.",
    detail: "Storage returned HTTP " + download.status
  }, 502);
  const contentType = (download.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!contentType.startsWith("image/")) return out({ error: "Source object is not an image." }, 422);
  const bytes = new Uint8Array(await download.arrayBuffer());
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
    return out({ error: "Source image size is invalid.", bytes: bytes.length }, 422);
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { folder: FOLDER, overwrite: "true", public_id: PUBLIC_ID, timestamp };
  const signature = await sha1(canonical(params) + apiSecret);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: contentType }), SOURCE_PATH.split("/").pop() || "legacy-image");
  form.set("folder", FOLDER);
  form.set("public_id", PUBLIC_ID);
  form.set("timestamp", timestamp);
  form.set("overwrite", "true");
  form.set("api_key", apiKey);
  form.set("signature", signature);

  const uploadResponse = await fetch(
    "https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/upload",
    { method: "POST", body: form }
  );
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok || typeof uploaded.secure_url !== "string" ||
      uploaded.public_id !== FOLDER + "/" + PUBLIC_ID ||
      !uploaded.secure_url.startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/")) {
    return out({
      error: "Cloudinary upload could not be verified.",
      detail: uploaded?.error?.message || "Unexpected Cloudinary response"
    }, 502);
  }

  return out({
    ok: true,
    status: "copied_for_review",
    source_bucket: BUCKET,
    source_path: SOURCE_PATH,
    destination_folder: FOLDER,
    public_id: uploaded.public_id,
    secure_url: uploaded.secure_url,
    bytes: bytes.length,
    note: "Original Supabase object remains untouched; no product record was changed."
  });
});
