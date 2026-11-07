'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Cloudflare Pages security headers are present and conservative', () => {
  const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  for (const expected of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'X-Frame-Options: DENY',
    'Permissions-Policy: camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security: max-age=15552000'
  ]) assert.ok(headers.includes(expected), 'Missing header: ' + expected);
  assert.match(headers, /\/data\/catalogue\.json[\s\S]*Cache-Control: public, max-age=60, s-maxage=300/);
  assert.doesNotMatch(headers, /Content-Security-Policy:/i,
    'Do not add a CSP until all inline scripts and external origins are audited');
});

test('Cloudflare Pages production deploy is main-only and pull requests get isolated previews', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-cloudflare-pages.yml'), 'utf8');
  assert.ok(workflow.includes('push:\n    branches: [main]'));
  assert.ok(workflow.includes('pull_request:'));
  assert.ok(workflow.includes('deploy-preview:'));
  assert.ok(workflow.includes('github.event.pull_request.head.repo.full_name == github.repository'));
  assert.ok(workflow.includes('preview-disabled.invalid'));
  assert.ok(workflow.includes('--branch=pr-${{ github.event.pull_request.number }}'));
  assert.ok(workflow.includes("if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'"));
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(workflow.includes('needs: preflight'));
  assert.ok(workflow.includes('node --test tests/*.test.js'));
  assert.ok(workflow.includes('npx playwright test'));
  assert.ok(workflow.includes('cloudflare/wrangler-action@v4'));
  assert.ok(workflow.includes('CLOUDFLARE_API_TOKEN'));
  assert.ok(workflow.includes('CLOUDFLARE_ACCOUNT_ID'));
  assert.ok(workflow.includes('pages/projects'));
  assert.ok(workflow.includes('iqa-watches-storefront.pages.dev'));
  assert.ok(workflow.includes('scripts/monitor-public-health.js'));
  assert.doesNotMatch(workflow, /CLOUDFLARE_PAGES_PROJECT:\s*\$\{\{\s*vars\./);
});

test('public health monitor retries transient Pages edge propagation failures', () => {
  const monitor = fs.readFileSync(path.join(root, 'scripts/monitor-public-health.js'), 'utf8');
  assert.ok(monitor.includes('retryDelaysMs = [2000, 4000, 8000, 12000]'));
  assert.ok(monitor.includes('response.status >= 500'));
  assert.ok(monitor.includes('setTimeout(resolve, delay)'));
});

test('scheduled public health monitor targets Cloudflare Pages production', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/iqa-public-health-monitor.yml'), 'utf8');
  assert.ok(workflow.includes('IQA_STOREFRONT_URL: https://iqa-watches-storefront.pages.dev/'));
  assert.ok(workflow.includes('Deploy IQA WATCHES to Cloudflare Pages'));
});

test('deployment runbook documents isolated previews and production-only rollback', () => {
  const guide = fs.readFileSync(path.join(root, 'DEPLOYMENT.md'), 'utf8');
  assert.ok(guide.includes('Pull-request previews and environment isolation'));
  assert.ok(guide.includes('deliberately invalid Supabase endpoint'));
  assert.ok(guide.includes('Rollback procedure'));
  assert.ok(guide.includes('Preview deployments are not valid rollback targets'));
  assert.ok(guide.includes('Rollback to this deployment'));
  assert.ok(guide.includes('IQA WATCHES recurring public health monitor'));
});
