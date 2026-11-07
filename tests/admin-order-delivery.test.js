const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin Orders workspace loads live order and status-event records from Supabase', () => {
  const admin = read('admin/admin.js');
  assert.ok(admin.includes("orders:[['orders','id,order_number,state,currency,payable_total,payment_state,delivery_snapshot,created_at,customer_id']"));
  assert.ok(admin.includes('order_status_events'));
  assert.ok(admin.includes('data-order-status'));
  assert.ok(admin.includes('data-order-id='));
});

test('admin order status updates require owner role, reason, and server-confirmed audited mutation', () => {
  const admin = read('admin/admin.js');
  const fn = read('supabase/functions/iqa-admin-mutate/index.ts');
  const migration = read('supabase/migrations/20261101222214_order_status_management_and_checkout_confirmation.sql');
  assert.ok(admin.includes("api.requireRole(['owner'])"));
  assert.ok(admin.includes("api.mutate('update_order_status'"));
  assert.ok(admin.includes('reason:values.reason'));
  assert.ok(fn.includes('"iqa_admin_update_order_status"'));
  assert.ok(migration.includes('insert into public.order_status_events'));
  assert.ok(migration.includes('insert into public.activity_logs'));
});

test('pickup and courier delivery transitions are explicitly constrained in the pickup migration', () => {
  const migration = read('supabase/migrations/20261101222442_enable_pickup_order_status_transition.sql');
  assert.ok(migration.includes("p_new_state not in (''confirmed'',''processing'',''packed'',''ready_for_pickup'',''shipped'',''delivered'',''cancelled'')"));
  assert.ok(migration.includes("(v_order.state=''packed'' and p_new_state in (''ready_for_pickup'',''shipped'',''cancelled''))"));
  assert.ok(migration.includes("(v_order.state=''ready_for_pickup'' and p_new_state=''delivered'')"));
});

test('checkout blocks order creation until delivery coverage and COD settings are configured', () => {
  const checkout = read('supabase/functions/iqa-customer-checkout/index.ts');
  assert.ok(checkout.includes('shipping.serviceable_pincodes'));
  assert.ok(checkout.includes('payments.cod_enabled !== true'));
  assert.ok(checkout.includes('Delivery is not available for the selected PIN code'));
  assert.ok(checkout.includes('admin.rpc("iqa_create_customer_order"'));
});

test('shipping workspace shows order delivery snapshots but does not claim a courier provider is connected', () => {
  const admin = read('admin/admin.js');
  assert.ok(admin.includes("shipping:'Configure serviceable PIN codes, courier integrations, shipping rules and tracking.'"));
  assert.ok(admin.includes("shipping:[['orders','id,order_number,state,delivery_snapshot,created_at'"));
  assert.ok(admin.includes('courier providers are separate external services'));
});
