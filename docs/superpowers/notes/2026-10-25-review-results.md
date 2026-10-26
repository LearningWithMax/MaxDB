# Whole-branch review: results and what is left

Date: 2026-10-25. Branch: `restructure` (nothing is pushed, nothing is live). Range reviewed: `40e6f71..9bc1f7a` (Projects, the chrome logo and Trip stage 1 together).
Reviewer: a fresh opus agent. Result: 0 Critical, 4 Important, 9 Minor. Fix pass: Important 1 to 3 fixed with tests written first; Important 4 belongs to Fable.
This file is public once merged. It holds no private notes.

## Fixed

| # | Finding | Fix | Proof |
| --- | --- | --- | --- |
| 1 | A client name sat in tracked files (a deny-list rule, two tests, two plan lines) | The rule keeps Chacao and Laboratorios (already public on the CV). Any other name is read from the git-ignored `scripts/private-names.local.txt` and passed as `privateNames`; `check.mjs` prints a note when the file is missing. | `projectrules.test.mjs`, 2 new tests; mutation: a private name on the Projects page fails `check.mjs` |
| 2 | The album popup had no keyboard support | Opening a popup focuses its close button, Escape closes the top popup, focus returns to what opened it, Tab stays inside, photo cards open with Enter or Space, the four popups are `role="dialog" aria-modal="true"` with a name. Mouse behavior is unchanged. | `popups.test.mjs`, 8 tests (6 were RED); real Tab and Escape presses in the pane |
| 3 | The website loops and Fig. 3 still showed the old flat map | New Trip capture from the globe page (1280 by 800, same scale as the other five), both loops re-rendered, `screen-trip.webp` re-saved, Fig. 3 alt text and caption rewritten | `projects-page.test.mjs`; the loops play in the shelf tile and the case view |

Video quality (the owner's question): the recorder now steers its bitrate (`scripts/clips/bitrate.js`, 5 tests) to land at 70 to 100 percent of each clip's size limit.
`loop.mp4` 195 KB to 466 KB, `loop.webm` 332 KB to 564 KB (limit 600 KB); `case-loop.mp4` 604 KB to 862 KB, `case-loop.webm` 586 KB to 895 KB (limit 900 KB).
The sources are still the pane's 800 by 500 screenshots, so a sharper picture needs full-size captures taken at the PC.

## Not fixed here: for Fable (his files, so not edited without his say)

1. The render loop in `modules/globe.js` keeps running every frame while the flight is paused or `reducedMotion` is on (`renderer.setAnimationLoop(loop)` in
   `syncLoop`, and `frame(dt, now)` advances the ambient motion). With the OS reduced-motion setting on, the globe starts paused at stop 1 but still moves.
   Suggestion: when `userPaused` or `reducedMotion`, stop the loop and render only on a seek, a resize or a stop pick.
2. The card is `aria-live="polite"` and its text changes all through the flight, so a screen reader announces every stop as it flies by. Suggestion: announce on
   user actions only, or when the flight finishes.
3. On phones the orange card kicker ("STOP 06 OF 11, WORKED") overlaps light parts of the globe and is hard to read.
4. `lab/flight-globe/flight.html` now links `css/tokens.css`, because `css/globe.css` has no color fallbacks any more.
5. (2026-10-26, owner phone test) On a phone the route list is a strip that scrolls sideways, and the globe highlights the current stop (`.is-on`) without ever
   scrolling the strip, so after the first few stops the highlight was off screen. The site now fixes this from `js/trip.js` (`tripFollowStop`, which watches the
   classes and scrolls the strip; checked in real Chrome at 390 px: all 11 stops stay in view). If Fable would rather do it inside `modules/globe.js`, the site's
   follower can then be deleted.

## Deferred minors (not fixed, nothing breaks)

Update, later on 2026-10-25: items 5, 6, 7 and 10 were about the shelf and the clip controller, which the Projects slider removed, so they no
longer apply. Items 8, 9 and 11 to 13 still stand. The new review of the slider is in `2026-10-25-projects-slider-results.md`.

5. `js/clips.js`: the controller for a tile that leaves the page is not released.
6. The shelf filter fade-out only works once: the `is-entering` fill outranks `is-leaving` on later filters, so the tiles swap without fading out.
7. `is-failed` is set on a tile when the MP4 source errors even though the WebM source then plays.
8. If `js/projects.js` throws, the Projects page has no static fallback beyond the noscript list.
9. Opening the case view does not move focus to it.
10. Without JavaScript the filter buttons are dead and the noscript list links the website to `#project-site` instead of `#projects/site`.
11. `js/trip.js`: a WebGL failure is not remembered for the session (every visit to Trip tries again), and there is no load timeout (on a very slow connection the
    globe window stays in "loading" without falling back to the map).
12. The globe's own accessibility labels (see Fable items 1 and 2).
13. The dev save route (`scripts/serve.mjs --save`) has no Origin check, and a comment in `serve.mjs` about `--save` is stale. Dev only, localhost only.

## Before merging to main

- Do not push `restructure`. Squash-merge it, so the older commits (one of which spelled a client name in a test and a plan) never reach public history.
  Push the old site as `old-site` first.
- Create `scripts/private-names.local.txt` in any other checkout, or `check.mjs` guards only the public names.
- The pre-merge list in `CLAUDE.md` (real phone test, sharing tags and image, proofreading, remove the construction banner and `lab/`) still stands.
