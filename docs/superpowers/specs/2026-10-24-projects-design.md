# Projects: design

Date: 2026-10-24. Branch: `restructure` (nothing is pushed, nothing is live). Status: approved by the owner on 2026-10-24, with the statuses in section 4 as he corrected them.
Parent specs: `2026-10-18-master-site-design.md` (sections 3.4, 7, 11 phase 4) and `2026-10-21-art-direction-brief.md`. This file refines
them for the Projects page; where they differ, this file wins. This file is public once merged: no private notes in it.

## 1. Intent

The owner wants visitors, mostly people arriving from LinkedIn, to see what he builds without reading about it: each project is a
short silent looping clip of the real thing, with an honest status. The wanted reaction is "wait, is this actually AI?", so
everything shown must be real or clearly labeled as planned. Success looks like this:

- A fourth page, `#projects`, with five entries, one featured and four smaller, filterable by status.
- A three-tile preview on Home with an `all projects →` pill.
- Every clip stays inside its size budget and nothing downloads before it is near the screen.
- Dark is the main look; every clip and still is designed and captured in dark. Paper stays supported.

## 2. What the owner decided

- All five projects go on the shelf now, some close to ready and some not, each labeled with its honest status.
- His statuses: the car broker and this website are Live; the voice organizer and the quote marketplace both exist and are in testing,
  labeled "Building and testing"; the broker template for other markets does not exist yet and is Planned.
- An entry with nothing public to capture yet gets a drawn still, no video, and is not clickable (his answer "Use A").
- Clips are made as: scripted replay over real captures for the web projects, his own phone recording for the organizer (his answer "Go" to C).
- The organizer needs more work and testing before it gets a clip; until then it shows a still.
- The Chacao name never appears. The quote marketplace tile describes the product generically; the real portal exists, is in testing and is
  private behind a login with invented data, so the tile shows a still until a generic-looking demo exists to capture.
- The CV board retouch happens in his other chat (Fable); this plan does not touch the board.

## 3. Out of scope

The organizer clip and a quote marketplace clip (both wait for a tested, generic-looking demo), the stills' final art direction beyond
what section 8 says, a real-device video test (Safari, iPhone, LinkedIn in-app browser), and the Trip plan. The chrome logo and chrome
opening were a separate change and are already done (see section 15).

## 4. The line-up

| Order | id | Title | Status | Visual | Opens | One line (draft, for the owner to edit) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `car-broker` | Car broker template | live | clip (featured) | the demo, new tab | A broker site template: browse, send a request, and the operator answers from a private dashboard. The demo runs on invented data. |
| 2 | `site` | This website | live | clip | case view `#projects/site` | The site you are on: a CV, a trip and this shelf, built with AI in plain HTML, CSS and JavaScript. |
| 3 | `organizer` | Voice organizer | building | figure `flow`: talk, file, plan my day | nothing | I talk to Claude on my phone and it files tasks and notes into Notion. It is built and in testing. |
| 4 | `broker-markets` | Broker template for any market | planned | figure `words`: cars, homes, places, boats, motorcycles | nothing | The car broker template reshaped for other markets. It starts once the car version is complete. |
| 5 | `quote-market` | Quote marketplace | building | figure `flow`: request, quote, confirm | nothing (the real one is behind a login) | A marketplace where buyers ask for quotes and a team answers them. In testing, and being made generic for many kinds of business. |

Status chips read Live, Building and testing, Planned. The stored value for "Building and testing" is `building`. A project that is live
and still being worked on stays Live; its line says so.
Rules for everything on the page: no real client site, client brand, photo, contact, key or customer data; demos use invented data;
nothing that needs a family or client OK goes up before they give it.

## 5. Units

