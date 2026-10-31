# Zero-cost ChatGPT listing workflow

## Admin flow

1. Ask ChatGPT to prepare a factual product listing from the real watch photos and the details supplied by the Owner.
2. Open Admin → Product management and paste the JSON into **ChatGPT listing draft intake**.
3. Select **Validate and fill draft form**. The helper fills only matching fields in the existing draft form.
4. Check the product name, unique SKU, published brand/category, audience, selling price, MRP, stock and description.
5. Upload genuine product photos through the existing image-upload workflow.
6. The Owner explicitly creates the draft and later uses the existing Owner-approved publish action after all server checks pass.

## JSON shape accepted by the helper

```json
{
  "name": "Exact product name",
  "sku": "OWNER-ASSIGNED-UNIQUE-SKU",
  "variant_sku": "OWNER-ASSIGNED-VARIANT-SKU",
  "brand": "Exact published brand name",
  "category": "Exact published category name",
  "audience": "Unisex",
  "selling_price": 1200,
  "mrp": 3985,
  "initial_stock": 10,
  "low_stock_threshold": 2,
  "reason": "Opening stock reference",
  "description": "Factual product description based only on verified details."
}
```

Only these keys are mapped: `name`, `sku`, `variant_sku`, `brand`, `category`, `audience`, `selling_price`, `mrp`, `initial_stock`, `low_stock_threshold`, `reason`, and `description`.

## Safety rules

- Do not invent model numbers, movement type, case material, water resistance, warranty, dimensions, brand, or other specifications. Mark unknown facts as unknown and ask the Owner.
- Brand and category must match an existing published dropdown option; otherwise select them manually after creating/approving taxonomy.
- SKU must be checked for uniqueness by the Owner.
- The helper does not save, approve, upload images, adjust stock after creation, or publish.
- No paid AI API or external AI service is called by the website.
- Existing Supabase authentication, server-side validation, audit logging and Owner approval remain authoritative.
