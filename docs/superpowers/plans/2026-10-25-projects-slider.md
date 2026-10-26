# Projects Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, the way the earlier plans on this branch ran). Steps use checkbox syntax.

**Goal:** Replace the Projects shelf and its looping videos with a slider: one selected project in the middle, arrows, dots, keyboard and swipe, wrapping around, with the project's information under it.

**Architecture:** Data and pure HTML builders stay in `js/projects.js`; slider logic and DOM wiring go in a new classic script `js/projects-slider.js`. Pure functions are tested in Node with `loadClassic`; the wiring is tested against a small fake DOM, as `scripts/popups.test.mjs` does. The page is checked in a real Chrome (`scripts/lib/cdp.mjs`).

**Tech Stack:** Vanilla HTML, CSS and JavaScript. No build step. Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-25-projects-slider-design.md`

## Global Constraints

- No em dashes or en dashes anywhere in site text or in anything written for the owner. American spelling. Straight apostrophes. Site text uses only the glyphs of the site fonts (`FONT_TEXT`): the arrows are SVG, not characters.
- Colors only from `css/tokens.css` (no hex, and rgba only in shadows, as `projects-page.test.mjs` pins). The picture frame is the fixed dark board look.
- No video, no autoplay, no CSS animation that repeats (`check.mjs` enforces); transitions only, and none under `prefers-reduced-motion: reduce`.
- Classic scripts share one global scope; inline handlers need global function declarations. New script order: `... clock, projects, projects-slider, trip, nav ...` (`clips` is removed).
- The repo is public: no client name (`check.mjs` guards it), no login, no private note.
- Never push. Gate for every commit: `node --test` all green and `node scripts/check.mjs` prints "All good."

## Review Focus

- Wrap-around: next from the last project goes to the first and previous from the first goes to the last, for any count from 1 to 8, and a single project never breaks.
- A slide that wraps from one far side to the other must not fly across the stage.
- Rapid clicks: the panel text always ends on the selected project, never a stale one.
- A keypress inside a popup or a text field must not move the slider; arrow keys move it only when focus is in the slider.
- Reduced motion: no timers and no transitions, the panel changes at once.
- No JavaScript, and a script error: the noscript list or the built content still tells every project.
- A project with no button (planned) shows none and leaves no empty box.

---

### Task 1: Data model and validation

**Files:** Modify `js/projects.js` (data, `validateProjects`), `scripts/projects.test.mjs`.

**Interfaces:**
- Produces: entries with `builtWith`, `stands`, optional `access: 'request'`, optional `image {src, thumb, w, h, alt}`; no `loop`, no `caseLoop`. `validateProjects(list, opts)` rejects: a missing or over-long `builtWith` (120) or `stands` (140), a banned dash in any of the three texts, `loop` or `caseLoop` present, both `image` and `figure`, neither, an `image` missing a field or with a path outside `img/projects/<id>/`, `access` other than `'request'`, `access` on a planned project, `access` together with `href`.
- Produces: `CONTACT_EMAIL` (the address on the CV).

- [ ] Step 1: write failing tests: the shipped data passes; each rejection above on a mutated copy; the website entry has an `image` and no `figure`; `CONTACT_EMAIL` equals the first `mailto:` address in `index.html`; the five drafted `builtWith` and `stands` lines are present and within length.
- [ ] Step 2: run them, watch them fail.
- [ ] Step 3: change the data and the validator.
- [ ] Step 4: run the file, then the suite. Commit.

### Task 2: Slider logic

**Files:** Create `js/projects-slider.js` (pure part), `scripts/projects-slider.test.mjs`.

**Interfaces:**
- Produces: `slideOffsets(count, selected) -> number[]` (the signed distance of each slide from the selected one around the circle: symmetric for an odd count, one more on the right for an even count; `[0]` for one slide), `stepIndex(count, index, delta) -> number` (wraps both ways, any delta), `swipeDirection(dx, dy, threshold = 45) -> -1 | 0 | 1` (0 unless the move is horizontal and past the threshold; a swipe left means next, so returns 1).

- [ ] Step 1: failing tests: offsets for counts 1 to 8 and every selected index (sum and range checks, the selected one is 0, neighbors are plus and minus 1); `stepIndex` wraps first to last and last to first, handles delta greater than count and negative; `swipeDirection` thresholds, vertical moves and exact threshold.
- [ ] Step 2: run, watch fail. Step 3: implement. Step 4: suite. Commit.

### Task 3: Builders

**Files:** Modify `js/projects.js`, `scripts/projects.test.mjs`, `scripts/projects-page.test.mjs` (builder parts).

**Interfaces:**
- Produces: `accessHref(p) -> 'mailto:<CONTACT_EMAIL>?subject=<encoded>&body=<encoded>'`, `projectAction(p) -> { kind: 'visit'|'case'|'access', href, label, newTab } | null` (href first, then case, then access; planned and the rest give null), `visualHtml(p)` (an `<img>` with `src`, `width`, `height`, `alt`, `loading="lazy"`, `decoding="async"` for an image, else the drawn figure), `slideHtml(p, index, offset, selected)`, `panelHtml(p)`, `sliderHtml(list, selected)` (stage with arrows, slides, dots and the counter, then the panel), `tileHtml` compact with the thumb, `homeBandHtml`, `noscriptListHtml` with all fields and the action link. Removed: `shelfHtml`, `filterProjects` use by the shelf (kept for ordering), `statusLineText`, the video branch of `visualHtml`, `caseClipHtml`.

- [ ] Step 1: failing tests for each builder: escaping, the action priority, mailto encoding of a title with `&` and a space, the three labelled rows, no button for planned, no `<video` anywhere, the selected slide not `aria-hidden` and the others `aria-hidden="true"`, `data-offset` values from `slideOffsets`, dots with `aria-current` on the selected one, the counter text `Plate 2 of 5.`.
- [ ] Steps 2 to 4: red, implement, green, suite. Commit.

### Task 4: Wiring

**Files:** Modify `js/projects-slider.js` (DOM part), `js/projects.js` (remove the shelf, filter and clip code; keep `renderHomeBand`, `setProjectView`), create tests in `scripts/projects-slider.test.mjs` with a fake DOM.

**Interfaces:**
- Produces: `initProjectSlider()`, `goToProject(index, delta)`, the state `projectSlide`; arrows, dots and a slide click call `goToProject`; keydown Left, Right, Home, End on the slider; pointer swipe through `swipeDirection`; the panel swap runs in 180 ms unless reduced motion; each call re-renders the panel from the latest selection.

- [ ] Step 1: failing tests with the fake DOM: arrow next and previous wrap; a dot selects; a neighbor click selects and a click on the selected slide does nothing; keys move only when the event target is inside the slider; Home and End; a swipe moves, a vertical drag and a short drag do not; five rapid next calls end on the right panel; reduced motion changes the panel with no timer; the selection survives `setProjectView('site')` and back.
- [ ] Steps 2 to 4: red, implement, green, suite. Commit.

### Task 5: Page, styles, media, rules

**Files:** Modify `index.html`, `css/projects.css`, `scripts/lib/project-rules.mjs`, `scripts/check.mjs`, `scripts/projectrules.test.mjs`, `scripts/projects-page.test.mjs`; delete `js/clips.js`, `scripts/clips.test.mjs`, `img/projects/site/loop*.{mp4,webm,webp}`, `img/projects/site/case-loop*`; create `img/projects/site/home.webp` (1600 by 1000), `home-thumb.webp` (800 by 500), `opening.webp` (1600 by 1000) with `scripts/clips/still.mjs`.

**Interfaces:**
- Produces: `checkProjectImages({ projects, fileBytes, extraCaseFiles }) -> string[]` (every `image.src` and `thumb` exists; a still is at most 250,000 bytes and a thumb at most 80,000; the case view's media together under 3,000,000), `checkNoVideo({ html, js }) -> string[]` (no `<video`, no `autoplay` anywhere), and `checkProjectNames` unchanged.

- [ ] Step 1: failing tests: the page header text, the slider slot, no chips and no shelf, the case view without a clip slot and with the opening still as Fig. 1, the stylesheet pins (frame is the board token, aspect ratio 16 / 10, offsets for -2 to 2, a phone breakpoint, reduced-motion block removes transitions, no hex, rgba only in shadows, no `infinite`), the script order, the rules and their tests.
- [ ] Step 2: red. Step 3: make the stills, rewrite the markup, the CSS and the rules, delete the old files. Step 4: suite and check green.
- [ ] Step 5: look at it in a real Chrome (`scripts/lib/cdp.mjs`): dark and paper at 1280, a 375 phone, reduced motion emulated; click through all five and wrap; read the console. Commit.

### Task 6: Notes and final review

**Files:** Modify `CLAUDE.md`, `docs/superpowers/notes/2026-10-25-sharp-captures.md`; create `docs/superpowers/notes/2026-10-25-projects-slider-results.md`.

- [ ] Step 1: update the notes (what was built, numbers, the drafted texts for the owner to correct, what is unverified, the unused loop tools).
- [ ] Step 2: run the fresh whole-branch review on the range, sort the findings, fix Critical and Important in one pass with failing tests first, ledger the rest.
- [ ] Step 3: final gate and commit.