| File | Responsibility | Depends on |
| --- | --- | --- |
| `js/projects.js` (new, classic script) | The data array `PROJECTS`, pure functions (`validateProjects`, `filterProjects`, `homePicks`, `tileTarget`, `statusLabel`, `tileHtml`, `shelfHtml`, `homeBandHtml`), and the thin DOM wiring (render, chips, status line). | `route.js` for the case ids |
| `js/clips.js` (new, classic script) | The clip component: `clipAction(state)` (pure) and `initClips(root)` (observers, source attach, play and pause). Named "clips" in code so it does not collide with `scripts/loops.test.mjs`, which tests the shell's no-endless-animation rule. The owner-facing word stays "loop". | none |
| `css/projects.css` (new) | Shelf, tiles, figure stills, chips row, case view, Home band. Colors only through `tokens.css`; the dark frame reuses the fixed `--board-*` dark tokens (or one new `--clip-bg` token) so a clip sits on dark in both themes. | `tokens.css` |
| `index.html` | Nav button, `section#page-projects` (header, chips, status line, `#shelf`, the static case section `#project-site`, noscript list), the Home band container, script and link tags. | |
| `js/route.js`, `js/nav.js` | `PAGES` gains `projects`; `CASE_IDS`; a new `parseProject(hash)`; `buildHash(page, lens, project)`; `goTo(page, lens, fromHash, project)`; `vlogPageNames` gains `projects`. `parseRoute` keeps its `{ page, lens }` shape. | |
| `scripts/lib/rules.mjs`, `scripts/check.mjs` | `checkProjects` and `checkClipMedia` rules (section 12). | |
| `scripts/lib/savepath.mjs` | Also allows `img/projects/<id>/<name>.(mp4\|webm\|webp)` for the dev save route. | |
| `scripts/clips/` (new, dev only) | The stage and encoder page, `scenes/<id>.json`. Modeled on `scripts/stills/index.html`. | `serve.mjs --save` |
| `img/projects/<id>/` | `loop.mp4`, `loop.webm`, `loop-poster.webp` per project that has a clip (`case-loop.*` and `case-loop-poster.webp` for a case view clip). | |
| `scripts/clips/captures/<id>/` (git-ignored) | The raw captures a scene is built from. Not `originals/`, because the dev server refuses that folder. | |

Load order: data, vlog, popups, consent, route, lens, theme, clock, clips, projects, nav, map, home-intro. `projects.js` comes before
`nav.js` because `nav.js` routes on load and `#projects` must already be rendered.

## 6. Data model and rules

One entry per project in `PROJECTS`:

```
{ id, title, status: 'live'|'building'|'planned', oneLine, order,
  loop: { mp4, webm, poster, w, h }        // or
  figure: { kind: 'words'|'flow', items: [string, ...] },
  href: 'https://...' | case: '<id>' }      // optional, live entries only
```

The data file is public on GitHub Pages, so there is no `public` flag (the parent spec had one). A private project is simply not in
the file; private notes stay in `PROJECT-NOTES.local.md`. `validateProjects(list)` returns a list of problems, used by tests and by
`check.mjs`: ids unique and `[a-z0-9-]+`; status in the set; `order` unique integers; `oneLine` non-empty, 140 characters or fewer,
no dashes the copy rules ban; exactly one of `loop` and `figure`; `href` must be `https:`; only `live` entries may have `href` or
`case`, and not both; every `case` id has a matching `section#project-<id>` in `index.html`. `statusLabel` maps `live`, `building` and
`planned` to the owner-facing labels Live, Building and testing, Planned.

## 7. Routing and nav

- Nav reads `home / cv / projects / trip`. `PAGES = ['home','cv','projects','trip']`.
- `#projects` is the shelf. `#projects/site` is the case view of the same page (a state of `#page-projects`, not a new page).
  `parseRoute` keeps returning `{ page, lens }`; `parseProject(hash)` returns the case id for a known one and null otherwise.
  `#projects/zzz` shows the shelf and replaces the hash with `#projects`. `buildHash(page, lens, project)` builds it back. Existing
  `#cv/ops` behavior is unchanged.
- Opening a project's case from the shelf pushes a history entry, so Back returns to the shelf. Every route change scrolls to the top.
- The visitor log records `Opened Projects` for both states.

## 8. The shelf

- Header like the Trip page: mono kicker, serif `h1` "Projects", one plain line, then the chips row, then a status line
  ("Showing 5 of 5", visually hidden, `aria-live="polite"`).
- Chips: All, Live, Building and testing, Planned, as `.pill` buttons with `aria-pressed` (they wrap onto a second line on phones);
  the active one is filled ink. Every status has at least
  one entry today, so no empty state is reachable; if it ever is, the shelf says "Nothing here yet."
- Layout at 1000 px and wider: the first visible tile is featured (visual on the left about 7/12, text on the right), then the others
  in a two-column grid. Below 700 px everything stacks. Caption under every visual: `Plate n.` where n is the entry's `order`
  (stable while filtering). Visuals are 16:10 (720 by 450 clips), in the dark frame, radius `--r-obj`, hairline `--rule`.
