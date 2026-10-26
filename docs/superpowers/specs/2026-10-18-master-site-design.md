# Master site design

Status: approved by the owner on 2026-10-20 with defaults (section 12). Date: 2026-10-18. Branch: `restructure` (nothing here is live).
This file is public once merged. Private notes, client details and contact numbers live elsewhere and are not repeated here.

## 1. Understanding

What the owner wants: one site that is his CV, his portfolio and a short trip through his life, posted on LinkedIn as
"built entirely with AI". The reaction he is after is "wait, is this actually AI?". Most visitors arrive from a phone,
many inside the LinkedIn in-app browser. Recruiters still need the facts in 30 seconds.

Success looks like:
- A visitor sees one memorable motion piece per screen, never three at once.
- A recruiter can read every fact without any 3D, any script, or any waiting.
- It is fast and does not stutter on a mid-range phone.
- The owner can add a project or edit a job by changing one place.

Said by the owner (kept as is):
- Motion and 3D are welcome, "almost overstimulating", but handmade, not templated, and not chemistry as the theme.
- Three motion pieces are final, all built in `lab/`: the opening, the split-flap board, the flight globe.
- Pages: Home, CV, Projects, Trip. He approved the wireframes for all four.
- The CV is one person read through three lenses (Chemistry & R&D, Operations, Customer-Facing). All 7 jobs appear in every lens.
- Nothing goes live until he says so.

Assumed by me (correct me):
- Tapping a lens on Home opens the CV page already on that lens. It is a shortcut, not a PDF download.
- The opening starts on a click of the gate button, which reads "Welcome". Agreed with the owner, no door. The look of the gate is open (4.2a).
- The flat world map is replaced by the globe. The old map stays only as a fallback when WebGL is missing.

## 2. Principles

1. One star per screen. Everything else on that screen is calm.
2. Real HTML text for every fact. Motion is a layer on top, never the only copy of anything.
3. Phone first. If a piece cannot hold 30 fps on a mid-range phone it gets a lighter tier, not a delay.
4. One WebGL scene alive at a time. The opening is disposed when it ends. The board and the globe each live on their own page.
5. No build step. Plain files, vendored libraries, relative paths only (the site lives under `/MaxDB/`).
6. Every piece has a fallback and a skip.
7. Public repo: no secrets, no client data, no contact numbers, nothing under NDA.

## 3. Pages

Hash routing stays: `#home`, `#cv`, `#projects`, `#trip`. A lens is part of the CV route: `#cv/ops`, `#cv/chem`, `#cv/cust`.
`#cv` alone is the blended "All" view. The old `#map` redirects to `#trip`.

### 3.1 Global chrome

- Banner (nav): balloon MDB logo, "Max Duffaud Bibas" (hidden under 500 px), Home / CV / Projects / Trip, theme toggle, "Skip to CV" link.
  Logo click goes home. A 2 second hold on the logo toggles the theme (kept).
- The yellow "under construction" banner and the "Under Construction" tag on certificates are removed before launch.
- Footer: email, LinkedIn, (c) 2026, the hidden-story dot (kept), the visitor log widget (kept; the fake guestbook comments are an open call, section 12).
- Consent banner and GA4 loading after consent: unchanged.
- Popups kept: Me in a Nutshell (opened by the walnut sticker), certificate viewer, country album, photo lightbox, the hidden "Short Version" story.
  The three "coming soon" pillar popups are deleted.

### 3.2 Home (4 screens)

1. Opening, then hero. After the opening (section 4): the banner with the logo, the name, one plain line (facts, no labels),
   two buttons (See the CV, Take the trip), the walnut sticker, and three lens buttons: Chemistry & R&D, Operations, Customer-Facing.
   Lens buttons go to `#cv/<lens>`. There is no 3D object on this screen once the opening has ended; the logo in the banner is the last trace of it.
