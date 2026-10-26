# Phases 0 to 2: results and measurements

Date: 2026-10-20. Branch: `restructure`. Plan: `docs/superpowers/plans/2026-10-20-master-site-core.md`. Nothing here is live.

## Automated

- `node --test`: 127 tests, all passing (routing, lens state, copy rules, board data, intro decision, opening settings, glide math, logo mapping, servable paths, dev-server save path, vendor manifest).
- `node scripts/check.mjs`: "All good." It now also checks ES modules, the import map, the vendor hashes, lens text groups, board lines, logo stills, and the copy rules.

## Size (`node scripts/budget.mjs`, gzip)

| What | Size |
| --- | --- |
| Before the gate: HTML, CSS, classic scripts | 69.4 KB (limit 150 KB) |
| three.js core and module | 183.7 KB |
| three.js addons (all, the opening needs one) | 12.0 KB |
| GSAP | 67.7 KB |
| Opening module and shape image | 28.0 KB |

The spec estimated about 170 KB for the libraries. The measured figure is about 264 KB, so the opening costs about 280 KB after first paint. Cheapest saving: drop GSAP's CSS plugin (about 19 KB) or replace GSAP in the opening with a small tween helper (about 68 KB). Not done: no decision yet.

## Verified in the browser pane

- Gate: page hidden, Welcome button focused, frost look chosen when the browser can blur.
- Sequence (stepped with `opening.seek()` because the pane is hidden and runs no animation frames): gate, gather, hold, release, settle, done. At the release the nav fades in and the hero text is staged in the middle (offset 93 px at 520 px width); the rest of Home appears at the settle; every `intro` class and element is removed at the end. No console errors.
- Same-session reload and a `#cv/ops` deep link show no gate. `?again` forces it. Skip works. `?failopen` (module blocked) shows the page 204 ms after the click.
- Hidden pane with the opening started: the 12 s real-time fail-safe showed the page. This is the suspended-tab case, observed for real.
- 375 px and 520 px widths: no horizontal overflow, the banner logo fits, the board fits (longest line 25 characters).
- Board: renders, follows the lens from the tabs, the `#cv/<lens>` link and the Home lens buttons; light and dark themes; desktop and phone layouts.
- Banner logo follows the lens (gold, emerald, gunmetal, orange); a deep link shows its finish from the first paint.
- Glide: letters centered on screen at 312 px wide land at (55, 70) at 78 px wide; the logo slot is centered at (55, 67), 78 px wide. Error 0 px horizontally, 3 px vertically.

## Not verified yet (needs a visible window or a phone)

- Frame-by-frame smoothness of the gate melt, the glide and the settle. CSS transitions and animation frames do not run in a hidden pane.
- The fps check that switches the frost gate to the plain look on a slow phone.
- Real phone performance, Safari and the LinkedIn in-app browser.
- Reduced motion in a real browser (covered by the unit tests of the decision function).

## Still waiting on the owner

- Approval of the lens text and the hero line (draft sent as a file). Until then the CV shows the cleaned blended text only, and Task 6 steps 5 to 7 are open.
- The phone test: open the printed network address (for example `http://192.168.1.246:5320/?again`) on a phone on the same wifi.
- Which emerald depth to keep and where each finish goes (defaults are recorded in the spec).

## Facts for the next plan

- Three.js is shared by the opening, the board and the globe: one vendored copy, loaded once.
- Both 3D pieces already load on demand; the opening starts loading as soon as the gate is up.
- `Opening.seek()` and `window.__intro.opening` exist so tests do not depend on animation frames.
- The old flat map still ships (the Trip plan replaces it with the globe).

## Corrections after the final review

- The first version of the release and settle could not be seen: the opening canvas cleared to opaque black above the curtain, so the banner reveal, hero staging and lens fade all happened underneath it. My earlier check read computed styles and missed it. Fixed: the canvas is transparent, and the page background replaces the space black at the release. Confirmed with a real render at mid-glide: the page shows through and the sphere logo glides over it.
- Also fixed: the lens row no longer fades in twice, a failed `home-intro.js` can no longer leave a dead gate on a black screen, Back no longer bounces after a hash is normalized, a tab hidden for more than 1.5 s mid-opening skips to the page, a tab opened in the background no longer forces the plain gate, the dev server refuses backslash paths and listens on localhost unless `--host`, the check now agrees with the board (same validation), and the CV describes Intelcia by the one approved fact (enforced by the check).
- Smoothness of the motion is still unseen: it needs a visible window or the phone.
