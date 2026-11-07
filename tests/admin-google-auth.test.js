const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('admin sign-in offers Google OAuth and email/password without a prefilled mailbox', () => {
  const html = read('admin/index.html');
  assert.match(html, /id="googleSignIn"[^>]*type="button"/);
  assert.match(html, /id="authEmail"[^>]*placeholder="name@example\.com"/);
  assert.doesNotMatch(html, /value="ugcnoorstudio@gmail\.com"/);
  assert.match(html, /id="loginForm"/);
});

test('Google OAuth returns to the published admin route and still uses staff verification', () => {
  const auth = read('admin/auth.js');
  const backend = read('admin/backend.js');
  assert.match(auth, /signInWithOAuth\(\{[\s\S]*provider:'google'/);
  assert.match(auth, /redirectTo:window\.location\.origin\+window\.location\.pathname/);
  assert.match(auth, /backend\.getActiveProfile\(\)/);
  assert.match(backend, /staff_profiles/);
  assert.match(backend, /data\.active !== true/);
  assert.match(backend, /!allowed\.includes\(data\.role\)/);
});

test('Google sign-in never grants access solely because an OAuth session exists', () => {
  const auth = read('admin/auth.js');
  assert.match(auth, /Only active staff accounts can enter the admin panel/);
  assert.match(auth, /if\(profile\)unlock\(profile\);else lock/);
  assert.match(auth, /backend\.getActiveProfile\(\)/);
});
