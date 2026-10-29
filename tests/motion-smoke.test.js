const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Motion Studio stays local-only and exposes the IQA admin module', () => {
  const source = read('admin/motion-studio.js');
  assert.match(source, /global\.IQA_MOTION_STUDIO=Object\.freeze/);
  assert.match(source, /IQA WATCHES — CREATIVE BRIEF/);
  assert.match(source, /human review required/);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test('Motion Studio supports workspace filtering and local brief export', () => {
  const source = read('admin/motion-studio.js');
  assert.match(source, /motionModuleSearch/);
  assert.match(source, /data-motion-module/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /iqa-watches-creative-brief\.txt/);
  assert.match(source, /URL\.revokeObjectURL/);
});

test('Motion Studio styles preserve hidden states and narrow layouts', () => {
  const css = read('admin/motion-studio.css');
  assert.match(css, /\.motion-module\[hidden\]/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(max-width:420px\)/);
});

test('cinematic story remains progressive and reduced-motion aware', () => {
  const js = read('assets/cinematic-story.js');
  const css = read('assets/cinematic-story.css');
  const html = read('index.html');
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /if\(!\('IntersectionObserver' in window\)\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(html, /data-cinematic-story/);
  assert.match(html, /cinematic-story-skip/);
});

test('admin route remains attached to the existing authenticated shell', () => {
  const admin = read('admin/admin.js');
  const html = read('admin/index.html');
  assert.match(admin, /motion-studio/);
  assert.match(admin, /window\.IQA_MOTION_STUDIO\.bind/);
  assert.match(html, /motion-studio\.js/);
  assert.match(html, /auth\.js/);
});
