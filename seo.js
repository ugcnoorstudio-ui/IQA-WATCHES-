(function () {
  'use strict';
  const HOME_TITLE = 'IQA WATCHES | Elevate your style.';
  const HOME_DESCRIPTION = 'Explore the IQA WATCHES collection of considered everyday watch styles, with clear product details and secure shopping.';
  const slugify = value => String(value || 'watch').normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'watch';
  const productPath = product => '/products/' + slugify(product && product.name) + '/' + encodeURIComponent(String(product && product.id || ''));
  function meta(selector, attribute, name, content) {
    let node = document.head.querySelector(selector);
    if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, name); document.head.appendChild(node); }
    node.setAttribute('content', String(content || ''));
  }
  function canonical(url) {
    let node = document.head.querySelector('link[rel="canonical"]');
    if (!node) { node = document.createElement('link'); node.rel = 'canonical'; document.head.appendChild(node); }
    node.href = url;
  }
  function clearProductSeo() {
    document.title = HOME_TITLE;
    meta('meta[name="description"]', 'name', 'description', HOME_DESCRIPTION);
    meta('meta[property="og:type"]', 'property', 'og:type', 'website');
    meta('meta[property="og:title"]', 'property', 'og:title', HOME_TITLE);
    meta('meta[property="og:description"]', 'property', 'og:description', HOME_DESCRIPTION);
    meta('meta[property="og:url"]', 'property', 'og:url', location.origin + '/');
    meta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary');
    canonical(location.origin + '/');
    document.getElementById('iqa-product-jsonld')?.remove();
  }
  function applyProductSeo(product) {
    if (!product || !product.id || !product.name) return clearProductSeo();
    const url = new URL(productPath(product), location.origin).href;
    const description = String(product.desc || ('Explore ' + product.name + ' from IQA WATCHES.')).replace(/\s+/g, ' ').slice(0, 300);
    const images = [...new Set([...(Array.isArray(product.gallery) ? product.gallery.map(x => x && x.src) : []), product.image].filter(x => typeof x === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(x)))];
    document.title = product.name + ' | IQA WATCHES';
    meta('meta[name="description"]', 'name', 'description', description);
    meta('meta[property="og:type"]', 'property', 'og:type', 'product');
    meta('meta[property="og:title"]', 'property', 'og:title', product.name + ' | IQA WATCHES');
    meta('meta[property="og:description"]', 'property', 'og:description', description);
    meta('meta[property="og:url"]', 'property', 'og:url', url);
    meta('meta[property="og:image"]', 'property', 'og:image', images[0] || '');
    meta('meta[name="twitter:card"]', 'name', 'twitter:card', images.length ? 'summary_large_image' : 'summary');
    canonical(url);
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: String(product.name),
      description,
      image: images,
      brand: { '@type': 'Brand', name: String(product.brand || 'IQA WATCHES') },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'INR',
        price: Number(product.price).toFixed(2),
        availability: Number(product.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition'
      }
    };
    if (product.sku && product.sku !== 'Not listed') schema.sku = String(product.sku);
    let script = document.getElementById('iqa-product-jsonld');
    if (!script) { script = document.createElement('script'); script.id = 'iqa-product-jsonld'; script.type = 'application/ld+json'; document.head.appendChild(script); }
    script.textContent = JSON.stringify(schema);
  }
  window.iqaProductPath = productPath;
  window.iqaApplyProductSeo = applyProductSeo;
  window.iqaClearProductSeo = clearProductSeo;
  clearProductSeo();
})();