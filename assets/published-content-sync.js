(function () {
  "use strict";
  const config = window.IQA_SUPABASE_CONFIG;
  const endpoint = "https://nyhyfdququxnorqlnnqq.supabase.co/functions/v1/iqa-public-content";
  // Only the two explicitly approved production storefront hosts may sync live content.
  // This blocks localhost, Playwright, GitHub Pages previews, Cloudflare PR previews,
  // and any future preview/custom host until it is deliberately allowlisted here.
  const hostname = window.location && window.location.hostname;
  const productionHosts = new Set([
    "ugcnoorstudio-ui.github.io",
    "iqa-watches-storefront.pages.dev",
  ]);
  if (window.__IQA_DISABLE_PUBLISHED_CONTENT_SYNC__ === true ||
      !productionHosts.has(hostname)) return;
  function text(node, value) { if (node && typeof value === "string") node.textContent = value; }
  function applyHero(item) {
    const host = document.querySelector(".hero-copy");
    if (!host) return;
    text(host.querySelector("h1"), item.title);
    text(host.querySelector("p"), item.text);
    host.dataset.adminContentSlug = item.slug;
  }
  function applyStory(item) {
    const host = document.querySelector("#story .editorial-copy");
    if (!host) return;
    text(host.querySelector("h2"), item.title);
    text(host.querySelector("p"), item.text);
    host.dataset.adminContentSlug = item.slug;
  }
  function renderCollections(items) {
    document.querySelector("[data-admin-content-section]")?.remove();
    const trust = document.querySelector(".trust-strip");
    if (!trust || !items.length) return;
    const section = document.createElement("section");
    section.className = "section admin-published-collections";
    section.dataset.adminContentSection = "true";
    const head = document.createElement("div");
    head.className = "section-head";
    const copy = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "IQA WATCHES · CURATED COLLECTIONS";
    const title = document.createElement("h2");
    title.textContent = "Explore the edit.";
    copy.append(eyebrow, title); head.append(copy);
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px";
    items.forEach(item => {
      const card = document.createElement("article");
      card.style.cssText = "background:var(--white);border:1px solid var(--line);padding:24px;min-height:170px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between";
      const heading = document.createElement("h3");
      heading.style.cssText = "font:400 25px/1.2 var(--serif);margin:0 0 12px";
      heading.textContent = item.title;
      const description = document.createElement("p");
      description.style.cssText = "font-size:12px;color:var(--muted);line-height:1.8;margin:0 0 18px";
      description.textContent = item.text;
      const link = document.createElement("a");
      link.className = "button light"; link.href = "#shop"; link.textContent = "Explore watches ↗";
      card.append(heading,description,link); grid.append(card);
    });
    section.append(head,grid); trust.insertAdjacentElement("afterend",section);
  }
  async function loadPublishedContent() {
    if (!config || !config.publishableKey) return;
    try {
      const response = await fetch(endpoint,{method:"GET",headers:{apikey:config.publishableKey}});
      if (!response.ok) throw new Error("Published content request failed.");
      const result = await response.json();
      if (!result || result.ok !== true || !Array.isArray(result.items)) throw new Error("Published content response was invalid.");
      const hero = result.items.find(item=>item.content_type==="homepage_hero");
      const story = result.items.find(item=>item.content_type==="story");
      const collections = result.items.filter(item=>item.content_type==="collection");
      if (hero) applyHero(hero);
      if (story) applyStory(story);
      renderCollections(collections);
    } catch (error) {
      console.warn("IQA WATCHES published content sync is temporarily unavailable.",error);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loadPublishedContent,{once:true});
  else loadPublishedContent();
})();
