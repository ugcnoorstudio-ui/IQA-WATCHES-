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
      /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(config.anonKey) &&
      !config.url.includes("YOUR_PROJECT_REF"));
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

  async function invokeOwnerMutation(action, payload) {
    requireRole(["owner"]);
    const allowed = new Set([
      "create_product",
      "adjust_inventory",
      "create_category",
      "create_brand",
      "assign_product_taxonomy",
      "add_product_image",
      "publish_product"
    ]);
    if (!allowed.has(action)) throw new Error("Administrative action is not allow-listed.");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("A valid action payload is required.");
    }
    const supabaseClient = getClient();
    const { data, error } = await supabaseClient.functions.invoke("iqa-admin-mutate", {
      body: {
        action,
        payload: { ...payload, request_id: payload.request_id || crypto.randomUUID() }
      }
    });
    if (error) {
      const context = error.context;
      let message = error.message || "Administrative operation failed.";
      if (context && typeof context.json === "function") {
        try {
          const body = await context.json();
          if (body && typeof body.error === "string") message = body.error;
        } catch (_) {}
      }
      throw new Error(message);
    }
    if (!data || data.ok !== true) {
      throw new Error((data && data.error) || "The server did not confirm this operation.");
    }
    return data;
  }

  async function createProduct(payload) {
    return invokeOwnerMutation("create_product", payload);
  }

  async function adjustInventory(payload) {
    return invokeOwnerMutation("adjust_inventory", payload);
  }

  async function listTaxonomy() {
    requireRole(["owner", "administrator", "inventory_manager", "order_manager", "support_staff"]);
    const supabaseClient = getClient();
    const [categories, brands] = await Promise.all([
      supabaseClient.from("categories").select("id,name,slug,state").eq("state", "published").order("name").limit(200),
      supabaseClient.from("brands").select("id,name,slug,state").eq("state", "published").order("name").limit(200)
    ]);
    if (categories.error) throw categories.error;
    if (brands.error) throw brands.error;
    return { categories: categories.data || [], brands: brands.data || [] };
  }

  async function assignProductTaxonomy(payload) {
    return invokeOwnerMutation("assign_product_taxonomy", payload);
  }

  async function uploadProductImage(productId, file, options) {
    requireRole(["owner"]);
    if (!productId || !file) throw new Error("Choose a product and image file.");
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (!allowed.has(file.type)) throw new Error("Only JPEG, PNG, WebP or AVIF images are accepted.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" })[file.type];
    const path = productId + "/" + crypto.randomUUID() + "." + ext;
    const supabaseClient = getClient();
    const bucket = supabaseClient.storage.from("product-images");
    const uploaded = await bucket.upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (uploaded.error) throw uploaded.error;
    try {
      const result = await invokeOwnerMutation("add_product_image", {
        product_id: productId,
        bucket_id: "product-images",
        storage_path: path,
        alt_text: String(options?.alt_text || "").trim(),
        sort_order: Number.isInteger(options?.sort_order) ? options.sort_order : 0,
        is_primary: options?.is_primary === true
      });
      return { ...result, storage_path: path, public_url: bucket.getPublicUrl(path).data.publicUrl };
    } catch (error) {
      const cleanup = await bucket.remove([path]);
      if (cleanup.error) throw new Error((error.message || "Image registration failed.") + " Uploaded file cleanup also failed; contact the owner before retrying.");
      throw error;
    }
  }

  async function createCategory(payload) {
    return invokeOwnerMutation("create_category", payload);
  }

  async function createBrand(payload) {
    return invokeOwnerMutation("create_brand", payload);
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
    listInventory,
    listTaxonomy,
    createProduct,
    assignProductTaxonomy,
    uploadProductImage,
    adjustInventory,
    createCategory,
    createBrand
  });
})(window);