- A tile is an `article` with a title (serif), a status chip (mono), the one line (Inter) and the visual. A tile with a target has
  one stretched empty `<a class="tile-link">` like the Home preview cards: `href` opens in a new tab with `rel="noopener"` and the
  accessible name "Open <title> (opens in a new tab)"; a `case` links to `#projects/<id>`. A tile with no target has no link, no
  pointer cursor and no hover lift.
- Figure stills are HTML and CSS, zero image bytes, both themes: `words` sets the items in serif italic separated by mono `·`;
  `flow` sets the items in mono joined by `→`. They sit in the same dark frame as a clip so the grid reads evenly.
- Filtering fades non-matching tiles out over 200 ms, then hides them and reflows; the first visible tile becomes the featured one.
  Reduced motion filters instantly. Nothing animates endlessly.
- With JavaScript off, a `<noscript>` list shows each title, status and link, so the page is never empty.

## 9. The clip component

Markup is emitted by `projects.js`: `<video class="clip" muted loop playsinline preload="none" poster="..." width="720" height="450"
aria-hidden="true" tabindex="-1" disablepictureinpicture data-mp4="..." data-webm="...">`. No `<source>` is present, so nothing
downloads. No `autoplay`, no `controls`. The video is decorative: the tile's text carries the meaning.

`initClips(root)` finds clips not yet initialized and watches them with an `IntersectionObserver`:

- Near the screen (a 300 px margin): attach `<source>` elements, MP4 first (the iPhone format), then WebM, and call `load()`.
- At least half visible: `play()` (the promise is caught). Not visible, or the tab is hidden (`visibilitychange`): `pause()`.
- Never attach or play while the opening is running; `initClips` re-evaluates when the opening ends (the plan names the hook in
  `home-intro.js`).
- `prefers-reduced-motion: reduce` or `navigator.connection.saveData`: the poster stays, no source is ever attached. A change of the
  media query at runtime is honored.
- An `error` event leaves the poster showing; nothing else breaks.

`clipAction({ near, visible, tabHidden, reduced, saveData, introRunning })` returns `{ load, play }` and is the unit tested in Node.

Budgets, enforced by `check.mjs`: each loop file 600,000 bytes or less at 720 by 450 and 8 seconds or less; a case view loop 900,000
bytes or less at 960 by 600 and 10 seconds or less; each poster 60,000 bytes or less; media a page may fetch (per entry the larger of
the MP4 and the WebM, plus the poster, summed over the page's tiles) under 3,000,000 bytes.

## 10. Home preview

A band after the two preview cards and before the stats row, with `data-reveal`: a mono kicker "Projects" and an `all projects →`
pill (the pill style the preview cards use; no second gold star) on one line, then `homePicks(PROJECTS, 3)` tiles: the first three
by `order` whose status is not `planned`. Today that is car broker, this website, voice organizer (a still until it has a clip). Each
tile is the compact form of the shelf tile (visual, title, status chip) and links to its own target. Fewer than three picks show
fewer tiles; none hides the band. Tiles stack on phones.

## 11. The case view (`#projects/site`)

Static HTML in `index.html` (`section#project-site`), because case copy is real content for search, link previews and screen
readers, the same rule as the CV. It holds: a "Back to projects" link, mono kicker "Project", serif `h1` "This website", the status
chip, one paragraph, the large clip with a `Fig. 1.` caption, two more captured screens with `Fig. 2.` and `Fig. 3.`, and a mono
"How it is built" list. The list states only things true at writing time and checkable in the repo: plain HTML, CSS and JavaScript,
no framework and no build step; self-hosted fonts and libraries; automated checks that run before every change; built with Claude
from a written spec per feature. No test counts or sizes, which go stale. Copy follows the repo's rules (no dashes, American
spelling, straight apostrophes). The owner approves this copy before it ships.

## 12. Making the loops

