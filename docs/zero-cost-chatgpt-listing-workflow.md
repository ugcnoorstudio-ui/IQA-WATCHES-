# Direct live ChatGPT-assisted listing workflow

## Admin flow

1. Ask ChatGPT to prepare factual product copy from the real watch photos and verified details supplied by the Owner.
2. Open Admin → Product management and paste the JSON into **ChatGPT listing details intake**.
3. Select **Validate and fill listing** (the helper fills fields only; it does not save).
4. Verify all values, select the existing published brand/category, attach 1–5 genuine product photos, enter real price and available stock, and confirm the Owner authorization checkbox.
5. Click **Publish product live** once. The Admin performs the secure sequence: create product record, assign the selected published taxonomy, upload images (first image becomes primary), and call the existing server-side publication validator. On success, the product is published and visible on the storefront without a separate review/approval queue.

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
  "reason": "Purchase receipt / opening stock reference",
  "description": "Factual product description based only on verified details."
}
```

Only these keys are mapped: `name`, `sku`, `variant_sku`, `brand`, `category`, `audience`, `selling_price`, `mrp`, `initial_stock`, `low_stock_threshold`, `reason`, and `description`.

## What goes live immediately

- New catalogue entries that pass all publication checks.
- Owner-authorized category and brand creation.
- Product classification changes.
- Product image uploads.
- Inventory adjustments.

These existing operations write through authenticated server-side functions and are audited. Other Admin modules that still say Preview / Read only are not silently made writable by this change; they need their own secure backend workflows first.

## Publication requirements

- Valid selling price greater than zero; MRP cannot be below selling price.
- At least one active variant with positive available stock.
- Existing published brand and category.
- At least one successfully uploaded primary product image.
- Active Owner session and explicit live-publication confirmation.

## Safety rules

- Do not invent model numbers, movement type, case material, water resistance, warranty, dimensions, brand, or other specifications. Mark unknown facts as unknown and ask the Owner.
- SKU must be unique and verified by the server.
- The website does not call a paid AI API. ChatGPT prepares copy in this conversation.
- The helper fills form fields only. The final button performs the authenticated write and immediate publication sequence.
- The backend still uses an unpublished internal state while assembling the product; it is not shown as a user-facing approval queue. If an upload or server check fails, the product remains unavailable on the storefront and the error is shown rather than falsely claiming publication.