2. What I bring: three direct sentences, plus the stats with count-up (5 countries lived or worked, 35+ visited, 4 languages, 7 roles).
3. Previews: the Trip (one still frame of the real globe with a "Follow the route" call to action) and Projects (three silent promo loops, "All projects"). Each preview is one link to the real page; the real globe and board live only on their own pages (see the art direction brief).
4. Footer.

### 3.3 CV

1. Header: name, headline (changes with the lens), location, email, LinkedIn, language pills. Then the split-flap board with its four buttons
   (All, Chemistry & R&D, Operations, Customer-Facing). The board is the only place the lenses are named on this page. There is no "three CVs" banner.
2. Profile, Core Skills (4 cards), Certificates (Claude 101, AI Fluency), Education (3 entries, notes per lens).
3. Experience: 7 jobs, bullets per lens.

The board is a summary above the full text, not a replacement for it. The experience list stays.

### 3.4 Projects

1. The shelf: filter chips (All, Live, Building), one featured tile with a large loop, then smaller tiles. Each tile: loop, status chip, title, one line.
2. A tile click opens the real project in a new tab. A project with nothing live gets a case page: a bigger loop, three screens, how it was built.

### 3.5 Trip

1. The flight: the globe at full height, route legend, stop card (year, place, one line), play / restart / scrubber, "Explore all countries".
   Always a night scene, in both themes.
2. Explore: the same globe unlocked to drag and zoom, every country in the data highlighted by tier (born, home, study, visit).
   Clicking a country with an album opens the album (VE, IL, FR, ES today, three photos each) or shows its short note.

## 4. The opening

### 4.1 Sequence

| State | What the visitor sees | Ends when |
| --- | --- | --- |
| Gate | Space black screen. A dim cloud of gold spheres drifts. One small button: "Welcome". A low-contrast "Skip" under it. | Click, Enter key or Space on the button; or Skip |
| Gather | Spheres gather into M, D, B and inflate, like balloons filling (about 2.0 s) | Letters formed |
| Hold | Letters hold while a light sweeps across the gold (about 1.3 s) | Release point |
| Release | Spheres float up and out like balloons, as in Fable's original. As they leave, the banner slides down from the top, slowly, with the still logo in it. | About 1.15 s (the slide takes about 1.2 s) |
| Settle | The rest of Home fades in where it stands: the name, the lens list, the previews and the footer, lightly staggered. Nothing else moves. | About 0.8 s |

