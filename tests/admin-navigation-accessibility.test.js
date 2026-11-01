const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const adminJs = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');

test('admin controller JavaScript remains syntactically valid', () => {
  new vm.Script(adminJs, { filename: 'admin/admin.js' });
});

test('mobile admin navigation restores focus to its toggle after route selection', () => {
  const routeStart = adminJs.indexOf("const r=e.target.closest('[data-route]');");
  const routeEnd = adminJs.indexOf("const a=e.target.closest('[data-action]');", routeStart);
  assert.notEqual(routeStart, -1, 'expected delegated route navigation handler');
  assert.notEqual(routeEnd, -1, 'expected end of route navigation handler');
  const routeHandler = adminJs.slice(routeStart, routeEnd);
  assert.match(routeHandler, /const restoreFocus=mobileOpen/);
  assert.match(routeHandler, /mobileOpen=false;syncMobileNav\(\);if\(restoreFocus\)\$\('menuToggle'\)\.focus\(\)/);
});

test('mobile navigation keeps expanded state and Escape/backdrop focus behavior', () => {
  assert.match(adminJs, /toggle\.setAttribute\('aria-expanded',String\(mobileOpen\)\)/);
  assert.match(adminJs, /if\(e\.key==='Escape'&&mobileOpen\)\{mobileOpen=false;syncMobileNav\(\);\$\('menuToggle'\)\.focus\(\)\}/);
  assert.match(adminJs, /\$\('sidebarBackdrop'\)\.addEventListener\('click',\(\)=>\{mobileOpen=false;syncMobileNav\(\);\$\('menuToggle'\)\.focus\(\)\}\)/);
});
