import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORIGIN = "https://ugcnoorstudio-ui.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, error: "Method not allowed." });
  if (req.headers.get("origin") !== ORIGIN) return reply(403, { ok: false, error: "Origin not allowed." });

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || token.length > 8192) return reply(401, { ok: false, error: "Sign in to place an order." });

  const raw = await req.text();
  if (raw.length > 12000) return reply(413, { ok: false, error: "Checkout request is too large." });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return reply(400, { ok: false, error: "Invalid checkout request." }); }
  if (!body || Array.isArray(body) || typeof body !== "object") return reply(400, { ok: false, error: "Invalid checkout request." });

  const idempotencyKey = req.headers.get("x-idempotency-key") || body.idempotency_key;
  if (typeof idempotencyKey !== "string" || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
    return reply(400, { ok: false, error: "A valid checkout request key is required." });
  }
  if (!validUuid(body.address_id)) return reply(400, { ok: false, error: "Choose a saved delivery address." });
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return reply(400, { ok: false, error: "Your bag must contain between 1 and 20 items." });
  }
  const items = body.items.map((item: any) => ({
    variant_id: item?.variant_id,
    quantity: item?.quantity,
  }));
  if (items.some((item: any) => !validUuid(item.variant_id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
    return reply(400, { ok: false, error: "One or more bag items are invalid. Refresh your bag and try again." });
  }

  try {
    const auth = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return reply(401, { ok: false, error: "Your session has expired. Sign in again." });

    const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const [{ data: shippingRow, error: shippingError }, { data: paymentRow, error: paymentError }] = await Promise.all([
      admin.from("store_settings").select("value").eq("key", "shipping").maybeSingle(),
      admin.from("store_settings").select("value").eq("key", "payments").maybeSingle(),
    ]);
    if (shippingError || paymentError) throw new Error("Store checkout configuration could not be verified.");
    const shipping = shippingRow?.value;
    const payments = paymentRow?.value;
    if (!shipping || !Array.isArray(shipping.serviceable_pincodes) ||
        !Number.isFinite(Number(shipping.flat_shipping_fee)) ||
        typeof shipping.currency !== "string" || shipping.currency !== "INR" ||
        !payments || payments.cod_enabled !== true) {
      return reply(409, { ok: false, error: "Online ordering is not open yet. Delivery coverage, shipping charges and Cash on Delivery must first be configured and verified by IQA WATCHES." });
    }

    // Bind every checkout address lookup to the authenticated customer's own profile.
    // The database RPC repeats this ownership check inside the order transaction.
    const { data: customer, error: customerError } = await admin.from("customers")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    if (customerError) throw new Error("Customer profile could not be verified.");
    if (!customer) return reply(409, { ok: false, error: "Complete your customer profile before checkout." });

    const { data: address, error: addressError } = await admin.from("customer_addresses")
      .select("id,recipient_name,phone,address_line1,address_line2,landmark,city,state,postal_code,country")
      .eq("id", body.address_id)
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (addressError || !address) return reply(400, { ok: false, error: "The selected delivery address could not be verified for your account." });
    if (!shipping.serviceable_pincodes.map(String).includes(String(address.postal_code))) {
      return reply(409, { ok: false, error: "Delivery is not available for the selected PIN code." });
    }

    const fee = Number(shipping.flat_shipping_fee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return reply(409, { ok: false, error: "Shipping configuration needs review." });
    const deliverySnapshot = {
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      shipping_method: String(shipping.method || "standard"),
      shipping_fee: fee,
      estimate_label: typeof shipping.estimate_label === "string" ? shipping.estimate_label : null,
      payment_method: "cash_on_delivery",
    };
    const { data, error } = await admin.rpc("iqa_create_customer_order", {
      p_user_id: authData.user.id,
      p_idempotency_key: idempotencyKey,
      p_address_id: body.address_id,
      p_items: items,
      p_shipping_total: fee,
      p_delivery_snapshot: deliverySnapshot,
    });
    if (error) {
      const message = String(error.message || "");
      if (/Insufficient stock|no longer available|not approved|delivery address|valid selling price/i.test(message)) {
        return reply(409, { ok: false, error: message.slice(0, 220) });
      }
      throw error;
    }
    if (!data || data.ok !== true) throw new Error("Order creation was not confirmed.");
    return reply(200, { ok: true, order: data, message: "Your order request has been received. Payment is due only on delivery; the IQA WATCHES team will confirm the order." });
  } catch (_error) {
    return reply(500, { ok: false, error: "Checkout could not be completed. No payment has been collected. Please try again later." });
  }
});
