-- Staging bootstrap only. No production business data is copied by this migration.
-- Business schema migrations will be added after the production schema and RLS
-- policies have been inventoried and mapped to Cloudflare D1.
CREATE TABLE IF NOT EXISTS _migration_ledger (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  checksum TEXT NOT NULL
);
