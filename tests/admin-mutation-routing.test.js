const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin mutation edge function routes order status and content to their audited database RPCs', () => {
  const fn = read('supabase/functions/iqa-admin-mutate/index.ts');
  assert.match(fn, /orderAction="update_order_status"/);
  assert.match(fn, /contentAction="manage_content"/);
  assert.match(fn, /"iqa_admin_update_order_status"/);
  assert.match(fn, /"iqa_manage_content"/);
  assert.match(fn, /p_order_id:body\.payload\.order_id/);
  assert.match(fn, /p_new_state:body\.payload\.state/);
  assert.match(fn, /p_reason:body\.payload\.reason/);
  assert.match(fn, /Active IQA WATCHES owner role required/);
});

test('admin product creation accepts at most eight photos, matching the product gallery workflow', () => {
  const admin = read('admin/admin.js');
  assert.match(admin, /if\(files\.length>8\)throw new Error\('Upload no more than 8 product photos\.'\)/);
  assert.match(admin, /if\(files\.length>8\)throw new Error\('You can upload up to 8 images for one product at a time\.'\)/);
});

test('database enforces the eight-image cap under concurrent uploads by locking the parent product', () => {
  const migration = read('supabase/migrations/20261107193017_enforce_eight_product_images.sql');
  assert.match(migration, /before insert on public\.product_media/i);
  assert.match(migration, /from public\.products[\s\S]*for update/i);
  assert.match(migration, /select count\(\*\)[\s\S]*from public\.product_media/i);
  assert.match(migration, /v_count >= 8/);
  assert.match(migration, /at most 8 images/i);
  assert.match(migration, /security invoker/i);
  assert.doesNotMatch(migration, /security definer/i);
});
