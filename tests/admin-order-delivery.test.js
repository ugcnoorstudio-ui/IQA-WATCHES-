const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin Orders workspace loads live order and status-event records from Supabase', () => {
  const admin = read('admin/admin.js');
  assert.match(admin, /orders:\[\['orders','id,order_number,state,currency,payable_total,payment_state,delivery_snapshot,created_at,customer_id'\]/);
  assert.match(admin, /order_status_events/);
  assert.match(admin, /data-order-status/);
  assert.match(admin, /data-order-id=/);
});

test('admin order status updates require owner role, reason, and server-confirmed audited mutation', () => {
  const admin = read('admin/admin.js');
  const fn = read('supabase/functions/iqa-admin-mutate/index.ts');
  const migration = read('supabase/migrations/20261101222214_order_status_management_and_checkout_confirmation.sql');
  assert.match(admin, /api\.requireRole\(\['owner'\]\)/);
  assert.match(admin, /api\.mutate\('update_order_status'/);
  assert.match(admin, /reason:values\.reason/);
  assert.match(fn, /"iqa_admin_update_order_status"/);
  assert.match(migration, /insert into public\.order_status_events/);
  assert.match(migration, /insert into public\.activity_logs/);
});

test('pickup and courier delivery transitions are explicitly constrained in the pickup migration', () => {
  const migration = read('supabase/migrations/20261101222442_enable_pickup_order_status_transition.sql');
  assert.match(migration, /ready_for_pickup/);
  assert.match(migration, /v_order\.state='packed'/);
  assert.match(migration, /v_order\.state='ready_for_pickup' and p_new_state='delivered'/);
  assert.match(migration, /v_order\.state='shipped' and p_new_state='delivered'/);
});

test('checkout blocks order creation until delivery coverage and COD settings are configured', () => {
  const checkout = read('supabase/functions/iqa-customer-checkout/index.ts');
  assert.match(checkout, /shipping\.serviceable_pincodes/);
  assert.match(checkout, /payments\.cod_enabled !== true/);
  assert.match(checkout, /Delivery is not available for the selected PIN code/);
  assert.match(checkout, /admin\.rpc\("iqa_create_customer_order"/);
});

test('shipping workspace does not claim live courier booking when no courier integration exists', () => {
  const admin = read('admin/admin.js');
  assert.match(admin, /shipping:'Configure serviceable PIN codes, courier integrations, shipping rules and tracking\\.'/);
  assert.match(admin, /shipping:\\[\\['orders','id,order_number,state,delivery_snapshot,created_at'\\]\\]/);
  assert.match(admin, /External integrations/);
  assert.match(admin, /courier providers are separate external services\. None is currently connected and verified/);
});
