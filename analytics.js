(function () {
  'use strict';
  const config = window.IQA_ANALYTICS_CONFIG || {};
  const verification = String(config.googleSiteVerification || '').trim();
  if (verification) {
    let tag = document.querySelector('meta[name="google-site-verification"]');
    if (!tag) { tag = document.createElement('meta'); tag.name = 'google-site-verification'; document.head.appendChild(tag); }
    tag.content = verification;
  }
  const ga = String(config.ga4MeasurementId || '').trim();
  if (/^G-[A-Z0-9]+$/i.test(ga)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga, { anonymize_ip: true });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
    document.head.appendChild(script);
  }
  const clarity = String(config.clarityProjectId || '').trim();
  if (/^[a-z0-9]{6,20}$/i.test(clarity) && !window.__iqaClarityLoaded) {
    window.__iqaClarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', clarity);
  }
})();