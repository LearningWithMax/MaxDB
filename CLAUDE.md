# Personal site (Max Duffaud Bibas)

CV + projects + trip (a flight over a globe). Vanilla HTML/CSS/JS. No framework, no build step, no backend.
Live at https://learningwithmax.github.io/MaxDB/ (GitHub Pages, served from the root of `main`).
This repo is PUBLIC. Never commit secrets, private notes or anything you would not put on the page.

## Deploy rules (read first)
- A push or merge to `main` goes live in about a minute. Never push to `main` without the owner's explicit OK.
- Work on a branch. Pushing a branch does not change the live site.
- Relative paths only (`css/base.css`, never `/css/base.css`). The site lives under `/MaxDB/`.
- Tag `v1-single-file` = the original one-file version. Rollback reference.

## Structure
```
index.html     markup for the 4 pages (home, cv, projects, trip) + overlays + the inline flat map SVG (the Trip fallback), one import map,
               small inline <head> scripts
css/           tokens.css (every color, font, spacing and width variable), fonts.css, base.css, chrome.css (banner, footer),
               home.css, cv.css, board.css, opening.css, map.css (flat map and album popup), globe.css (Fable's globe UI), trip.css,
               projects.css, widgets.css, story.css
js/            data.js, vlog.js, popups.js, consent.js, route.js, lens.js, theme.js, clock.js, projects.js, projects-slider.js, trip.js,
               nav.js, map.js, home-intro.js
modules/       ES modules loaded on demand: opening.js, board.js, globe.js + globe-data.js + jet.js (Fable's flight globe), trip-stops.js
               (the site's stop wording), and their data and config files
vendor/        self-hosted libraries and fonts (three, gsap, woff2) with MANIFEST.json; check.mjs verifies the hashes
img/           logo/ (one fixed chrome banner logo, favicons, bead shape), grain.png, trip-preview.webp, nutshell-sticker.png,
               photos/<cc>-<slug>.jpg, certs/, projects/<id>/ (HD stills for the slider and the case view)
scripts/       serve.mjs (local server), check.mjs (validation), budget.mjs (size budget), stills/ (logo and Trip card images), clips/
               (capture.mjs takes real pages with Chrome and still.mjs makes the project stills with ffmpeg), lib/, trip-list.mjs,
               projects-list.mjs, and the *.test.mjs tests
docs/          the specs, plans and notes for the rebuild (docs/superpowers/)
originals/     full-size photos, gitignored
```

## How the code fits together
- Classic scripts share one global scope and load in this order: data, vlog, popups, consent, route, lens, theme, clock,
  projects, projects-slider, trip, nav, map, home-intro. Inline `onclick="..."` handlers call global function declarations, so keep those global.
  The opening, the board and the globe are ES modules in `modules/`, loaded on demand through the one import map in `index.html`
  (it points only at `vendor/`).
- Pages are `section.page` with hash routing (`#home`, `#cv`, `#cv/chem|ops|cust`, `#trip`; the old `#map` redirects to `#trip`) in
  `js/route.js` and `js/nav.js`. Adding a page means: nav button, `<section class="page" id="page-x">`, `PAGES` in `route.js`,
  and `vlogPageNames`.
- Theme: dark is the default, paper (light) is `:root[data-theme="light"]`. Every color, font, spacing and width lives in
  `css/tokens.css`; do not write colors elsewhere (the dark objects have fixed `--board-*` tokens). localStorage keys: `mdb-theme`
  (`dark` or `light`), `mdb-consent`; session key `mdb-opening`. GA4 loads only if `mdb-consent === 'accepted'`.
- Palette (dark / paper): bg `#15130f` / `#f2ece1`, ink `#f2ece1` / `#16130e`, gold `#d9ae4c` / `#a47a16`, gunmetal `#9aa3b0` / `#4b5059`,
  teal `#3fcf8d` / `#0d7040`, orange `#ff7a4d` / `#b8431f`. The look is in `docs/superpowers/specs/2026-10-21-art-direction-brief.md`.
- Every CV text block exists in four readings (`data-lens-group` with `data-lens-text="all|chem|ops|cust"`). The board reads the
  `.job[data-board]` data attributes, and the Home departures preview must repeat the first three jobs; `check.mjs` verifies both.
