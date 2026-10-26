# New shell: results and deviations

Date: 2026-10-23. Branch: `restructure`. Plan: `docs/superpowers/plans/2026-10-23-new-shell.md`. Nothing is pushed and nothing is live.
This file is public once merged. It holds no private notes.

## What was built

Style B (paper and metal, dark first) on every page: tokens and self-hosted fonts, the banner with the Tel Aviv clock and the theme toggle,
Home (hero, numbered lens list, two preview cards, stats), the CV (header, board with its pills, cards, a ruled experience table), the
interim Trip page, the popups, the footer with the visitor log, the paper glow, and the opening's new reveal (spheres float up, the banner
slides down, the page fades in). The route `map` is now `trip` (`#map` redirects). Tests: 261 pass. `node scripts/check.mjs`: All good.

## Numbers

| Measure | Result | Limit |
| --- | --- | --- |
| HTML, CSS and classic scripts before the gate, gzip | 78.1 KB (was 69.4 KB) | 150 KB |
| Fonts, woff2 (5 files) | 110,496 bytes | 120,000 bytes |
| three.js core and module, gzip (loaded after first paint) | 183.7 KB | no change |
| three.js addons, gzip | 12.0 KB | no change |
| GSAP, gzip | 67.7 KB | no change |
| Opening module and shape image, gzip | 28.1 KB | no change |
| `img/trip-preview.webp` (provisional) | 65 KB | 90 KB |
| `img/grain.png` | 12.4 KB | 20 KB |

Fonts: Instrument Serif 400 and italic (18.6 and 19.4 KB), JetBrains Mono 400 (19.1 KB), Inter 400 to 600 (36.9 KB), Roboto Condensed
700 (16.5 KB). Every file is a text subset: printable ASCII plus the few other characters the site shows (see deviation 3).

Reveal timing, measured with a frame sampler in the browser pane (dark theme): the release is time 0, the banner moves from -27 px to
its resting 38 px by about 1.0 s, the settle starts at 733 ms (plan: 700), every item is at full opacity by about 1.7 s, and the intro
classes, curtain, canvas and gate are removed at 2.37 s (plan: 2.32 s). Nothing is left behind and the grain is back on the body.

## What was checked, and how

- Every page (Home, CV in all four readings, Trip) and every popup (nutshell, country album, lightbox, certificate, story, consent,
  visitor log) in dark and in paper, at a 1280 wide emulation and at 375 wide. No sideways scroll anywhere at 375.
- Lens switching: headline, logo finish (gold, emerald, gunmetal, orange), pressed pill, one skills grid, bullet counts and the
  two-column experience table.
- The opening: a normal run, Skip, a click during the hold, a paper-theme run. Keyboard: a Tab shows a 2 px gold focus ring.
- Contrast: every text token against the page and the panel in both themes is tested in `scripts/tokens.test.mjs`.

Not verified, and needs the owner or a real device:

- Smoothness of the opening and the reveal on a real phone and in Safari or the LinkedIn in-app browser. The pane only shows stills.
- Reduced motion in a real browser. The pane cannot emulate it; a CSS test covers the rule. Please check it once with the OS setting.
- The hidden-tab path in the reveal. My simulation could not separate it from the natural finish (both end in the same function).
- Rotating a phone while the CV is open (the board relayout on resize). A fresh load at 375 wide is correct.

## Deviations from the brief or the plan

All of these are in the ledger with their cost if wrong. The first five are visible choices.

1. The real board on the CV is not tilted. Rotating the canvas softened the flap text at normal pixel density. The Home strip (real text)
   keeps the tilt. On retina screens the tilt may be fine; one CSS line brings it back.
2. Only the Home departures strip carries the gold star outline. The Trip card has none (the brief says one star per screen).
3. All four font families are text subsets: printable ASCII plus `© · Á × á ã ç é ñ → ↺ − ✕` (everything else the site shows is flag
   emoji, which come from the system). The full Latin files would not fit the 120 KB budget. A character outside the set falls back to
   the system font for that glyph, so `check.mjs` now fails if site text uses one: add it to `scripts/lib/font-text.mjs` and run
   `node scripts/vendor-fonts.mjs`.
