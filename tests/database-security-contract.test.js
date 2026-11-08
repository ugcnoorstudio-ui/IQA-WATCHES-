const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Phase 2 audit records the verified staging/production controls and outstanding gates", () => {
  const doc = read("docs/PHASE2_DATABASE_SECURITY_AUDIT.md");
  for (const phrase of [
    "26/26 tables",
    "checkout_idempotency",
    "iqa_cancel_customer_order",
    "auth_leaked_password_protection",
    "42 migrations",
    "39 migrations",
    "20261107193017",
    "20261108060625",
    "20261108081229",
    "No Production migration was applied",
    "Phase 2 status:"
  ]) assert.ok(doc.includes(phrase), "Missing audit contract: " + phrase);
});

test("Phase 2 live SQL acceptance script is read-only and checks critical boundaries", () => {
  const sql = read("supabase/tests/security_baseline.sql");
  assert.match(sql, /Read-only assertions/);
  assert.match(sql, /relrowsecurity/);
  assert.match(sql, /role_column_grants/);
  assert.match(sql, /checkout_idempotency/);
  assert.match(sql, /iqa_cancel_customer_order/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /cash_on_delivery/);
  assert.match(sql, /stock_reserved = stock_reserved - v_item\.quantity/);
  assert.doesNotMatch(sql, /\b(insert into|update\s+public\.|delete from|create table|alter table|drop table)\b/i);
});

test("security baseline distinguishes intentional private/no-policy and customer RPC exceptions", () => {
  const doc = read("docs/SECURITY_BASELINE.md");
  assert.match(doc, /checkout_idempotency/);
  assert.match(doc, /iqa_cancel_customer_order/);
  assert.match(doc, /leaked-password protection/);
});
