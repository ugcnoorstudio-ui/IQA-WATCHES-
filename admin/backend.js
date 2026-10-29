/* NOOR WATCHES admin backend adapter.
 * Add only after backend-config.js and Supabase JS v2 are configured.
 * This module deliberately exposes no service-role access and no generic write API.
 */
(function (global) {
  "use strict";

  const config = global.NOOR_SUPABASE_CONFIG;
  const sdk = global.supabase;
  let client = null;
  let profile = null;

  function configured() {
    return Boolean(config && typeof config.url === "string" &&
      /^https:\/\/[^/]+\.supabase\.co$/.test(config.url) &&
      typeof config.anonKey === "string" &&
      config.anonKey.length > 20 &&
      !config.url.includes("YOUR_PROJECT_REF") &&
      !config.anonKey.includes("YOUR_SUPABASE"));
  }

  function getClient() {
    if (!configured()) throw new Error("Admin backend is not configured.");
    if (!sdk || typeof sdk.createClient !== "function") {
      throw new Error("Supabase JS v2 has not been loaded.");
    }
    if (!client) {
      client = sdk.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: { headers: { "X-Client-Info": "noor-watches-admin" } }
      });
    }
    return client;
  }

  async function getActiveProfile() {
    const supabaseClient = getClient();
    // getUser() verifies the access token with Supabase Auth; do not use
    // locally persisted getSession() user data as the identity authority.
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();
    if (userError) {
      profile = null;
      await supabaseClient.auth.signOut();
      throw userError;
    }
    const user = userData && userData.user;
    if (!user) { profile = null; return null; }

    // RLS intentionally permits staff to read only their own profile.
    const { data, error } = await supabaseClient
      .from("staff_profiles")
      .select("user_id,display_name,role,active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    if (!data || data.user_id !== user.id || data.active !== true ||
        !["owner", "administrator", "inventory_manager", "order_manager", "support_staff"].includes(data.role)) {
      profile = null;
      await supabaseClient.auth.signOut();
      throw new Error("This account is not an active authorized staff account.");
    }
    profile = Object.freeze({
      userId: data.user_id,
      displayName: data.display_name || "",
      role: data.role,
      active: true
    });
    return profile;
  }

  async function signIn(email, password) {
    if (!email || !password) throw new Error("Email and password are required.");
    const supabaseClient = getClient();
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      return await getActiveProfile();
    } catch (error) {
      await supabaseClient.auth.signOut();
      throw error;
    }
  }

  async function signOut() {
    const supabaseClient = getClient();
    const { error } = await supabaseClient.auth.signOut();
    profile = null;
    if (error) throw error;
  }

  function currentProfile() { return profile; }

  function requireRole(allowedRoles) {
    if (!profile || profile.active !== true || !allowedRoles.includes(profile.role)) {
      throw new Error("Forbidden: active staff role required.");
    }
    return profile;
  }

  async function readTable(table, columns, options) {
    // Read-only helper. Actual authorization must still be enforced by database RLS.
    if (!profile || profile.active !== true) throw new Error("Sign-in is required.");
    const safeTables = new Set([
      "products", "product_variants", "inventory_movements", "orders",
      "order_status_events", "payment_events", "refunds", "coupons",
      "support_tickets", "return_requests", "suppliers", "purchase_orders",
      "content_entries", "reviews", "activity_logs", "integration_events",
      "store_settings"
    ]);
    if (!safeTables.has(table)) throw new Error("Table is not allow-listed.");
    if (typeof columns !== "string" || !/^[a-zA-Z0-9_, ]+$/.test(columns)) {
      throw new Error("Invalid column selection.");
    }
    const supabaseClient = getClient();
    let query = supabaseClient.from(table).select(columns);
    const limit = options && Number.isInteger(options.limit) ? options.limit : 50;
    query = query.limit(Math.min(Math.max(limit, 1), 100));
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function listProducts(limit) {
    requireRole(["owner", "administrator", "inventory_manager", "order_manager", "support_staff"]);
    const supabaseClient = getClient();
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const { data, error } = await supabaseClient
      .from("products")
      .select("id,name,sku,brand,category,audience,selling_price,mrp,state,is_sample,verified_sellable,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return data || [];
  }

  async function listInventory(limit) {
    requireRole(["owner", "administrator", "inventory_manager"]);
    const supabaseClient = getClient();
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const { data, error } = await supabaseClient
      .from("product_variants")
      .select("id,product_id,sku,options,selling_price,stock_on_hand,stock_reserved,low_stock_threshold,active")
      .order("sku", { ascending: true })
      .limit(safeLimit);
    if (error) throw error;
    return data || [];
  }

  global.NOOR_ADMIN_BACKEND = Object.freeze({
    configured,
    signIn,
    signOut,
    getActiveProfile,
    currentProfile,
    requireRole,
    readTable,
    listProducts,
    listInventory
  });
})(window);