- Map data lives in `js/data.js`: `countryData` (tier + note), `countryAlbums` (kicker, flag gradient, intro),
  `countryPhotos` (`{src, caption, wm?}`). `wm: true` gives the stronger watermark (`wm-strong`).
- CV copy is static HTML on purpose (search, link previews, screen readers). Do not move it into JS.
- Projects: the data is `PROJECTS` in `js/projects.js`, a public file (a private project is simply not in it; no client names).
  The page is a slider (`js/projects-slider.js`): one project selected in the middle, arrows, dots, keys and swipe (the row of cards follows the finger while it drags; the first clear movement locks the direction, sideways drags the cards and blocks page scroll, vertical scrolls the page and never moves the cards), wrapping around, and
  under it the title, status, what it does (`oneLine`), what it is built with (`builtWith`), where it stands (`stands`) and one button:
  Visit (`href`), See how it is built (`case`, only this website has a case view, `#projects/site`) or Ask for access (`access: 'request'`,
  an email to the CV address; a demo login is given on a call and never written in the repo). There is no video: a project has an HD
  still (`image`, with a thumb) or a drawn `figure`, and `check.mjs` fails on any video or autoplay and on oversized images.
  After changing a project's text run `node scripts/projects-list.mjs` (it rewrites the plain no-JavaScript list in `index.html`).
  Stills (needs Chrome or Edge, and ffmpeg: `winget install Gyan.FFmpeg --source winget`): with `node scripts/serve.mjs` running,
  `node scripts/clips/capture.mjs site` takes 2560 by 1600 PNGs of the real site, and `node scripts/clips/still.mjs` makes a WebP of one.
  Details in `docs/superpowers/notes/2026-10-25-sharp-captures.md` and `2026-10-25-projects-slider-results.md`.
