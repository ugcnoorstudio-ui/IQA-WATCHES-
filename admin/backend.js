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

  async function checkAuthAvailability() {
    if (!configured()) throw new Error("IQA WATCHES admin backend configuration is missing.");
    const response = await global.fetch(config.url + "/auth/v1/settings", {
      method: "GET",
      headers: { apikey: config.publishableKey, accept: "application/json" },
      cache: "no-store"
    });
    let details = {};
    try { details = await response.json(); } catch (_) {}
    if (response.ok) return true;
    const reason = String(details.message || details.msg || response.statusText || "Supabase Auth is unavailable").slice(0, 220);
    if (response.status === 402 || /exceed_cached_egress_quota/i.test(reason)) {
      throw new Error("Supabase has temporarily restricted this project because its cached egress quota was exceeded (HTTP 402). Admin login cannot continue until the project owner restores Supabase service. Your staff account and database records have not been deleted.");
    }
    throw new Error("Supabase Auth is unavailable (HTTP " + response.status + "): " + reason);
  }

  async function getActiveProfile() {
    const supabaseClient = getClient();
    // A cleared browser auth cache is a normal signed-out state, not a fatal
    // admin bootstrap error. Check storage first, then verify any session with Auth.
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) {
      profile = null;
      const message = String(sessionError.message || sessionError);
      if (/session missing|refresh token|authsessionmissing/i.test(message)) {
        await supabaseClient.auth.signOut({ scope: "local" }).catch(() => {});
        return null;
      }
      throw sessionError;
    }
    if (!sessionData || !sessionData.session) { profile = null; return null; }

    // getSession() only reads local storage; getUser() verifies identity with Auth.
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      profile = null;
      const message = String(userError.message || userError);
      if (userError.status === 401 || /session missing|refresh token|authsessionmissing/i.test(message)) {
        await supabaseClient.auth.signOut({ scope: "local" }).catch(() => {});
        return null;
      }
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
    await checkAuthAvailability();
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
    if (!["create_product", "adjust_inventory", "create_category", "create_brand", "assign_product_taxonomy", "add_product_image", "publish_product", "update_product", "update_product_variant", "update_category", "archive_category", "update_brand", "archive_brand", "update_order_status", "manage_content"].includes(action)) throw new Error("Unsupported administrative action.");
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

  function listFailedImageUploads() {
    try {
      const rows = JSON.parse(global.localStorage?.getItem("iqaFailedImageUploads") || "[]");
      return Array.isArray(rows) ? rows.filter(x => x && typeof x.id === "string") : [];
    } catch (_) { return []; }
  }

  function clearFailedImageUpload(id) {
    try {
      const rows = listFailedImageUploads().filter(x => x.id !== id);
      global.localStorage?.setItem("iqaFailedImageUploads", JSON.stringify(rows));
    } catch (_) {}
  }

  function recordFailedImageUpload(productId, file, altText, error) {
    try {
      const rows = listFailedImageUploads();
      rows.unshift({
        id: global.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(16).slice(2),
        productId: String(productId),
        fileName: String(file?.name || "product-image"),
        mimeType: String(file?.type || ""),
        size: Number(file?.size || 0),
        altText: String(altText || ""),
        error: String(error?.message || error || "Upload failed").slice(0, 500),
        createdAt: new Date().toISOString()
      });
      global.localStorage?.setItem("iqaFailedImageUploads", JSON.stringify(rows.slice(0, 50)));
    } catch (_) {}
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
    try {
      const { data, error } = await getClient().functions.invoke("iqa-product-image-upload", { body: form });
      if (error) throw error;
      if (!data || data.ok !== true) throw new Error(data?.error || "The image upload was not confirmed.");
      return data;
    } catch (error) {
      recordFailedImageUpload(productId, file, altText, error);
      throw error;
    }
  }

  global.IQA_ADMIN_BACKEND = Object.freeze({
    configured, getClient, signIn, signOut, getActiveProfile,
    currentProfile, requireRole, readTable, countTable, mutate, uploadProductImage, listFailedImageUploads, clearFailedImageUpload, onAuthStateChange, checkAuthAvailability
  });
})(window);
