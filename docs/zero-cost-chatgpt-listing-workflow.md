# ChatGPT-assisted product listing intake

## Admin workflow

1. Prepare factual product copy from the real watch photos and verified details supplied by the Owner.
2. Open Admin → Products and find **ChatGPT listing details intake**.
3. Paste one product JSON object and choose **Validate and fill listing**. This only fills form fields; it does not save or publish.
4. Verify every field. Select an existing published brand and category, attach 1–5 genuine product photos, enter the stock-source/reference reason manually, and provide the required publication note.
5. Confirm the Owner authorization checkbox and click **Publish product live** only after checking the actual price, MRP, stock, SKU, image and product facts.

The listing helper is a form-filling aid. The authenticated Admin workflow and server-side publication checks remain responsible for writes and publication.

## JSON shape accepted by the current helper

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
  "description": "Factual product description based only on verified details.",
  "image_alt_text": "Front view of the exact watch being sold",
  "publish_reason": "Owner confirms the verified listing details and authorizes publication."
}
```

The helper maps `name`, `sku`, `variant_sku`, `audience`, `selling_price`, `mrp`, `initial_stock`, `low_stock_threshold`, `description`, `image_alt_text`, and `publish_reason`. It also selects `brand` and `category` when they match existing dropdown options.

The helper does **not** fill the stock-source/reference `reason` field. Enter that manually from the actual purchase receipt or opening-stock record. If a brand or category does not match a published dropdown option, select the correct option manually.

## Publication safeguards

- The final publish action requires the active Owner workflow and its explicit authorization checkbox.
- Selling price must be valid and greater than zero; MRP must not be below selling price.
- The product needs a valid SKU, an existing published brand/category, positive available stock and a genuine primary product image.
- Server-side checks remain authoritative. If an upload or validation fails, do not treat the product as published.
- The listing helper itself does not call an AI API, upload files, write to the database or publish anything.

## Accuracy and security rules

- Never invent model numbers, movement type, case material, water resistance, warranty, dimensions, brand or other specifications.
- Use only information verified from the real product, packaging, manufacturer material or Owner-supplied records. Mark unknown facts as unknown.
- Do not use placeholder, stock or unrelated photos as the primary product image.
- Keep provider credentials and privileged database keys out of browser code.
- Other Admin modules labelled Preview or Read only remain non-writable until their own reviewed server-side workflows are implemented.
