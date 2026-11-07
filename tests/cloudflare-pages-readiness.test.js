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
  assert.match(workflow, /push:[\s\S]*branches: \[main\]/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /deploy-preview:/);
  assert.match(workflow, /github.event.pull_request.head.repo.full_name == github.repository/);
  assert.match(workflow, /preview-disabled\\.invalid/);
  assert.match(workflow, /--branch=pr-\\$\\{\\{ github.event.pull_request.number \\}\\}/);
  assert.match(workflow, /if: github.event_name != 'pull_request' && github.ref == 'refs\\/heads\\/main'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /needs: preflight/);
  assert.match(workflow, /node --test tests\/\*\.test\.js/);
  assert.match(workflow, /npx playwright test/);
  assert.match(workflow, /cloudflare\/wrangler-action@v4/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /pages\/projects/);
  assert.match(workflow, /iqa-watches-storefront\.pages\.dev/);
  assert.match(workflow, /scripts\/monitor-public-health\.js/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_PAGES_PROJECT:\s*\$\{\{\s*vars\./);
});
