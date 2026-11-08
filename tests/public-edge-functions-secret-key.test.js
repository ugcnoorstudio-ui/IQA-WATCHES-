import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicContent = await readFile(new URL('../supabase/functions/iqa-public-content/index.ts', import.meta.url), 'utf8');
const publicCatalogue = await readFile(new URL('../supabase/functions/iqa-public-catalogue/index.ts', import.meta.url), 'utf8');

for (const [name, source] of [['public-content', publicContent], ['public-catalogue', publicCatalogue]]) {
  test(name + ' prefers the current Supabase secret key and retains a legacy fallback', () => {
    assert.match(source, /SUPABASE_SECRET_KEYS/);
    assert.match(source, /keys\.default/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(source, /function serviceKey\(\)/);
    assert.doesNotMatch(source, /const (SERVICE_KEY|SERVICE_ROLE_KEY) = Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)!/);
  });
}
