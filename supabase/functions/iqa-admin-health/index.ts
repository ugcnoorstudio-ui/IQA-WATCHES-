import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGINS = new Set(["https://ugcnoorstudio-ui.github.io", "https://iqa-watches-storefront.pages.dev"]);
function allowedOrigin(origin: string | null): boolean {
  return !!origin && (ALLOWED_ORIGINS.has(origin) || /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin));
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin"
  };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
const TABLES = [
  ["Products", "products"], ["Variants", "product_variants"],
  ["Inventory", "inventory_movements"], ["Orders", "orders"],
  ["Customers", "customers"], ["Payments", "payment_events"],
  ["Refunds", "refunds"], ["Shipping", "orders"],
  ["Coupons", "coupons"], ["Support", "support_tickets"],
  ["Returns", "return_requests"], ["Suppliers", "suppliers"],
  ["Purchase orders", "purchase_orders"], ["Content", "content_entries"],
  ["Reviews", "reviews"], ["Staff profiles", "staff_profiles"],
  ["Activity logs", "activity_logs"], ["Integration events", "integration_events"],
  ["Store settings", "store_settings"]
] as const;

function reply(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const send = (status: number, body: Record<string, unknown>) => reply(status, body, origin);
  if (req.method === "OPTIONS") {
    if (!allowedOrigin(origin)) return new Response("Origin not allowed.", { status: 403 });
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return send(405, { ok: false, error: "Method not allowed." });
  if (!allowedOrigin(origin)) return send(403, { ok: false, error: "Origin not allowed." });
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token.length > 8192) return send(401, { ok: false, error: "Sign-in required." });

  try {
    const auth = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: authError } = await auth.auth.getUser(token);
    if (authError || !userData.user) return send(401, { ok: false, error: "Invalid or expired session." });

    const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: staff, error: staffError } = await admin.from("staff_profiles")
      .select("user_id,role,active").eq("user_id", userData.user.id).maybeSingle();
    if (staffError) throw staffError;
    if (!staff || staff.user_id !== userData.user.id || staff.active !== true || staff.role !== "owner") {
      return send(403, { ok: false, error: "Active IQA WATCHES owner role required." });
    }

    const checks = await Promise.all(TABLES.map(async ([label, table]) => {
      const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
      return { name: label, table, ok: !error, count: error ? null : count, error: error ? String(error.message).slice(0, 160) : null };
    }));
    const failed = checks.filter(x => !x.ok).length;
    return send(200, {
      ok: true, checked_at: new Date().toISOString(), actor_role: "owner",
      database: failed === 0 ? "connected" : "degraded",
      summary: { passed: checks.length - failed, failed, total: checks.length },
      checks
    });
  } catch (_error) {
    return send(500, { ok: false, error: "Health check failed. Review Supabase function logs." });
  }
});