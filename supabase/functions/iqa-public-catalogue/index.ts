import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN = "https://ugcnoorstudio-ui.github.io";
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

function response(status: number, body: Record<string, unknown>, origin: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": CACHE_CONTROL,
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin === ALLOWED_ORIGIN) headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  return new Response(JSON.stringify(body), { status, headers });
}

function isCloudinaryUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response("Origin not allowed.", { status: 403, headers: { "Vary": "Origin" } });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...(origin === ALLOWED_ORIGIN ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } : {}),
        "Access-Control-Allow-Headers": "apikey, authorization, x-client-info",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "GET") return response(405, { ok: false, error: "Method not allowed." }, origin);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select("id,name,brand,category,audience,description,selling_price,mrp,specs,seo")
      .eq("state", "published")
      .eq("is_sample", false)
      .eq("verified_sellable", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (productError) throw productError;

    const products = productRows || [];
    if (!products.length) {
      return response(200, { ok: true, source: "supabase", products: [], generated_at: new Date().toISOString() }, origin);
    }

    const ids = products.map((product) => product.id);
    const [variantResult, mediaResult] = await Promise.all([
      supabase.from("product_variants")
        .select("id,product_id,sku,options,selling_price,stock_on_hand,stock_reserved,active")
        .in("product_id", ids)
        .eq("active", true)
        .limit(500),
      supabase.from("product_media")
        .select("product_id,image_url,alt_text,sort_order,is_primary,cloudinary_public_id")
        .in("product_id", ids)
        .order("sort_order", { ascending: true })
        .limit(800),
    ]);
    if (variantResult.error) throw variantResult.error;
    if (mediaResult.error) throw mediaResult.error;

    const variants = variantResult.data || [];
    const media = mediaResult.data || [];
    const output = products.flatMap((product) => {
      const availableVariants = variants
        .filter((variant) => variant.product_id === product.id &&
          variant.active === true &&
          number(variant.stock_on_hand) > number(variant.stock_reserved))
        .sort((a, b) => text(a.sku).localeCompare(text(b.sku)));
      const variant = availableVariants[0];
      if (!variant) return [];

      const gallery = media
        .filter((image) => image.product_id === product.id && isCloudinaryUrl(image.image_url))
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) ||
          number(a.sort_order) - number(b.sort_order))
        .map((image) => ({
          src: image.image_url,
          alt: text(image.alt_text) || text(product.name),
          isPrimary: image.is_primary === true,
          sortOrder: number(image.sort_order),
        }));
      if (!gallery.length) return [];

      const specs = product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
        ? product.specs as Record<string, unknown> : {};
      const price = number(variant.selling_price ?? product.selling_price);
      const availableStock = Math.max(0, number(variant.stock_on_hand) - number(variant.stock_reserved));
      if (price <= 0 || availableStock <= 0) return [];

      const primary = gallery[0];
      return [{
        id: product.id,
        variantId: variant.id,
        name: text(product.name),
        brand: text(product.brand),
        category: text(product.category),
        audience: text(product.audience),
        style: text(specs.style ?? specs.display),
        tags: Array.isArray(specs.tags) ? specs.tags.filter((tag): tag is string => typeof tag === "string") : [],
        price,
        compareAt: number(product.mrp) || price,
        stock: availableStock,
        colour: text(specs.band_colour ?? specs.strap_colour ?? specs.case_colour),
        dial: text(specs.dial_colour ?? specs.dial),
        strap: text(specs.strap_material ?? specs.band_material ?? specs.strap),
        sku: text(variant.sku),
        label: availableStock <= 3 ? "Only " + availableStock + " left" : availableStock + " in stock",
        desc: text(product.description),
        image: primary.src,
        imageAlt: primary.alt,
        gallery,
        caseDiameter: text(specs.case_size_mm ?? specs.case_diameter),
        caseThickness: text(specs.case_thickness_mm ?? specs.case_thickness),
        lugToLug: text(specs.lug_to_lug_mm ?? specs.lug_to_lug),
        caseMaterial: text(specs.case_material),
        strapWidth: text(specs.strap_width_mm ?? specs.strap_width),
        movement: text(specs.movement),
        waterResistance: text(specs.water_resistance),
        warranty: text(specs.warranty),
        seo: product.seo && typeof product.seo === "object" ? product.seo : {},
      }];
    });

    return response(200, {
      ok: true,
      source: "supabase",
      products: output,
      generated_at: new Date().toISOString(),
    }, origin);
  } catch (_error) {
    return response(503, { ok: false, error: "The approved product catalogue is temporarily unavailable." }, origin);
  }
});
