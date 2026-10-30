import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ugcnoorstudio-ui.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function keyFromMap(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return typeof value?.default === "string" ? value.default : undefined;
  } catch {
    return undefined;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (req.headers.get("origin") !== "https://ugcnoorstudio-ui.github.io") {
    return json({ error: "Origin not allowed." }, 403);
  }

  const bearer = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return json({ error: "Sign in is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || keyFromMap("SUPABASE_PUBLISHABLE_KEYS");
  const legacyService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const service = legacyService || keyFromMap("SUPABASE_SECRET_KEYS");
  if (!url || !anon || !service) {
    console.error("Required server-side Supabase environment is not configured.");
    return json({ error: "Admin mutation service is not configured." }, 503);
  }

  if (Number(req.headers.get("content-length") || "0") > 16384) {
    return json({ error: "Request is too large." }, 413);
  }
  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 16384) return json({ error: "Request is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const standard = ["create_product", "adjust_inventory"];
  const catalogue = ["create_category", "create_brand", "assign_product_taxonomy", "add_product_image", "publish_product"];
  if (
    !body || typeof body !== "object" ||
    ![...standard, ...catalogue].includes(body.action) ||
    !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)
  ) return json({ error: "Unsupported or invalid administrative action." }, 400);

  const verified = await fetch(url + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: "Bearer " + bearer[1] },
  });
  if (!verified.ok) return json({ error: "Your staff session is invalid or expired. Sign in again." }, 401);
  let user: any;
  try { user = await verified.json(); } catch {
    return json({ error: "Unable to verify staff identity." }, 401);
  }
  if (!user?.id) return json({ error: "Unable to verify staff identity." }, 401);

  const rpcName = catalogue.includes(body.action) ? "iqa_catalogue_mutation" : "iqa_admin_mutation";
  const rpcHeaders: Record<string, string> = {
    apikey: service,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  // Legacy service_role is a JWT. New sb_secret keys are opaque API keys
  // and must never be sent in the Authorization: Bearer header.
  if (legacyService) rpcHeaders.Authorization = "Bearer " + legacyService;

  const rpc = await fetch(url + "/rest/v1/rpc/" + rpcName, {
    method: "POST",
    headers: rpcHeaders,
    body: JSON.stringify({ p_actor: user.id, p_action: body.action, p_payload: body.payload }),
  });
  const raw = await rpc.text();
  let result: any;
  try { result = raw ? JSON.parse(raw) : {}; } catch { result = { error: "Unexpected database response." }; }
  if (!rpc.ok) {
    const message = typeof result?.message === "string" ? result.message :
      typeof result?.details === "string" ? result.details : "The database rejected this operation.";
    return json({ error: message }, rpc.status === 403 ? 403 : rpc.status === 404 ? 404 : 400);
  }
  return json(result);
});
