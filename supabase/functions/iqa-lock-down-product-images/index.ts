import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev"
]);

function serviceKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, unknown>;
      const key = keys.default;
      if (typeof key === "string" && key.trim()) return key.trim();
    } catch {
      // Fall back while the project finishes migrating legacy API keys.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || "";
}

function allowedOrigin(origin: string | null): boolean {
  return !!origin && (ALLOWED_ORIGINS.has(origin) ||
    /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin));
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff"
  };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function reply(status: number, body: Record<string, unknown>, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function isCloudinaryUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

function containsSupabaseStorageUrl(value: unknown): boolean {
  return JSON.stringify(value ?? null).toLowerCase().includes("supabase.co/storage/");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (origin && !allowedOrigin(origin)) return new Response("Origin not allowed.", { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return reply(405, { ok: false, error: "Method not allowed." }, origin);
  }
  if (origin && !allowedOrigin(origin)) {
    return reply(403, { ok: false, error: "Origin not allowed." }, origin);
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return reply(401, { ok: false, error: "A signed-in owner session is required." }, origin);

  const key = serviceKey();
  if (!SUPABASE_URL || !key) {
    return reply(503, { ok: false, error: "Storage administration is temporarily unavailable." }, origin);
  }

  try {
    const admin = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userResult, error: authError } = await admin.auth.getUser(token);
    const user = userResult?.user;
    if (authError || !user) {
      return reply(401, { ok: false, error: "The owner session could not be verified." }, origin);
    }

    const { data: staff, error: staffError } = await admin
      .from("staff_profiles")
      .select("role,active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (staffError) throw staffError;
    if (!staff || staff.active !== true || staff.role !== "owner") {
      return reply(403, { ok: false, error: "Active IQA WATCHES owner role required." }, origin);
    }

    const [mediaResult, productsResult, orderItemsResult, contentResult, settingsResult] = await Promise.all([
      admin.from("product_media").select("image_url,cloudinary_public_id").limit(1001),
      admin.from("products").select("specs").limit(1001),
      admin.from("order_items").select("product_snapshot").limit(1001),
      admin.from("content_entries").select("body").limit(1001),
      admin.from("store_settings").select("value").limit(1001)
    ]);

    for (const result of [mediaResult, productsResult, orderItemsResult, contentResult, settingsResult]) {
      if (result.error) throw result.error;
    }

    // Supabase's default row cap is 1,000. Fetch one extra row and fail closed
    // rather than silently missing a Storage URL beyond the first 1,000 records.
    if ([mediaResult, productsResult, orderItemsResult, contentResult, settingsResult]
      .some((result) => (result.data?.length ?? 0) > 1000)) {
      return reply(409, {
        ok: false,
        error: "A preflight table exceeds the safe 1,000-row scan limit. No Storage visibility change was made."
      }, origin);
    }

    const media = mediaResult.data ?? [];
    if (media.some((row) => !isCloudinaryUrl(row.image_url) ||
      typeof row.cloudinary_public_id !== "string" || !row.cloudinary_public_id.trim())) {
      return reply(409, {
        ok: false,
        error: "A product image is not fully verified on Cloudinary. Public Storage access was not changed."
      }, origin);
    }

    const records = [
      ...(productsResult.data ?? []).map((row) => row.specs),
      ...(orderItemsResult.data ?? []).map((row) => row.product_snapshot),
      ...(contentResult.data ?? []).map((row) => row.body),
      ...(settingsResult.data ?? []).map((row) => row.value)
    ];
    if (records.some(containsSupabaseStorageUrl)) {
      return reply(409, {
        ok: false,
        error: "A live product, order, content or setting still references Supabase Storage. Public access was not changed."
      }, origin);
    }

    const { data: bucket, error: bucketError } = await admin.storage.getBucket("product-images");
    if (bucketError) throw bucketError;
    if (!bucket) return reply(404, { ok: false, error: "The product-images bucket was not found." }, origin);

    if (bucket.public === false) {
      return reply(200, {
        ok: true,
        public: false,
        already_private: true,
        objects_preserved: true
      }, origin);
    }

    const { error: updateError } = await admin.storage.updateBucket("product-images", { public: false });
    if (updateError) throw updateError;

    const { data: verifiedBucket, error: verifyError } = await admin.storage.getBucket("product-images");
    if (verifyError) throw verifyError;
    if (!verifiedBucket || verifiedBucket.public !== false) {
      throw new Error("Storage API did not confirm private bucket visibility.");
    }

    return reply(200, {
      ok: true,
      public: false,
      already_private: false,
      objects_preserved: true
    }, origin);
  } catch (_error) {
    return reply(503, {
      ok: false,
      error: "The product-images bucket could not be made private. No files were deleted."
    }, origin);
  }
});
