import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_ORIGINS = new Set([
  "https://ugcnoorstudio-ui.github.io",
  "https://iqa-watches-storefront.pages.dev",
]);
const cors = {
  "Access-Control-Allow-Origin": "https://iqa-watches-storefront.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return ALLOWED_ORIGINS.has(req.headers.get("origin") || "")
      ? new Response("ok", { headers: cors })
      : new Response("Forbidden", { status: 403 });
  }
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed." });
  if (!ALLOWED_ORIGINS.has(req.headers.get("origin") || "")) return reply(403, { ok: false, error: "Origin not allowed." });
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 8192) return reply(401, { ok: false, error: "Sign in to cancel an order." });
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return reply(413, { ok: false, error: "Cancellation request is too large." });
    body = JSON.parse(raw);
  } catch { return reply(400, { ok: false, error: "Invalid cancellation request." }); }
  if (!body || Array.isArray(body) || !validUuid(body.order_id)) return reply(400, { ok: false, error: "Choose a valid order to cancel." });
  try {
    const client = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) return reply(401, { ok: false, error: "Your session has expired. Sign in again." });
    const { data, error } = await client.rpc("iqa_cancel_customer_order", { p_order_id: body.order_id });
    if (error) {
      const message = String(error.message || "");
      if (/Only confirmed|not found in your account|cannot be cancelled|Reserved stock|Customer account/i.test(message)) return reply(409, { ok: false, error: message.slice(0, 220) });
      return reply(500, { ok: false, error: "The order could not be cancelled securely. Please try again later." });
    }
    if (!data || data.ok !== true) return reply(409, { ok: false, error: "Order cancellation was not confirmed." });
    return reply(200, { ok: true, order: data, message: "Your confirmed Cash on Delivery order has been cancelled." });
  } catch {
    return reply(500, { ok: false, error: "The order could not be cancelled. Please try again later." });
  }
});