After the click the opening runs about 4.5 s (Gather, Hold, Release) and Settle adds about 0.8 s. A click, tap, scroll or key during Gather or Hold jumps to Release (already in Fable's version).
"Skip" on the gate jumps straight to the settled page with no animation.

### 4.2 The gate button (agreed: yes, and no vault door)

Reasons for the button:
- It hides the load. Three.js, the letter shape and the logo load while the gate is on screen, so there is never a blank wait.
- It guarantees the whole show is seen from the start, even when the tab loaded in the background (common in in-app browsers).
- The drifting cloud before the click is the "few seconds hovering" he described. It costs nothing extra.

Reasons against, and how they are handled: it adds one click for a visitor in a hurry. So the button is large, the page underneath is already real,
"Skip" is always there, and the gate shows once per browser session and only when landing on Home.

The vault door or any other door is not in the design. It would be a second 3D asset competing with the spheres on the same screen,
and the cloud already works as the door: clicking it is what sets it moving. Revisit only if the owner still wants it after seeing the gate.

### 4.2a Gate look: frosted glass or plain

Two looks were prototyped as a throwaway page (`lab/opening/gate-proto.html`, git-excluded, deleted after the decision):
- Plain: space black, the sharp dim gold cloud drifting, a quiet outlined button.
- Frosted glass (the owner's idea): a pane over the cloud. You cannot see the spheres, but the gold comes through as soft light.
  The button is a glass pill and the pane has a faint grain. On click the frost melts from the center outward over about 1.5 s
  while the spheres start to gather, and the button melts with it.

Mechanics of the frost: a full-screen overlay with `backdrop-filter: blur(17px)` plus saturation and brightness lift, a faint grain,
and a radial `mask-image` whose radius is animated to melt the glass. While the gate is up the cloud renders at 0.7 pixel ratio,
since it is blurred anyway, and returns to full resolution on the click.

Cost and risk: a backdrop blur over a live canvas is a per-frame GPU cost. Not yet measured on a real phone and not yet tested in Safari.
Rule: without `backdrop-filter` support (`CSS.supports`), or when the gate runs under about 30 fps in its first second, the plain look is used.

Recommendation: frosted glass by default, plain as the automatic fallback. The word on the button is "Welcome" (the owner's choice). It is a greeting rather than an action, so the pill must read clearly as a button: a soft glow on hover and a slow breathing pulse at rest. The accessible name is "Welcome, enter the site".

### 4.3 Rules

- Background: space black, `#07070b` (a hint of blue so the gold stands out; tune on screen). The opening stays dark in the light theme. It is a curtain, not a page.
- The real Home page is in the HTML from the start and hidden by CSS only while the gate is up. Search engines and no-JS visitors see the page, never the loader.
- An inline script in `<head>` adds `intro` to `<html>` before first paint when: the visitor lands on Home (empty hash or `#home`), the session flag `mdb-opening`
  is unset, WebGL exists, and reduced motion is off. Otherwise the page shows at once. `?again` forces the opening for review.
- The gate itself is plain HTML and CSS (black screen and a button), so it appears before three.js arrives. The sphere cloud joins when the library is ready.
- Fail-safe: if the opening has not started 3 s after the click, or any script in it throws, remove `intro` and show the page.
- Phones get the lighter tier from Fable's README (about 500 fat spheres instead of about 3,460). Pixel ratio cap 1.5. No shadows.
- One WebGL context at a time: the renderer and its geometry are disposed when the opening finishes.
- The session flag is set when the opening starts, so a refresh during the first visit does not replay it.

### 4.4 Logo handoff

Decision 2026-10-24 (owner), which supersedes the finishes in this section and in sections 5 and 11: the logo is one fixed chrome logo that never changes
with the lens, and the opening plays in a chrome finish. The banner logo (`img/logo/chrome-banner.webp`), the favicons and the sharing image are cut from the
owner's chrome render (`scripts/stills/chrome-render.webp`, a transparent webp) by `scripts/stills/`. The opening keeps its bead animation; its beads are polished
chrome reflecting a dark studio with bright softboxes (`STUDIO` and `chromeShade` in `modules/opening-config.js`). Gold, emerald, gunmetal and orange are gone from the
shipped code. The paragraph below is the earlier, superseded design, kept for the record.

The banner logo is a still image of the balloon MDB in the active finish. I produce it by rendering the Hold frame of the opening scene on a transparent background,
so it is literally the same spheres. Sizes: banner logo, favicon (16, 32, 180), and the 1200x630 sharing image (logo and name on space black).
Finishes chosen so far: gold, emerald and gunmetal (the owner's pick of the chromes: #4b5059, metalness 1, roughness 0.16, clearcoat 0.4). Emerald comes in two depths, #0d7040 (default) and #074a2b, pending the owner's pick. Gunmetal is the quietest on black, so legibility is checked on a real phone in daylight, with #5a606a as the lighter fallback. The opening, the banner still and the favicon always use the same finish, so the handoff holds. Stills are rendered for each finish; the sharing image is always gold on space black.

Decision 2026-10-23 (owner): there is no sphere-to-logo glide. At the release the spheres float up and out like balloons (Fable's original), the banner slides down slowly with the still logo in it, and the rest of the page fades in. The glide code stays in the opening module behind a flag (`GLIDE_HANDOFF` in `js/home-intro.js`), switched off.
The glide was the "same bubbles become the logo" effect. It was built and tried, and the owner preferred the plain version:
spheres float up and out, and the logo arrives with the banner.

## 5. The three motion pieces

| Piece | Lives on | Source | Loads when | Fallback |
| --- | --- | --- | --- | --- |
| Opening | Home, first visit per session | `lab/opening/` | After first paint, gate already visible | Page shows at once |
| Split-flap board | CV, screen 1 | `lab/deep-dive-board/` | When `#cv` is shown | Canvas hidden, the experience list below is the content |
| Flight globe | Trip | `lab/flight-globe/` | When `#trip` is shown | Old flat SVG map and the list of stops |

Rules carried over from the READMEs:
- Board: do not touch the flip engine, the character wheel or the cascade timing. The ripple never runs on page load. Keep the real text.
- Globe: do not raise the pixel ratio cap and do not add shadow maps. Keep the heading solver and the per-leg lines.
- Opening: do not fade a photo over the spheres. Keep it under about 5 s of animation and keep the skip.
- All three are ES modules and stay ES modules. The rest of the site stays classic scripts.

Shared pieces: one vendored copy of three.js, GSAP and the addons they use, under `vendor/`, resolved by one import map in `index.html`
with relative URLs. The country shapes JSON is vendored beside the globe. The board font (Roboto Condensed 700, SIL Open Font License) is vendored as woff2.

The Home preview of the Trip is a single still frame rendered from the globe scene (a short silent loop may replace it later), not a second live scene.

## 6. Content model

### 6.1 Lenses

Three lenses: Chemistry & R&D (`chem`), Operations (`ops`), Customer-Facing (`cust`), plus the blended default `all`.
Five text blocks change with the lens: headline, Profile, Core Skills, job bullets, Education notes.

How it works without a build step:
- Every variant is in the HTML as its own element with `data-lens-text="all|chem|ops|cust"`.
- The CV root carries `data-lens`. CSS shows only the matching variant. With no JavaScript, `all` shows.
- The lens comes from the route (`#cv/ops`) and from the board buttons, and both stay in sync.

### 6.2 One source for the board

Each job in the CV HTML carries its board data: `data-line-all`, `data-line-chem`, `data-line-ops`, `data-line-cust` (at most 28 characters, the board
upper-cases them) and `data-w-chem`, `data-w-ops`, `data-w-cust` (0.2 to 1, the weight dot). The board reads them from the DOM at start.
The board's own hidden text block and its separate `JOBS` object are removed, so a fact is written once.
`scripts/check.mjs` fails the build if a line is over 28 characters or a job is missing a lens.

### 6.3 Copy rules

- Company is Cann.Edenn (double n). American spelling. No em dashes anywhere, straight apostrophes only. Replace dashes with commas, periods or middots.
- The employer described as one fact: "onboarded every new hire as the team grew from about 10 to 35". No further detail, no product or brand names, nothing under NDA.
- Avicampo gets an Operations angle.
- Facts, not labels. No "chemist by training, operator by trade" style claims in the hero.
- No phone number anywhere on the site or in the repo.

## 7. Projects

### 7.1 Data

One entry per project in a single data array (`js/projects.js`): `id`, `title`, `status` (`live`, `demo`, `building`), `oneLine`,
`loop` (webm, mp4, poster), `href` (live) or `casePage`, `public` (boolean), `order`.
Tiles are drawn from the array, with a plain noscript list of titles and links for search and no-JS visitors.
A project only gets a tile when `public` is true.

### 7.2 The loop

A 6 to 10 second silent loop that shows the project doing its job in one or two screens, for example a visitor choosing a car and sending an inquiry.
`<video muted loop playsinline preload="none">` with MP4 and WebM sources and a poster. It plays only while on screen (IntersectionObserver)
and pauses when the tab is hidden. With reduced motion it shows the poster only. No controls. Budget: 600 KB per loop at 720 px wide or less,
under 3 MB for the whole page, nothing downloads before it is near the viewport.

Two ways to make a loop:
- Scripted replay: I drive the real pages in the browser, with an animated cursor and clicks over captured screens, and export it as video.
- Screen recording: for things that are not websites. The owner records, I trim and compress. Whether `ffmpeg` is installed here is checked in the plan.

### 7.3 Candidates

| Project | Status today | Plan |
| --- | --- | --- |
| Car broker template | Live demo, fake data | Featured. Pilot for the loop format |
| Client portal prototype for a laboratory | Runs locally, invented data | Needs a hosted demo before it can be linked |
| Voice-first organizer | Working, personal data | Phone screen recording with fake entries |
| Family business dashboard | Not started | Appears as "building" only if the owner wants it |
| This site | In progress | Making-of case page |

Rules: no real client site, brand photo, contact detail, key or customer data appears. Anything from a client or a family business needs their
OK first. Demos use invented data.

## 8. Visual language

- Tokens stay in `css/base.css`. Accent `#c73410`, teal `#086763`; dark mode `#ff6a45`, `#2be0d1` on charcoal `#2a2c30`. New token: `--space` for the space black.
- The logo comes in two finishes, gold and emerald, used for the logo and the opening only. Neither becomes a UI accent. How they are assigned is open (section 12, item 9). Recommended: gold in the dark theme, emerald in the light theme, because gold is weak on a light page and emerald sits well with the teal.
- Light and dark themes stay. Opening, board and globe are dark objects in both themes.
- Photo watermark: the old molecule overlay becomes a flat MDB mark (`wm-strong` keeps its meaning).
- Art direction and typography beyond this wait for the owner's reference screenshots. Inter stays until then. No redesign before that.

## 9. Performance, accessibility, fallbacks

Budgets:
- Before the gate: HTML, CSS and the classic scripts of Home at or under 150 KB compressed. Text is visible first.
- Three.js and the opening loaded after first paint, roughly 170 KB compressed (to be measured, not assumed). Cached for the board and the globe.
- Board and globe load only on their own page.
- 60 fps on desktop, 30 fps or better on a mid-range phone, measured on a real device before launch. Pane emulation is not proof.

Tiers: full (desktop), lite (phones: fewer spheres, pixel ratio cap 1.5), none (reduced motion, no WebGL, or Save-Data: no opening, board hidden,
globe replaced by the old map and the stop list).

Accessibility: the gate is a real `<button>` that takes focus; Skip is a real link or button; every canvas is `aria-hidden` with its content present as text;
board tabs are real buttons with visible focus; the lens variants not shown are hidden from screen readers; reduced motion removes every flip,
float and glide; contrast checked in both themes.

Sharing and search: title, description, Open Graph and Twitter tags, the 1200x630 sharing image, `theme-color`, favicon set. The CV text stays static HTML.
Also fixed on the way: the viewport tag that blocks pinch zoom, and the Google Fonts `@import` (replaced by preconnect and a link).

## 10. Architecture and deploy

```
index.html          markup for all pages, one import map, small inline head scripts (consent, theme, opening flag)
css/                base, home, cv, projects, trip, widgets, story, opening
js/                 classic scripts: data, vlog, popups, consent, nav, projects
modules/            ES modules: opening.js, board.js, flight.js, jet.js (moved from lab/, loaded on demand)
vendor/             three, gsap, addons, countries-110m.json, Roboto Condensed woff2
img/                logo stills, photos, certs, sharing image
scripts/            serve.mjs (adds a LAN option for phone tests), check.mjs
lab/                the three chosen pieces as reviewed; reference only, removed before the merge to main
```

- `scripts/check.mjs` grows: parse ES modules (they fail `new Function`), check every relative path including the import map and `vendor/`,
  check board lines, fail on em dashes and on the string "Technical Sales" anywhere in the site files.
- Cache: GitHub Pages caches 10 minutes. Own files get a `?v=` bump on change; vendored files never change in place.
- Deploy is unchanged: a push or merge to `main` goes live in about a minute, and only with the owner's explicit OK.
  Work stays on `restructure`. The rollback reference is the tag `v1-single-file`.
- The Pages "GitHub Actions" source switch is not needed. If a build step is wanted later, it is a separate decision.

## 11. Build order

Each phase ends with `node scripts/check.mjs` printing "All good.", a look at light and dark and at 375 px width, and a commit on `restructure`.

0. Foundation. Vendor the libraries and fonts, add the import map, extend `check.mjs`, add the LAN option to `serve.mjs`, add the tokens.
   Done when: the current site is visually identical and the check passes.
1. CV lenses. `data-lens-text` variants, `#cv/<lens>` routing, Customer-Facing rename, copy fixes, the board wired in and reading from the HTML, light-theme chrome around it.
   Done when: the CV is complete with JavaScript off, every lens reads correctly, no board line is cut, and the board fallback works.
2. Opening, banner, logo. Gate, timeline, hero staging, logo stills (banner, favicon, sharing image), banner reveal, skip, session flag, phone tier, fail-safes.
   Done when: the click to the settled hero plays at desktop and 375 px, Skip and reduced motion work, there is no flash of the page before the gate, and JS-off shows the page.
3. Trip. Globe as a page, vendored data, final stop copy, Explore mode and albums, flat MDB watermark, Home preview still frame.
   Done when: all route stops and the albums work on phone and desktop and the old map appears only without WebGL.
4. Projects. Page, data array, tiles, the pilot loop for the car broker project, then the others as they become ready, Home preview.
   Done when: the page is complete with at least the pilot, and every tile follows the rules in 7.3.
5. Launch polish. Real phone test over the LAN, performance and accessibility pass, sharing tags and image, proofreading, banner and tags removed, `lab/` removed (it stays in git history), the owner's OK, then merge.

## 12. Decisions

Spec approved by the owner on 2026-10-20, with the defaults below.

Made:
- The three lab pieces are final. Pages and wireframes approved. Lens buttons on Home are shortcuts to the CV. No PDF downloads for now.
- No build step. One vendored copy of three.js. Hash routing with `#cv/<lens>`.
- Gate button reads "Welcome", with a Skip. No vault door. Look: frosted glass, with the plain look as the automatic fallback (4.2a).
- The opening plays once per browser session.
- Sphere-to-logo glide, with the plain fade as the fallback if the glide does not look right.
- Explore mode is the same globe unlocked. The flat map stays only as the no-WebGL fallback.
- The visitor log keeps its fake guestbook comments for now.
- Logo finishes: gold, emerald (#0d7040) and gunmetal (#4b5059). Gold for the opening and the blended view, emerald and gunmetal for two lenses,
  a fourth finish (orange or teal) for the third lens. Per-lens tint matches the earlier decision. The fourth finish is picked when the stills are rendered.

Open (owner, needed before the phase that uses them):
1. Final words, needed in phase 1: the hero line, the three "what I bring" sentences, the 7 board lines per lens, the weights. The flight stops are needed in phase 3.
2. Project details, needed in phase 4: for each project one sentence, status, public yes or no, and the steps the loop should show.
3. Reference screenshots for art direction and typography, needed before any redesign.

Open (technical, settled in the plan): the mapping from the globe's country ids to the two-letter codes used by the data, whether `ffmpeg` is available,
the exact size of three.js after vendoring, and which of the board and globe get lighter phone tiers.

## 13. Not doing

- A vault door or any second 3D object on the opening screen.
- A hallway or 3D world for Projects (cards and loops first; revisit later).
- Downloadable lens PDFs (they contain a phone number and the repo is public; revisit with a clean version).
- A redesign of typography and layout before the reference screenshots arrive.
- A build tool, a backend, a CMS, or a framework.
- A "three CVs" banner on the CV page.
