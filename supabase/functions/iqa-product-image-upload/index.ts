import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev",
]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

function out(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
function env(name: string) { return Deno.env.get(name)?.trim() || ""; }
function key(name: string) {
  const raw = env(name);
  if (!raw) return "";
  try { const parsed = JSON.parse(raw); return typeof parsed?.default === "string" ? parsed.default : raw; }
  catch { return raw; }
}
function headers(service: string, legacy?: string) {
  const h: Record<string, string> = { apikey: service, "Cache-Control": "no-store" };
  if (legacy) h.Authorization = "Bearer " + legacy;
  return h;
}
function magic(b: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (mime === "image/png") return b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v);
  if (mime === "image/webp") return b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP";
  if (mime === "image/avif") return b.length >= 12 && String.fromCharCode(...b.slice(4,8)) === "ftyp" && String.fromCharCode(...b.slice(8,12)).includes("avif");
  return false;
}
async function sha1Hex(value: string, secret: string) {
  const data = new TextEncoder().encode(value + secret);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2,"0")).join("");
}
function signatureParams(params: Record<string,string>) {
  return Object.keys(params).sort().map(k => k + "=" + params[k]).join("&");
}
async function destroyCloudinary(cloud: string, apiKey: string, apiSecret: string, publicId: string) {
  const timestamp = String(Math.floor(Date.now()/1000));
  const signature = await sha1Hex(signatureParams({ public_id: publicId, timestamp }), apiSecret);
  const body = new FormData();
  body.set("public_id", publicId);
  body.set("timestamp", timestamp);
  body.set("api_key", apiKey);
  body.set("signature", signature);
  await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/destroy", { method: "POST", body });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return ALLOWED_ORIGINS.has(req.headers.get("origin") || "")
      ? new Response("ok", { headers: CORS })
      : new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return out({ error: "Method not allowed." }, 405);
  if (!ALLOWED_ORIGINS.has(req.headers.get("origin") || "")) return out({ error: "Origin not allowed." }, 403);

  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return out({ error: "Sign in is required." }, 401);

  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || key("SUPABASE_PUBLISHABLE_KEYS");
  const legacy = env("SUPABASE_SERVICE_ROLE_KEY");
  const service = legacy || key("SUPABASE_SECRET_KEYS");
  const cloud = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  if (!url || !anon || !service || !cloud || !apiKey || !apiSecret) {
    return out({ error: "Upload service configuration is incomplete. Check the three Cloudinary secrets in Supabase Edge Function Secrets." }, 503);
  }

  if (Number(req.headers.get("content-length") || "0") > 5*1024*1024 + 32768) return out({ error: "Image must be 5 MB or smaller." }, 413);
  const auth = await fetch(url + "/auth/v1/user", { headers: { apikey: anon, Authorization: "Bearer " + bearer[1] } });
  if (!auth.ok) return out({ error: "Your staff session is invalid or expired. Sign in again." }, 401);
  const user = await auth.json();
  if (!user?.id) return out({ error: "Unable to verify staff identity." }, 401);

  const sh = headers(service, legacy);
  const profileResponse = await fetch(url + "/rest/v1/staff_profiles?select=user_id,role,active&user_id=eq." + encodeURIComponent(user.id), {
    headers: { ...sh, Accept: "application/json" }
  });
  if (!profileResponse.ok) return out({ error: "Unable to verify owner permissions." }, 503);
  const profiles = await profileResponse.json();
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].active !== true || profiles[0].role !== "owner") {
    return out({ error: "Active owner permission is required." }, 403);
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return out({ error: "Invalid multipart upload." }, 400); }
  const productId = String(form.get("product_id") || "");
  const alt = String(form.get("alt_text") || "").trim();
  const primary = String(form.get("is_primary") || "false") === "true";
  const file = form.get("image");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) return out({ error: "Choose a valid product." }, 400);
  if (alt.length < 3 || alt.length > 180) return out({ error: "Alt text must be 3–180 characters." }, 400);
  if (!(file instanceof File) || file.size < 1 || file.size > 5*1024*1024) return out({ error: "Choose an image up to 5 MB." }, 400);
  const extensions: Record<string,string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif" };
  const ext = extensions[file.type];
  if (!ext) return out({ error: "Only JPG, PNG, WebP and AVIF images are accepted." }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!magic(bytes, file.type)) return out({ error: "Image contents do not match the declared type." }, 400);

  const productCheck = await fetch(url + "/rest/v1/products?select=id&id=eq." + encodeURIComponent(productId), {
    headers: { ...sh, Accept: "application/json" }
  });
  if (!productCheck.ok) return out({ error: "Unable to verify product." }, 503);
  const products = await productCheck.json();
  if (!Array.isArray(products) || products.length !== 1) return out({ error: "Product not found." }, 404);

  const publicId = crypto.randomUUID();
  const timestamp = String(Math.floor(Date.now()/1000));
  const signed = { folder: "iqa-watches/products", public_id: publicId, timestamp };
  const signature = await sha1Hex(signatureParams(signed), apiSecret);
  const uploadBody = new FormData();
  uploadBody.set("file", new Blob([bytes], { type: file.type }), file.name || ("product-image." + ext));
  uploadBody.set("folder", signed.folder);
  uploadBody.set("public_id", publicId);
  uploadBody.set("timestamp", timestamp);
  uploadBody.set("api_key", apiKey);
  uploadBody.set("signature", signature);

  let uploaded: any;
  try {
    const response = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/image/upload", { method: "POST", body: uploadBody });
    uploaded = await response.json();
    if (!response.ok || typeof uploaded?.secure_url !== "string" || typeof uploaded?.public_id !== "string") {
      return out({ error: "Cloudinary upload failed. " + (typeof uploaded?.error?.message === "string" ? uploaded.error.message : "No image metadata was saved.") }, 502);
    }
  } catch {
    return out({ error: "Cloudinary could not be reached. No image metadata was saved." }, 502);
  }

  if (uploaded.public_id !== "iqa-watches/products/" + publicId || !uploaded.secure_url.startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/")) {
    try { await destroyCloudinary(cloud, apiKey, apiSecret, uploaded.public_id); } catch { /* best-effort cleanup */ }
    return out({ error: "Cloudinary returned an unexpected asset location." }, 502);
  }

  const rpc = await fetch(url + "/rest/v1/rpc/iqa_register_cloudinary_product_image", {
    method: "POST",
    headers: { ...sh, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_actor: user.id, p_product_id: productId, p_image_url: uploaded.secure_url,
      p_cloudinary_public_id: uploaded.public_id, p_alt_text: alt, p_is_primary: primary
    })
  });
  const raw = await rpc.text();
  let result: any;
  try { result = raw ? JSON.parse(raw) : {}; } catch { result = {}; }
  if (!rpc.ok || result?.ok !== true) {
    try { await destroyCloudinary(cloud, apiKey, apiSecret, uploaded.public_id); } catch { /* best-effort cleanup */ }
    return out({ error: typeof result?.message === "string" ? result.message : "Metadata registration failed; Cloudinary asset cleanup was attempted." }, 400);
  }
  return out(result);
});
