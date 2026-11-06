const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const scanRoots = [
  "admin",
  "assets",
  "supabase/functions",
  "customer-storefront.js",
  "routes.js",
  "index.html",
];
const extensions = new Set([".js", ".ts", ".tsx", ".jsx", ".html"]);

function collectFiles(entry) {
  const absolute = path.join(root, entry);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((item) => {
    const child = path.join(root, entry, item.name);
    if (item.isDirectory()) return collectFiles(path.relative(root, child));
    return extensions.has(path.extname(item.name)) ? [child] : [];
  });
}

test("runtime upload surfaces do not write image files to Supabase Storage", () => {
  const files = [...new Set(scanRoots.flatMap(collectFiles))];
  assert.ok(files.length > 0, "expected runtime source files to scan");

  const forbidden = [
    /\.storage\s*\.from\s*\([^)]*\)\s*\.upload\s*\(/s,
    /\.uploadToSignedUrl\s*\(/,
    /\.createSignedUploadUrl\s*\(/,
  ];
  const violations = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(source)) violations.push(path.relative(root, file) + ": " + pattern);
    }
  }

  assert.deepEqual(
    violations,
    [],
    "Supabase Storage upload API found in runtime source: " + violations.join("; ")
  );
});
