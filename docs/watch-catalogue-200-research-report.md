# IQA WATCHES — 200-candidate research and validation report

**Date:** 2026-11-04  
**Branch:** `feature/purchase-dispatch-workspace`  
**Source workbook:** `200_watches_men_women_india.xlsx`, sheet `All 200 Watches`  
**Deep research run:** `01a1a33b-6827-7998-ae60-65b0eb854e25`  
**Report URL:** https://agent.tinyfish.ai/research/01a1a33b-6827-7998-ae60-65b0eb854e25  
**Status:** Research still running at latest poll (20 sources read; output_ready=false). This report does not claim the candidate-level research is complete.

## Input inventory and schema build

The original workbook was read directly. It contains exactly 200 rows and seven columns: No., For, Brand, Watch / model search term, Style / type, Amazon India search, and Flipkart search. Audience split is 100 Men and 100 Women. Marketplace URLs are search queries, not evidence of a unique product listing, authorised seller, technical specification, India MRP or image licence.

A structured research-ready JSON and CSV were generated from all 200 rows. Each row preserves the original candidate number, audience, brand (including original raw brand text), candidate name, style, and marketplace search URLs. Fields that require candidate-level verification are explicitly null; status is pending research. The generated files are currently available as local working artifacts:
- `/mnt/data/iqa_catalogue/watch-catalogue-200-research.json`
- `/mnt/data/iqa_catalogue/watch-catalogue-200-research.csv`

These are research queue files, not public catalogue data. Do not infer that a candidate is verified merely because it appears in this schema.

## Validation results

Automated structural checks on the generated files:
- Exactly 200 candidate rows: PASS
- Unique candidate numbers: PASS
- Exactly 100 Men and 100 Women: PASS
- Brand and candidate search term present for every row: PASS
- Unverified exact model/SKU fields remain null: PASS
- Unverified India MRP fields remain null: PASS
- Unlicensed image asset URL fields remain null: PASS
- Amazon/Flipkart search URLs retained only as secondary lookup references: PASS

These checks validate row integrity and safe null-handling only. They do not validate product identity, current availability, price, specifications, lifecycle, seller authorisation, image ownership or legal rights.

## Known data quality and mapping issues

- Candidate row 83 has a leading space in the source brand value (` Tommy Hilfiger`). Matching should use a trimmed value while preserving the original raw value for audit.
- Many candidate names identify a family or collection, not a unique SKU. They must resolve to a single exact variant or remain partial/unresolved.
- Candidate audience is a merchandising grouping and is not proof of technical fit.
- Three existing official Casio seed records are kept separate in `data/watch-catalogue-verified-seed.json`: MTP-VT06D-1B, MTP-V006D-7B2, and LTP-1234PGL-1A. The first two currently point to the same broad men's candidate #1 family; this duplicate mapping must be reconciled before merchandising. For all three, direct image asset URL and commercial reuse permission are still pending.
- No physical inventory is held. The catalogue must not claim in-stock status, dispatch readiness or permit checkout based on research alone.

## Research source hierarchy

1. Official India manufacturer product page for exact SKU, technical facts, official description and India MRP.
2. Official global manufacturer page where the exact SKU/variant is confirmed; India price remains null unless an official India source supports it.
3. Official press/media asset portal or documented brand licence for image assets.
4. Amazon India and Flipkart only as secondary SKU/variant/seller cross-checks. Marketplace imagery must not be copied into the site.
5. Other retailers, blogs, aggregators, forums and user-generated listings are not authoritative sources for product facts or rights.

For each candidate, the final research record must include exact SKU, official product page, source date, supported specifications, India MRP/source or null reason, image asset URL, image source page, explicit reuse-rights status, lifecycle status, duplicate/audience check, decision/reason, and supported replacement recommendation if rejected.

## Release gates — all remain closed

