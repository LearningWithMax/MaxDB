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
  teal `#3fcf8d` / `#0d7040`, orange `#ff7a4d` / `#b8431f`, blue `#4f8dff` / `#1f5fd6` (the Operations reading; gunmetal stays for the surname and the logo). The look is in `docs/superpowers/specs/2026-10-21-art-direction-brief.md`.
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
- Trip: the globe (`modules/globe.js`, Fable's, do not edit without asking him; Fable is a Claude model, and the owner credits everything on the site to Claude) is built by `js/trip.js` on the first visit to
  `#trip` and removed when you leave. The words of the 11 stops are `TRIP_STOPS` in `modules/trip-stops.js`; after changing them run
  `node scripts/trip-list.mjs` (it rewrites the plain stop list in `index.html`, and `check.mjs` fails if they differ). Without WebGL
  the flat map and that list show. The Home card image is rendered from the real globe with `scripts/stills/trip.html`.
  Site-side adjustments to the globe go in `css/trip.css` and `js/trip.js`, not in the globe's own files (for example the controls stop before the route list in a wide window, and the list
  sits above the globe's dark gradient).
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
LIVE since 2026-10-27 at https://learningwithmax.github.io/MaxDB/ (commit 0bebb21 on `main`, a squash of the old `restructure` branch). The previous one-file site is kept on the
branch `old-site` and the tag `v1-single-file`. `restructure` and the tag `pre-launch-restructure` are LOCAL archives: never push them (their older commits hold a client name).
Copies of `lab/` (the early prototypes) and of the whole source are in `C:/Users/maxu9/Claude Projects/site-archive/`. New work goes on a branch made from `main` (the current one
is `next`); merging into `main` goes live in about a minute and needs the owner's explicit OK. Pushing works from Claude's shell because his GitHub sign-in is remembered.

1. Just after the launch (the owner does these): run the link through LinkedIn's Post Inspector, then post; send the Search Console verification tag so it can be added
   (see `docs/superpowers/notes/2026-10-25-seo-guide.md`). He keeps the GitHub address for now (decided 2026-10-27); later, optionally, a domain of his own (it can point at GitHub Pages and keep the address if the host changes).
2. Project texts, one project at a time with the owner (what exists now, what it becomes, why; he answers yes or no; the repo is public, so nothing may be invented). The Projects
   page carries a big "Work in progress" notice (`aside.projects-notice` in `index.html`, styled in `css/projects.css`; delete both when the projects settle). The one line may be up
   to 300 characters, and a project may have an optional `dashboard` row ("Inside the dashboard", up to 300).
   - Car broker: text done on 2026-10-27, then it waits for the release of the newer code to the demo (the owner is pushing it with the other chat and will test everything). Then
     update the text and the "Inside the dashboard" row (a richer draft with search, filters, CSV export and duplicate is ready, 278 characters), the new-look note and the
     screenshot, and say that small adjustments are still coming. The code-checked facts are in `car-broker-facts.local.md` (git-ignored: limits and costs are not site copy).
     The demo online is an earlier version than the code on his PC (its Sales path returns "page not found"), which "Where it stands" says.
   - This website: text done on 2026-10-27 (the point of the site is a showcase of him: professional, creative and tech sides; the credit goes to Claude as a whole, never to
     individual models; a plain "Built with Claude" line sits in the footer). The "Built with" row starts with the tool because its label already says "Built with".
   - Quote marketplace: text done on 2026-10-27 (a B2B portal, with an "Inside the dashboard" row and the button "Ask for access · coming soon", set with `soon: true`). Its code is in
     a folder next to this repo, named for the client it started with; never copy anything private from it into this public repo. When a generic template version of it exists, update the text and
     drop `soon`. The public text says accept, pay, then send the details for delivery.
   - Next: the organizer and the broker template for any market. Reading buttons on the CV: all, customer-facing, operations, chemistry (`LENS_ORDER` in `modules/board-data.js`); the Home rows follow the same order.
3. The "How I work" text (he sent two example sites: a four-step process with a discovery call, and a short FAQ with real promises such as a reply time). The point is that the
   templates are a base that is personalized, and that specific or unique tools can be built for a person; both "look what I can do" and "contact me for one like it". Decide with him
   where it goes (a block on the Projects page, a line in each template panel, or Home). Only claims he can stand behind. Idea for after that: sell the basic templates on a
   marketplace for digital products and offer the custom service there too (nothing researched yet; check licenses, support and what is claimed before listing anything).
4. Projects, the picture work: the car broker demo (`https://mdesigns-broker-demo.vercel.app`) is about to change visually, so its slide image must be retaken when it does:
   `node scripts/clips/capture.mjs car-broker`, then `node scripts/clips/still.mjs captures/car-broker/01-home.png img/projects/car-broker/home.webp --w 1600 --h 1000 --limit 250000`
   and the same with `home-thumb.webp --w 800 --h 500 --limit 80000`, update the image `alt` in `js/projects.js` if the page looks different, delete the car broker's `note` there
   (the "new look is coming" line under its title), then run `node scripts/projects-list.mjs`. Later: real screenshots for the organizer (his phone) and the marketplace, replacing
   their drawn diagrams; a public `href` when another demo has one. What the earlier reviews left (notes for Fable, deferred minors) is in
   `docs/superpowers/notes/2026-10-25-review-results.md` and `2026-10-25-projects-slider-results.md`.
5. Trip stage 2: Explore mode (Fable adds `setMode` and a country event to the globe), click a country for its album or note.
6. Owner wants to change the timings of the opening (`modules/opening-config.js`, `js/home-intro.js`) and of the site fading in after it. He will say when; nothing to do until then.
7. Names that must stay off the Projects page but cannot be written in this public repo go one per line in `scripts/private-names.local.txt` (git-ignored). `node scripts/check.mjs`
   reads it and prints a note when it is missing. Add a certificate on the CV when the owner earns one (he will say).