4. The Trip card on Home is a provisional still of the lab globe at the Madrid stop (the long Venezuela to Europe arcs show best there).
   The Trip plan renders the final one.
5. The banner shows `home / cv / trip`. `projects` (the nav word, the page and its Home preview) arrives with the Projects plan.
6. Smaller: the country marquee and every decorative loop are gone (the sticker wobbles once); the visitor log moved into the footer;
   the footer links are plain mono text instead of two colored icons; the construction banner lost its emoji; the kicker text keeps the
   case it is typed in; pill borders use `--mute`; the theme crossfade is a temporary class; three extra elements carry `data-reveal`
   (construction banner, consent banner, and the footer instead of the log widget).

## What the final review found (and what was fixed)

A fresh reviewer read the whole branch. One Critical and three Important findings were fixed, each with a test that failed first:

- **Critical: three of the four design fonts never rendered.** The vendoring script picked Google's latin-ext files instead of latin
  (it paired each "latin" comment with the block before it), so the page silently used Georgia, Consolas and Arial Narrow while the
  browser reported the fonts as "loaded". The original Roboto Condensed file for the board had the same flaw. All four families are
  re-vendored as text subsets, `scripts/lib/woff2-cmap.mjs` reads each file's real glyph table, and `check.mjs` fails if a face lacks
  the glyphs the site sets in it. The earlier 95 KB font figure was measured on the wrong files; the correct total is 110 KB.
  Instrument Serif is about a quarter narrower than Georgia, so the name, the departures strip and the board were re-checked at 1280
  and 375 wide in both themes.
- **Important: the story's close button was black on the dark page** (no color set), so a phone visitor could not leave the story.
  It now sets its own color, and each theme declares its `color-scheme` so scrollbars and native controls match.
- **Important: on the Trip map, visited countries were 1.3:1 against unvisited ones**, so the figure could not show where he has been.
  Visited countries now have their own color per theme (3.2:1 or more), and a hovered or focused country gets a gold outline.
- **Important (re-graded from Minor by its effect): the page jumped about 8 px sideways at the end of the opening on Windows**, when the
  scrollbar appeared. The page now reserves its scrollbar gutter.

Deferred as minors (none blocks anything; all are in the ledger): the reveal's inline animation delays collapse its 80 ms stagger; the
skip link routes but does not move focus; the logo has `role="link"` but only a pointer handler; the Trip card's accessible name does
not contain its visible label; Home entrance animations replay on every visit; several pre-existing widgets (visitor log, certificate
cards, sticker, album photos) are not keyboard reachable, which belongs to the launch accessibility pass; the CV board can mount while
the opening is still disposing for up to 2.3 s; check-rule gaps and a reveal timing test with fake timers; housekeeping.

## For the owner to decide

- The Operations logo (gunmetal `#4b5059`) is faint on the near-black page. It was picked for a white page and the spec already
  flagged it as the quietest on black. A lighter finish for dark needs your pick and a re-render of the still.
- The board lines are still Fable's placeholder wording; the final lines and weights are yours. The Intelcia line on the "all" reading
  reads `TEAM GREW FROM 10 TO 35` (the approved sentence says "about 10 to 35"), and it also shows on the Home strip.
- The "what I bring" sentences were dropped; each lens row carries one line instead.
- Hero line 1 is in place on Home: "Seven jobs across five countries: the lab bench, the greenhouse floor and client visits. Working in
  French, Spanish, English and Hebrew."

## Before this goes live

Not part of this plan: push `restructure` only as a backup if you want it; before any merge to `main`, push the old site as `old-site`,
remove `lab/` and the construction banner, add the sharing tags and image, do the real phone test, and run the proofreading pass.
Everything tracked in git becomes public on `main`, including `docs/`; `docs/superpowers/notes/2026-10-20-core-results.md` still
contains a LAN address and should be edited or removed first.

## Screenshots

Kept outside the repo (they are review material, not site files): opening gate, letters formed, spheres floating up and the page in;
Home, previews, CV (Operations, Customer-Facing), cards, Trip and a country album in dark and in paper at 1280; the phone set (Home,
previews, CV board, paper Home, paper nutshell popup).
