# IQA WATCHES — Local 3D and Motion Asset Workflow

Status: implemented as a browser-local preview workflow; production asset approval and publishing are not connected.
Last updated: 2026-10-30

## Purpose

This document is the single handoff point for preparing approved watch models and motion footage for the IQA WATCHES Admin Motion & Experience Studio. It records what is available, what is deliberately not automated, and what is needed before a real product experience can be published.

## Current admin capabilities

- Select a local `.glb` or `.gltf` file for basic format/metadata inspection.
- Preview a local MP4 or WebM clip in the browser.
- Load an embedded-buffer GLB v2 model in the dependency-free WebGL viewer.
- Rotate the model by dragging; zoom with the wheel or range control; reset the camera.
- Toggle mesh-part separation as a visual inspection aid.
- Complete a five-item owner review checklist after a basic model check.

## Important boundaries

- Selected files remain in the browser session. This workflow does not upload files, save them to Supabase, or transfer them to GitHub.
- The five-item checklist is a preparation gate only. It does not grant legal approval, save an approval record, publish media, or change product data.
- Basic header/JSON checks are not malware scanning, full glTF validation, licensing review, or quality assurance.
- The viewer supports GLB v2 with embedded binary geometry and triangle-list primitives. It is not a complete glTF renderer.
- Textures, animation, skins, morph targets, sparse accessors, external buffers, and arbitrary glTF extensions are outside the current viewer scope.
- Mesh separation is a visual aid, not a mechanically accurate exploded view.
- No genuine IQA WATCHES CAD/GLB model or licensed manufacturing footage is bundled. Do not present sample geometry or editorial imagery as an actual product or manufacturing process.
- No AI provider, paid generation, CDN library, or new paid service is required.

## Owner handoff checklist

Before a file is considered ready for a separate, reviewed publishing implementation, the owner must verify:

1. Commercial-use ownership or documented licence for the model, textures, fonts, footage, and audio.
2. Exact SKU, case dimensions, dial, hands, crown, strap, clasp, finish, and branding against the approved product.
3. Geometry, normals, material appearance, texture references, scale, and orientation in a suitable full-featured validator/viewer.
4. File provenance and a malware/security scan using an approved local security tool.
5. Mobile rendering, keyboard operation, reduced-motion behaviour, performance, and static fallback.
6. Written owner approval for the exact version/hash of every asset.

Do not tick review items merely to unlock the local handoff button. A browser checkbox is not an audit record.

## One-step transfer target (future, not yet implemented)

The intended future workflow is one controlled handoff from an approved asset package into a server-side asset library:

1. Owner selects an approved package and confirms its manifest.
2. Server validates file type, size, content, licence metadata, and checksums.
3. Server stores files in a private/quarantine bucket.
4. A privileged review action records reviewer, timestamp, asset checksum, SKU, and decision.
5. Only an approved asset version can be referenced by the storefront.
6. Publishing requires a separate explicit action and produces an audit event.

This transfer is intentionally not implemented yet. It requires a reviewed Supabase Storage schema, private bucket policies, server-side validation, role checks, audit logging, retention rules, and rollback. Never put a Supabase service-role key or provider secret in browser code. Do not weaken existing Row Level Security to make uploads easier.

## Quality checks

The GitHub Actions workflow checks JavaScript syntax, runs `tests/asset-intake.test.js`, and checks patch whitespace on pull requests to `main`. It also runs on pushes to `main`, so the merged production branch is checked rather than relying only on pre-merge PR checks.

## Next implementation gate

The next substantive asset-library milestone should begin only after the owner supplies the genuine IQA WATCHES model/footage and confirms the desired storage/retention policy. Until then, keep the viewer local-only and do not invent product geometry or manufacturing footage.
