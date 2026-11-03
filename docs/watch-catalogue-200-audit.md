# IQA WATCHES — 200-watch research queue audit

**Date:** 2026-11-04  
**Branch:** `feature/watch-catalogue-200-research-only`  
**Purpose:** Isolated research-only data package; not a public product catalogue.

## Input coverage
- 200 candidate rows: 100 Men and 100 Women.
- Source workbook: `200_watches_men_women_india.xlsx`, sheet `All 200 Watches`.
- Source terms and Amazon India / Flipkart links are discovery inputs, not proof of exact SKU, current availability, seller authorisation, price, specification or image rights.
- Candidate 83 retains its raw source brand value and a normalized matching value.

## Research status
- All 200 candidates are retained as research records.
- The first five Casio family candidates have official-brand variant examples recorded. Each family contains multiple variants, so no single SKU is selected at candidate level.
- Candidates 6–200 remain pending official-source research.
- Exact candidate-level SKU, selected variant, verified specification and India MRP remain null where no unique variant is established.
- Image asset URLs are not supplied and image reuse rights remain unassessed.
- All records remain non-publishable research candidates; fulfilment is not stocked.

## Safety rules
1. Prefer official India manufacturer product pages for exact model, specifications and India MRP.
2. Keep unsupported facts null; never infer from marketplace search results.
3. Do not copy or hotlink marketplace imagery. Official-page visibility does not itself grant commercial image rights.
4. Do not mark research candidates as in stock, verified sellable, or checkout-enabled.
5. Keep this research queue separate from the live storefront until product identity, price, image rights and fulfilment gates are independently cleared.

## Validation scope
Structural validation checks row count, unique candidate numbers, 100/100 audience split, null-handling for unverified facts and CSV/JSON consistency. These checks do not establish product-level truth, legal image rights or fulfilment readiness.

## Next research pass
Continue official-brand research without TinyFish. Resolve one exact variant per candidate where evidence supports it; retain unresolved candidates as pending. Record source URLs and check dates per record. No public import or production listing is authorized by this research package.
