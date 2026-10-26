# Chrome logo and chrome opening: results

Date: 2026-10-24. Branch: `restructure`. Nothing is pushed and nothing is live. Requested by the owner after the shell review:
"the logo on the banner to stay the same and not change colors", "the chrome animation and the chrome logo" (his attached render).
This file is public once merged. It holds no private notes.

## What changed

- **One fixed banner logo.** `img/logo/chrome-banner.webp` (15.6 KB, 217 by 96, transparent) replaces the four per-lens stills
  (gold, emerald, gunmetal, orange), which are deleted. `js/lens.js` no longer touches the logo: the lens switching, the fade and the
  idle preload are gone. The logo is the same on every page, lens, theme and phone width.
- **The logo is the owner's render.** `scripts/stills/chrome-render.webp` is his chrome balloon MDB. It already had a transparent
  background, so no cutout was needed; `scripts/stills/index.html` crops it to the letters and saves the banner logo, both favicons
  and the sharing image (`node scripts/serve.mjs --save`, then open `/scripts/stills/?auto`; the `save` config in
  `.claude/launch.json` starts that server). The sharing image is the chrome logo and the name on space black.
- **The opening plays in chrome.** The finish list holds one entry, `chrome`. The lab's chrome beads looked like flat grey pearls
  because the opening's room was bright and even. The room is now dark with four bright softboxes (`STUDIO`), and each bead is
  lit by its position (`chromeShade`: brighter top left, a warm bronze bounce at the bottom, like the render). Both settings
  are pure data with tests; the look itself was judged by eye against the render at the full and the phone sphere counts.
- **Checks.** `checkLogoAssets` requires the chrome banner, both favicons and the sharing image, and fails on a leftover per-lens
  banner still. New tests pin the fixed logo, the transparent webp, the single finish and the studio and shading rules.

## Verified

264 tests pass, `node scripts/check.mjs` prints "All good.", and the size budget holds. In the browser pane: the logo `src` is the same
on `#home`, `#cv`, all three lens routes and `#trip`; dark and paper at 1280 wide and the dark CV at 375 wide show the logo with no
white fringe; the real opening shows chrome beads at the hold and the release; the lite (phone) bead set reads as chrome too.

## Not verified, and decisions for the owner

- The opening's smoothness on a real phone, as before. The chrome beads cost the same as the gold ones (same count, same material type).
- The beads are a ball-bearing chrome, not the smooth foil of the render. That difference is inherent to the bead animation; the banner
  logo is the real render. If he wants the beads closer to the foil, the next lever is fewer, larger beads.
- The banner logo is still 78 by 34 px. The foil detail is small at that size; a slightly larger slot is a one-line change if wanted.
- The sharing image text uses the system bold font because the stills page does not load the site fonts; the sharing tags and a final
  image belong to the launch polish.
- After `lab/` is removed, `vendor/three/addons/environments/RoomEnvironment.js` is unused (the opening now builds its own room);
  drop it from `scripts/vendor.mjs` then.
- The earlier owner decision "the Operations logo is faint on dark" is resolved: there is no per-lens logo any more.
