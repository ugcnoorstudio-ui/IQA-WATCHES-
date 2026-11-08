/* Public Supabase client configuration for IQA WATCHES admin.
 * Publishable key is designed for browser use. RLS remains mandatory.
 * NEVER add service_role/secret keys, database passwords, or payment secrets.
 */
window.IQA_SUPABASE_CONFIG = Object.freeze({
  url: "https://nyhyfdququxnorqlnnqq.supabase.co",
  publishableKey: "sb_publishable_coViYn8Fl7F-8JkxhRCstA_zfo_VR9C",
  // Set only after the Production Worker is deployed and verified.
  publicContentProxyUrl: "",
  // Temporarily stop live Supabase content fetches while Cached Egress is restricted.
  publicContentSyncEnabled: false
});