- Candidate-level research report has not completed.
- Exact SKU/specification/price evidence is incomplete.
- Image rights are not cleared. Publicly visible brand imagery is not automatically licensed for commercial reuse.
- Supplier, purchase-on-order, delivery, cancellation, returns and refund arrangements are not configured as an operational fulfilment system.
- No physical stock exists; public storefront availability must not imply stock.
- Existing storefront safety filters must remain intact; do not bypass `verified_sellable`, stock or publication safeguards.
- No merge, production deployment or public catalogue import is authorised by this research step.

## Next action

Continue polling the existing TinyFish run ID above; do not start another run. When it completes, retrieve the full report, map its evidence to all 200 candidate numbers, retain nulls for unsupported facts, and regenerate the JSON/CSV with per-row citations and decisions. Then run duplicate, SKU, price, image-rights and schema validation. Merge/deploy only after all release gates are separately satisfied.


## Repository deliverables update — 2026-11-04

The structured research queue is now committed on `feature/purchase-dispatch-workspace`:
- `data/watch-catalogue-200-research.json`
- `data/watch-catalogue-200-research.csv`

Both contain all 200 candidate rows, 100 Men / 100 Women, with unverified model, variant, product page, description, specifications, India MRP, image asset URL and related evidence fields kept null. Each candidate remains `pending_research`; image rights are `not_assessed`; fulfilment status explicitly prevents an in-stock claim. Candidate 83 retains the original raw brand string with its leading space in `inputBrandOriginal`, while `inputBrand` is normalized to `Tommy Hilfiger` for matching.

### Latest validation (repository schema)
- 200 records and 200 unique candidate numbers: PASS.
- 100 Men and 100 Women: PASS.
- All exact SKU, MRP and official image asset URL fields remain null pending evidence: PASS.
- All candidate decisions remain pending; no row is falsely marked verified: PASS.
- CSV regenerated from the JSON record schema: PASS.

These are schema/integrity checks, not product-level verification. The TinyFish run remains RUNNING (20 sources read at latest poll; output_ready=false), so the research queue must not be represented as a completed catalogue.


## Official-source research continuation — 2026-11-04 (TinyFish not used)

Direct official-brand-page research was performed for the first five Casio family candidates. This is evidence enrichment, not a final SKU assignment: each source candidate names a series/family and several colour/band variants exist. Therefore candidate-level `exactModelSku`, `officialProductPage`, `specifications` and `indiaMrpINR` remain null. The candidate-specific variant examples and source URLs are recorded in `familyEvidence`.

- Candidate 1 (MTP-V series): official examples MTP-VT06D-1B (international page) and MTP-V006D-7B2 (India page, MRP ₹2,795). Prior seed contains two models under this broad family; no single model selected.
- Candidate 2 (MTP-VD01): official India examples include MTP-VD01D-1E2V (₹2,995), MTP-VD01D-1BV (₹2,995), and MTP-VD01B-1BV (₹4,195).
- Candidate 3 (MTP-1302): official Europe examples MTP-1302PD-1A1V and MTP-1302PD-3AV. India MRP and India market availability remain unknown.
- Candidate 4 (MTP-1374): official India examples MTP-1374HD-2A2V (₹5,995), MTP-1374HSG-1AV (₹6,595), and MTP-1374L-1AV (₹5,795).
- Candidate 5 (MTP-1381): official India examples MTP-1381D-1AV (₹4,295) and MTP-1381HG-9AV (₹5,195).

### Candidate-level evidence QA
- Every family example has an official brand product URL.
- Multiple variants are explicitly recorded instead of arbitrarily choosing one.
- India MRP values appear only inside the specific sourced variant evidence; candidate-level MRP remains null because the intended variant is unresolved.
- Non-India market evidence is labelled and does not imply India availability.
- No image asset URL or image reuse permission is inferred from the product page.
- No inventory or fulfilment claim is made.

Candidates 6–200 remain pending official-source research. This pass did not use TinyFish. No merge or deployment was performed.
