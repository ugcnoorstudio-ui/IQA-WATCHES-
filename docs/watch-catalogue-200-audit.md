# IQA WATCHES — 200-candidate catalogue audit (research in progress)

**Date:** 2026-11-04  
**Branch:** `feature/purchase-dispatch-workspace`  
**Source input:** `200_watches_men_women_india.xlsx` (All 200 Watches sheet)  
**Research run:** `01a1a33b-6827-7998-ae60-65b0eb854e25`  
**Report:** https://agent.tinyfish.ai/research/01a1a33b-6827-7998-ae60-65b0eb854e25  
**Status:** Deep research queued; do not treat the candidate list as verified catalogue data.

## Scope confirmed from source workbook

- 200 candidate rows: 100 Men and 100 Women.
- The workbook provides brand/model search terms and Amazon India / Flipkart search-result URLs, not guaranteed exact product detail pages.
- A number of rows name a model family or collection rather than a unique SKU. These need variant-level resolution before public listing.
- Data quality issue: row 83 has a leading space in the brand value (` Tommy Hilfiger`); normalize for matching while retaining the original source value in the audit trail.
- Candidate audience is a merchandising label, not a technical product fact. Verify the exact variant and do not infer fit solely from the label.
- No physical inventory is held. Research output must not imply stock, dispatch readiness, or checkout availability.

## Verification policy

1. Prefer the official India brand/manufacturer product page for exact SKU, product description, specifications and India MRP.
2. Use official global manufacturer pages only when the exact SKU is clear; mark India pricing separately if not published.
3. Amazon India and Flipkart may be used only as secondary checks for model/variant and authorised seller context. Search URLs in the workbook are not proof of an exact listing.
4. Never copy marketplace imagery. An image displayed on an official page is not automatically licensed for commercial reuse. Store image asset URL and reuse permission as separate fields.
5. Unknown or conflicting facts remain null with a reason. Do not manufacture SKU, MRP, warranty, specifications or image rights.
6. Candidate families must resolve to one exact variant or remain partial/unresolved. Avoid duplicate SKUs unless distinct colour/size variants are deliberately separate records.
7. Public storefront must not say “In Stock” or enable checkout until actual stock / supplier fulfilment, delivery, cancellation and return handling are configured.

## Initial source-backed checks

- Casio India’s official Collection catalogue exposes current product identifiers and displayed MRPs, including MTP-VT06D-1B (₹4,995), MTP-VT06D-7B (₹4,995), MTP-VT06L-1B (₹4,495), MQ-24DA-1A (₹2,995), LW-204-7A (₹2,495), and LTP-1234PGL-1A (₹4,495). These are useful exact-SKU examples, not a verification of every similarly named candidate. Source: https://www.casio.com/in/watches/casio-collection/
- Titan India’s current catalogue exposes model-level product descriptions and displayed prices, including Lagan Chic, Lagan, Minimals Quartz, Raga Delight, Karishma, Urban Edge and Workwear examples. A collection name alone is not sufficient to identify a unique SKU. Source: https://www.titan.co.in/shop/watches?lang=en_IN
- Fastrack’s official Titan storefront is a live collection source, but individual product variants still need exact model codes and source pages. Source: https://www.titan.co.in/shop/fastrack-watch?lang=en

## Existing exact-SKU research seed (not public listings)

The separate file `data/watch-catalogue-verified-seed.json` contains three Casio records:
- MTP-VT06D-1B — India catalogue MRP ₹4,995.
- MTP-V006D-7B2 — India MRP ₹2,795.
- LTP-1234PGL-1A — India MRP ₹4,495.

For all three, the direct image asset URL and commercial reuse permission remain unresolved. The two men's Casio records currently map to the same broad candidate family (candidate 1); reconcile candidate mapping and prevent duplicate merchandising before importing any record into the storefront.

## Required final deliverable

For every candidate row, provide:
- candidate number, audience, input brand/name;
- resolved brand, exact model/SKU and variant;
- official product page and source date;
- verified description and supported specifications;
- India MRP and official price source, or null with reason;
- official image asset URL, source page, and explicit rights status;
- lifecycle status (current/discontinued/unconfirmed);
- duplicate/audience checks;
- decision (verified / partial / reject) and reason;
- replacement suggestion only when independently supported.

## Release gates

Do not merge catalogue data into the public storefront until:
- exact SKU and source evidence are recorded;
- image rights are cleared or a licensed/user-supplied image is available;
- public availability language reflects the actual supplier/stock model;
- all existing storefront safety filters and tests remain intact.

The current research run is asynchronous. This document is an audit/progress artifact, not the final 200-row report.

## Progress update — 2026-11-04

The full 200-row candidate list from the repository research queue was passed explicitly to the deep-research run `01a1a33b-6827-7998-ae60-65b0eb854e25`. At the latest check the run is still active and has read 20 sources; no final candidate-level conclusions are available yet. The earlier run `01a1a334-398c-7907-a2db-e6dce863b828` is obsolete for this purpose: it incorrectly concluded that the candidate list was absent and must not be used as the 200-row result.
