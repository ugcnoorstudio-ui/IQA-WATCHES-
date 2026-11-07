'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/catalogue.json'), 'utf8'));
const base = 'https://iqa-watches-storefront.pages.dev';
const slugify = value => String(value || 'watch').normalize('NFKD').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'watch';
const xml = value => String(value).replace(/[<>&"']/g, char => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
const lastmod = String(catalogue.generated_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
const urls = [{loc: base + '/', priority:'1.0'}];
for (const product of catalogue.products || []) {
  if (!product || !product.id || !product.name) continue;
  const loc = base + '/products/' + slugify(product.name) + '/' + encodeURIComponent(product.id);
  urls.push({loc, priority:'0.8'});
}
const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(item => '  <url><loc>' + xml(item.loc) + '</loc><lastmod>' + lastmod + '</lastmod><changefreq>weekly</changefreq><priority>' + item.priority + '</priority></url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), body);
process.stdout.write('Generated sitemap.xml with ' + urls.length + ' URLs\n');