Dev tooling in `scripts/clips/`, modeled on `scripts/stills/` (a dev-only page that renders in the browser and saves through the
dev server's `POST /__save`, started as `node scripts/serve.mjs --save`, localhost only).

- Captures: real screens of the real demo (or of this site) taken in the browser pane at a 1280 px viewport, dark where the product
  has a dark look, saved under `scripts/clips/captures/<id>/`. Every frame the viewer sees is a real capture; the tool adds only a
  cursor, a click ripple, crossfades and a slow zoom. It never draws interface that was not captured.
- A scene file `scripts/clips/scenes/<id>.json` lists the captures as timed shots (with a crossfade and a slow zoom), a cursor
  path and the clicks, so a loop can be re-rendered when a demo changes. The pane's screenshots are about 800 px wide, so a
  loop is made at the capture width (720 wide for the shelf) and a larger case loop only if captures allow it.
- The stage page draws the scene on a canvas at 30 fps and records it twice with `MediaRecorder`: `video/mp4;codecs=avc1.42E01E`
  and `video/webm;codecs=vp9`. If a file is over its budget the page retries at a lower bitrate (up to four times) and reports the
  final sizes. It saves a poster (`image/webp`) from the best frame. The pane must be in front while it records, because a hidden
  pane runs no animation frames.
- First plan task, before anything else is built: record a 3 second synthetic canvas, save it through `/__save`, and confirm the
  file plays and loops in the pane and has a real duration. If `MediaRecorder` output proves unusable, the fallback is frame by frame
  encoding with `VideoEncoder` (supported in the pane: H.264, VP9, AV1) plus a small WebM muxer; that would be a replan.
- Car broker scenes (draft, for the owner to edit): the home page, a rental opened, the request form filled, then the request in the
  admin dashboard. About 8 seconds. The dashboard frames need the demo admin login; the owner signs in himself in the pane while
  Claude captures, and no password is ever typed by Claude or sent in chat.
- This website scene: the opening letters formed, the page in, the CV board, the Trip page. Captured after the chrome logo and
  chrome opening change lands, so the loop shows the final look.
- The organizer: his own phone recording with sample entries only, trimmed and compressed in the same stage page once it is tested.
- The quote marketplace: no clip at launch. The real portal is behind a login and carries a client's identity, so a clip waits for a
  generic-looking demo with invented data, and for the OK of anyone whose material it derives from.

## 13. Checks and tests

Node tests (`node --test`), each written to fail first: `validateProjects` (every rule in section 6, both ways); `filterProjects`,
`homePicks`, `tileTarget` and the `shelfHtml` output (link or none, `target` and `rel`, featured, plate numbers, escaping, noscript
list equals the data); `parseRoute`, `buildHash` and `hashAction` for `projects` and `projects/<id>`; `clipAction` as a table;
`safeSavePath` accepts only the new allowed names and still rejects traversal; the CSS rules (no color outside tokens, shelf
breakpoints at 700 and 1000 px, reduced motion). `check.mjs` gains `checkProjects` (data valid, referenced files exist, budgets,
`<video` is created only in `clips.js` with `muted`, `loop`, `playsinline` and `preload="none"`, no `autoplay`, no `controls`) and a
rule that every `case` has its static section. `budget.mjs` keeps the pre-gate total under 150 KB gzip; expected cost about 6 KB.
The existing no-endless-animation rule stays as it is; a video's `loop` attribute is not a CSS animation.

## 14. Verification in the browser

At 1280 and 375 wide, dark and paper: the shelf (all four chip states), the case view, the Home band, keyboard order and focus
rings on tiles and chips. The network panel shows no clip file before the tile is near the screen, and the MP4 or WebM (not both)
after. Hidden tab pauses. The console is clean. `node scripts/check.mjs` prints "All good." and the suite is green.
Not verifiable here, left to the owner: Safari and iPhone playback (Chrome's MP4 output may not satisfy Safari; the failure mode is
the poster staying), the LinkedIn in-app browser, and reduced motion with the OS setting.

## 15. Sequence and related work

Separate from this spec and already done (commit `611c09b`), because the `site` loop shows it: the chrome logo (one fixed banner logo
that no longer changes with the lens) and the chrome finish for the opening. The Projects plan runs in this order: the clip
pipeline proof, data and validation, routing and nav, the shelf and clip component, the Home band, the case view, checks and
budgets, then the loops themselves (car broker, then this website), then verification and the results note.

## 16. Needed from the owner

The car broker demo URL; his edits to the five one-liners and the case copy; the steps he wants the car broker loop to show (the
draft is in section 12); a time to sign in to the demo dashboard in the pane; and, later, the organizer test.
