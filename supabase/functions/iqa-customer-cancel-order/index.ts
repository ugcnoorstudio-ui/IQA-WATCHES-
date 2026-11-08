import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_ORIGINS = new Set(["https://ugcnoorstudio-ui.github.io", "https://iqa-watches-storefront.pages.dev"]);
function allowedOrigin(origin: string | null): boolean {
  return !!origin && (ALLOWED_ORIGINS.has(origin) || /^https:\/\/pr-[1-9][0-9]*\.iqa-watches-storefront\.pages\.dev$/.test(origin));
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  if (allowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function reply(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 8192) return send(401, { ok: false, error: "Sign in to cancel an order." });
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return send(413, { ok: false, error: "Cancellation request is too large." });
    body = JSON.parse(raw);
  } catch { return send(400, { ok: false, error: "Invalid cancellation request." }); }
  if (!body || Array.isArray(body) || !validUuid(body.order_id)) return send(400, { ok: false, error: "Choose a valid order to cancel." });
  try {
    const client = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return send(401, { ok: false, error: "Your session has expired. Sign in again." });
    const { data, error } = await client.rpc("iqa_cancel_customer_order", { p_order_id: body.order_id });
    if (error) {
      const message = String(error.message || "");
      if (/Only confirmed|not found in your account|cannot be cancelled|Reserved stock|Customer account/i.test(message)) return send(409, { ok: false, error: message.slice(0, 220) });
      return send(500, { ok: false, error: "The order could not be cancelled securely. Please try again later." });
    }
    if (!data || data.ok !== true) return send(409, { ok: false, error: "Order cancellation was not confirmed." });
    return send(200, { ok: true, order: data, message: "Your confirmed Cash on Delivery order has been cancelled." });
  } catch {
    return send(500, { ok: false, error: "The order could not be cancelled. Please try again later." });
  }
});