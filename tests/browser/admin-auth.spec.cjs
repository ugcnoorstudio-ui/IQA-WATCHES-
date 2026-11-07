const { test, expect } = require('@playwright/test');

const mockSdk = `
window.__authSession = false;
window.__oauthCalls = [];
window.supabase = {
  createClient() {
    const chain = {
      select() { return this; },
      eq() { return this; },
      async maybeSingle() {
        return { data: { user_id: 'staff-1', display_name: 'IQA Owner', role: 'owner', active: true }, error: null };
      }
    };
    return {
      auth: {
        async getSession() {
          return { data: { session: window.__authSession ? { access_token: 'mock-access-token' } : null }, error: null };
        },
        async getUser() {
          return { data: { user: window.__authSession ? { id: 'staff-1' } : null }, error: null };
        },
        async signInWithPassword() {
          window.__authSession = true;
          return { error: null };
        },
        async signInWithOAuth(options) {
          window.__oauthCalls.push(options);
          return { data: { url: 'https://accounts.google.com/mock' }, error: null };
        },
        async signOut() {
          window.__authSession = false;
          return { error: null };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe() {} } } };
        }
      },
      from() { return chain; },
      functions: { async invoke() { return { data: { ok: true }, error: null }; } }
    };
  }
};
`;

async function openAdmin(page) {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: mockSdk })
  );
  await page.route('**/admin/backend-config.js?*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.IQA_SUPABASE_CONFIG=Object.freeze({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'});"
    })
  );
  await page.goto('/admin/');
}

test('admin recovers to a usable login screen when the browser auth cache is empty', async ({ page }) => {
  await openAdmin(page);
  await expect(page.locator('#authGate')).toBeVisible();
  await expect(page.locator('#loginForm')).toBeVisible();
  await expect(page.locator('#googleSignIn')).toBeVisible();
  await expect(page.locator('#authMessage')).toContainText('No active session found');
});

test('admin email/password login verifies the active staff profile before opening the shell', async ({ page }) => {
  await openAdmin(page);
  await page.locator('#authEmail').fill('owner@example.com');
  await page.locator('#authPassword').fill('mock-password');
  await page.locator('#authSubmit').click();
  await expect(page.locator('.shell')).toBeVisible();
  await expect(page.locator('#staffIdentity')).toContainText('owner');
  await expect(page.locator('#authGate')).toBeHidden();
});

test('admin Google sign-in redirects back to the admin route', async ({ page }) => {
  await openAdmin(page);
  await page.locator('#googleSignIn').click();
  await expect.poll(() => page.evaluate(() => window.__oauthCalls.length)).toBe(1);
  const call = await page.evaluate(() => window.__oauthCalls[0]);
  expect(call.provider).toBe('google');
  expect(call.options.redirectTo).toContain('/admin/');
});
