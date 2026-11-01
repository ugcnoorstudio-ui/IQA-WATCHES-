/* IQA WATCHES admin authentication adapter.
 * Browser client uses only the public publishable key. No service-role access.
 * All business-table authorization remains enforced by PostgreSQL RLS.
 */
(function (global) {
  "use strict";

  const config = global.IQA_SUPABASE_CONFIG;
  const sdk = global.supabase;
  let client = null;
  let profile = null;

  function configured() {
    return Boolean(config &&
      typeof config.url === "string" &&
      /^https:\/\/[^/]+\.supabase\.co$/.test(config.url) &&
      typeof config.publishableKey === "string" &&
      config.publishableKey.startsWith("sb_publishable_") &&
      !config.url.includes("YOUR_PROJECT_REF") &&
      !config.publishableKey.includes("YOUR_SUPABASE"));
  }

  function getClient() {
    if (!configured()) throw new Error("IQA WATCHES admin backend configuration is missing.");
    if (!sdk || typeof sdk.createClient !== "function") {
      throw new Error("Supabase JS could not be loaded. Check your connection and reload.");
    }
    if (!client) {
      client = sdk.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce"
        },
        global: { headers: { "X-Client-Info": "iqa-watches-admin" } }
      });
    }
    return client;
  }

  async function getActiveProfile() {
    const supabaseClient = getClient();
    // getSession() reads browser storage and does not verify the identity with Auth.
    // getUser() makes a server request; only this verified user ID may be used
    // to look up the staff profile that gates the private workspace.
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      profile = null;
      throw userError;
    }
    const user = userData && userData.user;
    if (!user) { profile = null; return null; }

    const { data, error } = await supabaseClient
      .from("staff_profiles")
      .select("user_id,display_name,role,active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    const allowed = ["owner", "administrator", "inventory_manager", "order_manager", "support_staff"];
    if (!data || data.user_id !== user.id || data.active !== true || !allowed.includes(data.role)) {
      profile = null;
      await supabaseClient.auth.signOut();
      throw new Error("This account is not an active IQA WATCHES staff account.");
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
    if (!email || !password) throw new Error("Enter your staff email and password.");
    const supabaseClient = getClient();
    const { error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
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

  function onAuthStateChange(callback) {
    return getClient().auth.onAuthStateChange(callback);
  }

  function currentProfile() { return profile; }

  function requireRole(allowedRoles) {
    if (!profile || profile.active !== true || !allowedRoles.includes(profile.role)) {
      throw new Error("Forbidden: active staff role required.");
    }
    return profile;
  }

  async function readTable(table, columns, options) {
    if (!profile || profile.active !== true) throw new Error("Sign-in is required.");
    const safeTables = new Set([
      "products", "product_variants", "inventory_movements", "categories", "brands", "product_media", "orders", "order_items",
      "order_status_events", "payment_events", "refunds", "coupons",
      "support_tickets", "return_requests", "suppliers", "purchase_orders", "customers", "staff_profiles",
      "content_entries", "reviews", "activity_logs", "integration_events",
      "store_settings"
    ]);
    if (!safeTables.has(table)) throw new Error("Table is not allow-listed.");
    if (typeof columns !== "string" || !/^[a-zA-Z0-9_, ]+$/.test(columns)) {
      throw new Error("Invalid column selection.");
    }
    const supabaseClient = getClient();
    let query = supabaseClient.from(table).select(columns);
    if (options && options.orderBy !== undefined) {
      if (typeof options.orderBy !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(options.orderBy)) {
        throw new Error("Invalid sort column.");
      }
      query = query.order(options.orderBy, { ascending: options.ascending !== false, nullsFirst: false });
    }
    const limit = options && Number.isInteger(options.limit) ? options.limit : 50;
    query = query.limit(Math.min(Math.max(limit, 1), 100));
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function countTable(table) {
    if (!profile || profile.active !== true) throw new Error("Sign-in is required.");
    const safeTables = new Set([
      "products", "product_variants", "inventory_movements", "categories", "brands",
      "product_media", "orders", "order_items", "order_status_events", "payment_events",
      "refunds", "coupons", "support_tickets", "return_requests", "suppliers",
      "purchase_orders", "customers", "staff_profiles", "content_entries", "reviews",
      "activity_logs", "integration_events", "store_settings"
    ]);
    if (!safeTables.has(table)) throw new Error("Table is not allow-listed.");
    const { count, error } = await getClient().from(table).select("id", { count: "exact", head: true });
    if (error) throw error;
    return Number(count || 0);
  }

  async function mutate(action, payload) {
    requireRole(["owner"]);
    if (!["create_product", "adjust_inventory", "create_category", "create_brand", "assign_product_taxonomy", "add_product_image", "publish_product", "update_product", "update_product_variant", "update_category", "archive_category", "update_brand", "archive_brand", "update_order_status"].includes(action)) throw new Error("Unsupported administrative action.");
    const requestPayload = Object.assign({}, payload || {});
    if (!requestPayload.request_id) {
      if (!global.crypto || typeof global.crypto.randomUUID !== "function") {
        throw new Error("Secure request ID generation is unavailable in this browser.");
      }
      requestPayload.request_id = global.crypto.randomUUID();
    }
    const { data, error } = await getClient().functions.invoke("iqa-admin-mutate", { body: { action, payload: requestPayload } });
    if (error) throw error;
    if (!data || data.ok !== true) throw new Error(data?.error || "The operation was not confirmed.");
    return data;
  }

  async function uploadProductImage(productId, file, altText, isPrimary) {
    requireRole(["owner"]);
    if (!/^[0-9a-f-]{36}$/i.test(String(productId || ""))) throw new Error("Choose a valid product.");
    const allowed = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
    if (!file || !allowed[file.type] || file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new Error("Choose a JPG, PNG, WebP or AVIF image up to 5 MB.");
    }
    const form = new FormData();
    form.append("product_id", String(productId));
    form.append("image", file, file.name || "product-image");
    form.append("alt_text", String(altText || "").trim());
    form.append("is_primary", isPrimary === true ? "true" : "false");
    const { data, error } = await getClient().functions.invoke("iqa-product-image-upload", { body: form });
    if (error) throw error;
    if (!data || data.ok !== true) throw new Error(data?.error || "The image upload was not confirmed.");
    return data;
  }

  global.IQA_ADMIN_BACKEND = Object.freeze({
    configured, getClient, signIn, signOut, getActiveProfile,
    currentProfile, requireRole, readTable, countTable, mutate, uploadProductImage, onAuthStateChange
  });
})(window);
