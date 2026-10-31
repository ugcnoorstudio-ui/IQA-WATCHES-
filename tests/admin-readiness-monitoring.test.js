const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin readiness distinguishes database checks from external providers and recovery', () => {
  const admin = read('admin/admin.js');
  assert.match(admin, /Payment gateway, transactional email and courier providers/);
  assert.match(admin, /No provider credentials or verified webhook are configured/);
  assert.match(admin, /19 database access checks/);
  assert.match(admin, /Full backup retention, restore drills/);
});

test('admin readiness explains recurring public health schedule and its coverage', () => {
  const admin = read('admin/admin.js');
  assert.match(admin, /Recurring public health checks/);
  assert.match(admin, /every 30 minutes/);
  assert.match(admin, /storefront, admin shell and public Supabase catalogue/);
  assert.match(admin, /GitHub Actions/);
});

test('recurring monitor workflow runs on a 30-minute schedule and manual dispatch', () => {
  const workflow = read('.github/workflows/iqa-public-health-monitor.yml');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron: '\*\/30 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node scripts\/monitor-public-health\.js/);
});

test('public monitor checks storefront, admin, public config and approved catalogue without secrets', () => {
  const script = read('scripts/monitor-public-health.js');
  assert.match(script, /IQA_STOREFRONT_URL/);
  assert.match(script, /admin\/backend-config\.js/);
  assert.match(script, /sb_publishable_/);
  assert.match(script, /\/rest\/v1\/products/);
  assert.match(script, /verified_sellable/);
  assert.doesNotMatch(script, /service_role|secret_key|password/i);
});