- Trip: the globe (`modules/globe.js`, Fable's, do not edit without asking him) is built by `js/trip.js` on the first visit to
  `#trip` and removed when you leave. The words of the 11 stops are `TRIP_STOPS` in `modules/trip-stops.js`; after changing them run
  `node scripts/trip-list.mjs` (it rewrites the plain stop list in `index.html`, and `check.mjs` fails if they differ). Without WebGL
  the flat map and that list show. The Home card image is rendered from the real globe with `scripts/stills/trip.html`.
  `js/trip.js` also keeps the globe's route list scrolled to the highlighted stop (`tripFollowStop`), because on a phone that list is a sideways strip. The glide takes `TRIP_FOLLOW_MS` (1200) there; raise it for a lazier glide.

## Search and sharing tags
The `<title>`, description, canonical address, Open Graph and X tags and the structured data in the head of `index.html` (between
`<!-- seo:start -->` and `<!-- seo:end -->`), `sitemap.xml` and `robots.txt` are generated from `scripts/lib/seo.mjs`. To change any of
them edit that file and run `node scripts/seo.mjs`; `scripts/seo.test.mjs` fails while they differ. They use absolute `https://` addresses, the
one exception to "relative paths only" (a crawler needs the whole address). If the site gets its own domain, change `site` there and rerun.
The owner's learning notes and his to-do list for Google Search Console and LinkedIn are in `docs/superpowers/notes/2026-10-25-seo-guide.md`.

## Photos
Resize to 900px wide, JPEG quality about 72, apply EXIF rotation, 50 to 150 KB each. Save as
`img/photos/<country-code>-<slug>.jpg` and reference the path in `js/data.js`. Originals stay in `originals/`.

## After every edit
1. `node scripts/check.mjs` must print "All good."
2. Preview with the `site` config in `.claude/launch.json` (port 5317). Check light and dark, and a phone width.
3. Windows checkouts are CRLF locally and LF in git (`core.autocrlf=true`). Prefer small targeted edits.

## How the owner likes to work
- Direct, concise, strong opinions, plain English. Never use em dashes in anything written for him, site copy included.
- Be skeptical and verify your own work. He is not always right and neither are you.
- Before any large change, say the plan in a few lines and wait for his OK.

## Current priorities
0. LAUNCH FIRST (owner decision, 2026-10-27): he wants the site live as soon as it works, to start sharing it, and will not wait for the projects. The Projects page
   carries a big "Work in progress" notice (aside.projects-notice in index.html, styled in css/projects.css; delete both when the projects settle). Launch steps, one at a time:
   DONE 2026-10-27: the site-wide construction banner and the CV "Under Construction" tag on Certificates are gone (the owner adds a certificate when he gets one). `lab/` (the three early prototypes, including Fable's flight-globe) is removed and archived outside the repo
   in `C:/Users/maxu9/Claude Projects/site-archive/` (a zip of lab/ and a zip of the whole source), and the local tag `pre-launch-restructure` marks the last commit before the launch
   (never push that tag or `restructure`). The Home still is retaken, the full pass is clean. Left: push `old-site`,
   squash-merge on his explicit OK, check the live page and the LinkedIn preview. THEN, after the launch: rewriting each project's text with the owner, one project at a time (what exists now, what it becomes, why; he
   answers yes or no; the repo is public, so nothing may be invented). Done: the car broker (2026-10-27): the one line may now be up to 300 characters, a project may have an
   optional `dashboard` row ("Inside the dashboard", up to 300), the old claim that the broker answers from the dashboard is gone. The code-checked facts are in
   `car-broker-facts.local.md` (git-ignored: limits and costs are not site copy). The demo online is an earlier version than the code on his PC (its Sales path returns
   "page not found"), which "Where it stands" says; he will send a list of what is not pushed yet so the dashboard row can be checked against it. The car broker text waits for its release: the owner is pushing the newer code to the demo with the other chat, will test everything, and then gives the final
   facts; then update the text, the "Inside the dashboard" row (a richer draft with search, filters, CSV export and duplicate is ready, 278 characters), the new-look
   note and the screenshot, and say that small adjustments are still coming. Next: "This website"
   (questions asked: is "built with AI" the right claim, the point of the site in one line, credit Fable for the globe?), then the organizer, the broker template for any
   market and the quote marketplace. Then settle the "How I work" text (he sent two example sites: a four-step process with a discovery call, and a short FAQ with real
   promises such as a reply time; the point is that templates are a base that is personalized, and specific or unique tools can be built; where it goes: a block on the
   Projects page, a line in each template panel, or Home). Only claims he can stand behind. After that the launch cleanup (final
   checks, `old-site` backup, squash-merge on his OK). Idea for after the launch: sell the basic templates on a marketplace for digital products and offer the custom service there too.
1. Review the new shell, Projects and Trip on branch `restructure` (nothing is pushed, nothing is live). Merging to `main` needs his
   explicit OK; push the old site as a backup branch (`old-site`) first.
2. Projects, what is left: the car broker demo (`https://mdesigns-broker-demo.vercel.app`) is about to change visually, so its slide image must
   be retaken when it does: `node scripts/clips/capture.mjs car-broker`, then `node scripts/clips/still.mjs captures/car-broker/01-home.png
   img/projects/car-broker/home.webp --w 1600 --h 1000 --limit 250000` and the same with `home-thumb.webp --w 800 --h 500 --limit 80000`, and
   update the image `alt` in `js/projects.js` if the page looks different, and delete the car broker's `note` there (the "new look is coming" line under its title), then run `node scripts/projects-list.mjs`. Later: real screenshots for the organizer (his phone) and the
   marketplace, replacing their drawn diagrams; a public `href` when another demo has one. The owner tests the slider swipe on his iPhone
   (`node scripts/serve.mjs --host`). The earlier whole-branch review is done and its fixes are in; what it left (notes for Fable, deferred
   minors, merge advice: squash-merge, never push `restructure`) is in `docs/superpowers/notes/2026-10-25-review-results.md` and
   `2026-10-25-projects-slider-results.md`.
3. Trip stage 2: Explore mode (Fable adds `setMode` and a country event to the globe), click a country for its album or note.
4. Launch polish: done (real phone test, sharing tags and image, proofreading pass, construction banner and `lab/` removed). After the launch: the Search Console
   verification and the LinkedIn Post Inspector check (see `docs/superpowers/notes/2026-10-25-seo-guide.md`).
5. Owner wants to change the timings of the opening (`modules/opening-config.js`, `js/home-intro.js`) and of the site fading in after it.
   He will say when; nothing to do until then.
6. Names that must stay off the Projects page but cannot be written in this public repo go one per line in `scripts/private-names.local.txt`
   (git-ignored). `node scripts/check.mjs` reads it and prints a note when it is missing.
