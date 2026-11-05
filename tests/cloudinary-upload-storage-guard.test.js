const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Admin product image uploads store bytes in Cloudinary, not Supabase Storage", () => {
  const sourcePath = path.join(
    process.cwd(),
    "supabase",
    "functions",
    "iqa-product-image-upload",
    "index.ts"
  );
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /api\.cloudinary\.com\/v1_1\//);
  assert.match(source, /\/image\/upload/);
  assert.match(source, /iqa-watches\/products/);
  assert.match(source, /iqa_register_cloudinary_product_image/);

  assert.doesNotMatch(source, /\.storage\.from\s*\(/);
  assert.doesNotMatch(source, /\/storage\/v1\/object\//);
  assert.doesNotMatch(source, /storage\.from\([^)]*\)\.upload\s*\(/);
});
