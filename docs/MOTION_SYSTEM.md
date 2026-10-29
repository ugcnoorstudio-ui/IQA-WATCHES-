# NOOR WATCHES — Colour, Motion & AI-assisted Workflow

## Brand direction
Keep the existing editorial watch identity: warm ivory surfaces, midnight/charcoal structure, restrained champagne-gold details, serif display typography and calm product-led pacing. Motion is decorative and must never gate content or shopping controls.

## Design tokens
The storefront and admin use additive `--nw-*` tokens and motion tokens. Gold text on light surfaces is replaced with a darker gold-ink treatment for readable small labels; brighter champagne remains a dark-surface accent. Existing legacy variables are retained for compatibility.

## Motion choreography
- Hero: short image settle and staggered copy entrances (roughly 580 ms).
- Frequent controls: 150 ms.
- Drawers/menus and common transitions: 240 ms.
- Editorial/card entrance: 350–440 ms, using transform/opacity.
- Cards: restrained 1.025 image scale and a 3 px hover/focus lift on pointer/keyboard-capable layouts.
- Admin: restrained panel entrances and short sidebar/control transitions; no fake loading or success state.
- IntersectionObserver is progressive enhancement only. Content starts visible, and observer failures do not block access.
- `prefers-reduced-motion: reduce` disables nonessential movement across both interfaces.

## Contrast review (calculated from declared sRGB tokens)
Use the dark ink values for body text on ivory/white. Use white/ivory text on midnight/charcoal. Use dark-gold ink (`#75551F`) for small text on light surfaces; champagne gold (`#C6A66B`) is an accent/border on dark surfaces, not body text on ivory/white. Status colors must be paired with explicit text and are not proof of status unless the underlying operation succeeds.

Approximate WCAG contrast ratios:
- `#101114` on `#F7F4ED`: 17.1:1.
- `#1C1D20` on `#FFFFFF`: 16.5:1.
- `#75551F` on `#F7F4ED`: 6.4:1.
- `#FFFFFF` on `#176B45`: 6.1:1.
- `#FFFFFF` on `#B42318`: 6.6:1.
- `#FFFFFF` on `#8A5700`: 5.9:1.
- Champagne `#C6A66B` on white/ivory is not approved for small text; use as an accent only.
These are pair calculations, not an exhaustive automated scan of every dynamically composed component or image overlay. A full axe/Lighthouse contrast audit remains a follow-up verification task.

## AI-assisted creative workflow (documented, not externally connected)
1. Human reviews the current brand and writes a motion brief.
2. AI may draft CSS tokens, transition variants, accessibility test ideas and original conceptual campaign prompts.
3. Review every proposed change against existing selectors/routes, reduced motion, keyboard/touch operation, performance and product-image accuracy.
4. Generate only original conceptual media unless an authorised real product reference is supplied. Do not use generated imagery to assert an exact real watch design.
5. Optimise any approved video; provide a poster/static fallback, muted playback, no autoplay sound, and pause controls for meaningful motion.
6. Human approves changes before a branch/PR; never let unreviewed AI output auto-publish.
No external motion-generation platform, AI workflow runner, video asset or generated campaign media is connected or added by this change.

## Motion QA checklist
- [ ] Desktop, mid-range Android, narrow viewport, browser zoom and text resize.
- [ ] Keyboard tab/focus order; reduced-motion OS preference.
- [ ] Home, collections, search, finder, comparison, wishlist, bag, product modal and policy routes.
- [ ] Admin navigation, workspace forms and confirmation dialog.
- [ ] Hero text remains readable on its image; focus indicators are visible.
- [ ] No animation blocks interaction or claims payment/order success.
- [ ] Image loading failure leaves a usable layout.
- [ ] Run automated axe/Lighthouse accessibility and Core Web Vitals before release.
- [ ] Compare performance before/after; investigate CLS, LCP and INP regressions.

## Limitations
GitHub Pages remains static. Sample products are not purchasable, and the admin remains a disconnected preview until real authentication, database policies and server-side operations are built and reviewed.
