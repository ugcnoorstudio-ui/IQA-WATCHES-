# Direct live ChatGPT-assisted listing workflow

## Admin flow

1. Ask ChatGPT to prepare factual product copy from the real watch photos and verified details supplied by the Owner.
2. Open Admin → Product management and paste the JSON into **ChatGPT listing details intake**.
3. Select **Validate and fill listing**. The helper fills form fields only.
4. Verify all values, select an existing published brand/category, attach 1–5 genuine product photos, enter the actual selling price, MRP and available stock, and confirm the Owner authorization checkbox.
5. Click **Publish product live** once. The Admin securely creates the product, assigns its published taxonomy, uploads images (first image is primary), then calls the existing server-side publication validator. On success, the listing is live without a separate review queue.

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
  "image_alt_text": "Front view of the exact watch being sold",
  "publish_reason": "Owner confirms the details and authorizes immediate publication.",
  "description": "Factual product description based only on verified details."
}
```

The helper maps these fields into the existing Admin form. Real image files must still be selected from the device; image data is not fabricated by the helper.

## Changes that apply live

- New catalogue entries that pass all publication checks.
- Owner-authorized category and brand creation.
- Product classification changes.
- Product image uploads.
- Inventory adjustments.

These operations use authenticated server-side functions and audit logging. Other Admin modules that still say Preview / Read only are not made writable by this change; they need their own secure backend workflows.

## Publication requirements

- Selling price greater than zero; MRP equal to or greater than selling price.
- At least one active variant with positive available stock.
- Existing published brand and category.
- At least one successfully uploaded primary product image.
- Active Owner session and explicit live-publication confirmation.

## Safety

- Never invent model numbers, movement type, case material, water resistance, warranty, dimensions, brand, or other specifications.
- SKU uniqueness, Owner authorization and publication integrity remain enforced server-side.
- No paid AI API is called by the website; ChatGPT prepares listing copy in this conversation.
- The backend may use an unpublished internal record while assembling a listing. It is not presented as an approval queue. If an upload or server check fails, the product stays unavailable on the storefront and the UI reports that it is not live.
