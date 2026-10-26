# Master site core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phases 0 to 2 of the master site: the no-build foundation, the CV with three lenses and the split-flap board, and the Welcome gate, the opening, the banner logo and the hero settle on Home.

**Architecture:** Classic scripts stay for the existing site. The three motion pieces are ES modules in `modules/`, loaded on demand through one import map that points only at `vendor/`. Pure logic (routing, intro decision, board data, geometry) lives in small files that Node tests load directly. Every visual change is verified in the browser pane and `node scripts/check.mjs` must print "All good." at the end of each task.

**Tech Stack:** Vanilla HTML, CSS, JS. three.js 0.184.0 and GSAP 3.15.0, vendored. `node:test` (built in, no install). Node 24 for scripts.

**Spec:** `docs/superpowers/specs/2026-10-18-master-site-design.md` (approved 2026-10-20). Spec sections covered here: 3.1 (banner and logo), 3.2 screen 1, 3.3, 4, 5 (opening and board), 6, 8 (tokens and finishes), 10, and phases 0 to 2 of section 11. Deferred to later plans: 3.2 screens 2 to 4, 3.4 and 7 (Projects), 3.5 (Trip) with the globe, the flat MDB photo watermark, `?v=` cache-busting of own files, sharing tags, removal of the construction banner, launch polish.

## Global Constraints

- Relative paths only (`css/base.css`, never `/css/base.css`). The site lives under `/MaxDB/`.
- No build step, no npm install for the site. Libraries are vendored. ES modules only for the 3D pieces; everything else stays classic scripts.
- Never push to `main`. Work on branch `restructure`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and are written via a file (`git commit -F`), never piped through PowerShell.
- Copy rules: company is `Cann.Edenn` (double n). American spelling. No em dashes, no en dashes, no `&mdash;` or `&ndash;`, straight apostrophes and quotes only. The lens is named `Customer-Facing`, never "Technical Sales".
- The employer Intelcia is described by one fact only: "onboarded every new hire as the team grew from about 10 to 35". No listing review, no product or brand names, nothing under NDA. No phone number anywhere.
- Lens keys: `all`, `chem`, `ops`, `cust`. Routes: `#home`, `#cv`, `#cv/chem`, `#cv/ops`, `#cv/cust`, `#map` (kept until the Trip plan).
- Board lines: at most 28 characters, upper-cased by the board.
- Opening: plays once per browser session (`sessionStorage` key `mdb-opening`), only on landing at Home, never with reduced motion or without WebGL. Gate button text `Welcome`, accessible name `Welcome, enter the site`, plus a `Skip`. Fail-safe: page shown 3 s after the click if the opening has not started.
- Colors: space black `#07070b`. Finishes: gold `#e2b454` (metalness 1, roughness 0.22, clearcoat 0.4), emerald `#0d7040` (1, 0.24, 0.5), gunmetal `#4b5059` (1, 0.16, 0.4), orange `#ff6a45` (0.3, 0.3, 0.9).
- Frost gate: `backdrop-filter: blur(17px) saturate(2.4) brightness(1.9) contrast(1.1)`, grain at opacity 0.16, radial mask radius animated from -20 to 150 over 1.5 s (`power2.inOut`), cloud rendered at pixel ratio 0.7 while gated, plain look if `backdrop-filter` is unsupported or the gate runs under 30 fps in its first second.
- Budgets (measured in Task 15, not assumed): HTML, CSS and classic JS before the gate at or under 150 KB compressed.
- Fable's README rules: do not change the board's flip engine, character wheel or cascade timing; the ripple never runs on load; keep the opening under about 5 s; no photo fades over the spheres.

## Review Focus

1. Odd hashes: `#cv/foo`, `#cv/`, `#CV/OPS`, `#cv/ops/x` must land on the CV with a valid lens, never a blank page (Task 4).
2. Storage blocked (private mode, in-app browsers): `sessionStorage` and `localStorage` throw. The opening must still run once per page load and nothing may crash (Task 11).
3. three.js blocked, slow or throwing: the visitor must not be stranded on the gate. The page shows within 3 s of the click (Task 12).
4. Deep link and history: a shared `#cv/ops` link skips the opening; Back and Forward after the settle never replay it (Tasks 11 and 12).
5. Tab hidden during the gate or the opening (in-app browsers suspend animation): state stays consistent and the page is shown by a real-time fail-safe even if frames never come (Task 12).

---

## Phase 0: Foundation

### Task 1: Rules harness, module parse, import-map check

**Files:**
- Create: `scripts/lib/rules.mjs`, `scripts/lib/load-classic.mjs`, `scripts/rules.test.mjs`
- Modify: `scripts/check.mjs`

**Interfaces:**
- Produces: `parseEsModule(src: string): string | null` (error text, or null when it parses), `checkImportMap(html: string, exists: (rel: string) => boolean): string[]` (messages), `loadClassic(file: string, names: string[]): Record<string, unknown>` (runs a classic script in a `vm` context and returns the named top-level bindings).

- [ ] **Step 1: Write failing tests** in `scripts/rules.test.mjs`:
  - `parseEsModule('import a from "x"; export const y = 1;') === null`; `parseEsModule('export const = ;')` is a string containing `SyntaxError`.
  - `checkImportMap` with an import map `{"imports":{"three":"./vendor/three/three.module.min.js"}}`: `exists=()=>false` gives one message containing that path; `exists=()=>true` gives `[]`; a value `/vendor/x.js` gives a message containing `absolute`; a value `https://cdn.jsdelivr.net/x.js` gives a message containing `remote`; no import map gives `[]`.
  - `loadClassic` on a temp file `const A = 1; function f(){ return A; }` with names `['f']` returns an object whose `f()` is `1`.
- [ ] **Step 2:** Run `node --test scripts/` and confirm it fails with a missing-module error.
- [ ] **Step 3:** Implement the three functions. `parseEsModule`: write the source to a temp `.mjs` file and run `node --check` on it. `loadClassic`: append `;({name1,name2})` to the source and run it with `vm.runInNewContext`.
- [ ] **Step 4:** Run `node --test scripts/` and confirm it passes.
- [ ] **Step 5:** In `scripts/check.mjs`, add: every `modules/*.js` passes `parseEsModule`; `checkImportMap(html, exists)` messages become problems. Keep the existing checks.
- [ ] **Step 6:** Run `node scripts/check.mjs`; expected last line `All good.`. Commit `Add rules harness: module parse and import-map checks`.

### Task 2: Vendor the libraries

**Files:**
- Create: `scripts/vendor.mjs`, `vendor/MANIFEST.json`, `vendor/three/` (module and core min builds, addons, `LICENSE`), `vendor/gsap/` (`index.js`, `gsap-core.js`, `CSSPlugin.js`, license note), `vendor/data/countries-110m.json`, `vendor/fonts/RobotoCondensed-700.woff2` (+ `OFL.txt`), `scripts/vendor-selftest.html`
- Modify: `index.html` (import map in `<head>`, before any module script), `scripts/lib/rules.mjs`, `scripts/rules.test.mjs`, `scripts/check.mjs`

**Interfaces:**
- Consumes: Task 1 `checkImportMap`.
- Produces: import specifiers `three` -> `./vendor/three/three.module.min.js`, `three/addons/` -> `./vendor/three/addons/`, `gsap` -> `./vendor/gsap/index.js`. `verifyManifest(manifest: {files: Record<string, {sha256: string}>}, read: (rel: string) => Buffer | null): string[]` in `rules.mjs`.

- [ ] **Step 1: Write failing test** `verifyManifest`: a manifest with the sha256 of `abc` and a reader returning `abc` gives `[]`; a reader returning `abd` gives one message containing the path; a reader returning `null` gives one message containing `missing`.
- [ ] **Step 2:** Run `node --test scripts/`; confirm the new test fails.
- [ ] **Step 3:** Implement `verifyManifest`. Pass.
- [ ] **Step 4:** Write `scripts/vendor.mjs`: a pinned list of source URLs (three 0.184.0 `build/three.module.min.js`, `three.core.min.js`, and addons `RoomEnvironment`, `Line2`, `LineSegments2`, `LineGeometry`, `LineSegmentsGeometry`, `LineMaterial`; gsap 3.15.0 `index.js`, `gsap-core.js`, `CSSPlugin.js`; world-atlas 2.0.2 `countries-110m.json`; Roboto Condensed 700 latin woff2 resolved from the Google Fonts CSS). It downloads into `vendor/`, and writes `vendor/MANIFEST.json` with `sha256`, `bytes` and `gzipBytes` per file. If a `.min` build does not exist for the pinned version, fall back to the plain build and say so in the output.
- [ ] **Step 5:** Run `node scripts/vendor.mjs`; expected: a table of files and sizes, the three core + module gzip total printed.
- [ ] **Step 6:** Add the import map to `index.html`; wire `verifyManifest` into `check.mjs`.
- [ ] **Step 7:** Create `scripts/vendor-selftest.html` (own import map with `../vendor/` paths) that imports `three`, `three/addons/environments/RoomEnvironment.js`, `three/addons/lines/Line2.js` and `gsap` and logs `vendor ok 184 3.15.0` (from `THREE.REVISION` and `gsap.version`). Serve, open it, expected console line `vendor ok 184 3.15.0` and no errors.
- [ ] **Step 8:** `node scripts/check.mjs` ends `All good.`. Commit `Vendor three, gsap, shapes and font with a manifest`.

### Task 3: Dev server: LAN access and stills saving

**Files:**
- Modify: `scripts/serve.mjs`
- Create: `scripts/lib/savepath.mjs`, `scripts/savepath.test.mjs`

**Interfaces:**
- Produces: `safeSavePath(root: string, rel: string): string | null`. Accepts only `img/logo/<[a-z0-9-]+>.(png|webp)` and `img/<[a-z0-9-]+>.png`. Server flags: `--host` binds `0.0.0.0` and prints every LAN URL; `--save` enables `POST /__save?path=<rel>` (raw bytes body, replies 204); without `--save` that route replies 404.

- [ ] **Step 1: Write failing tests**: accepts `img/logo/gold-banner.webp` and `img/og.png`; returns `null` for `../x.png`, `img/../x.png`, `img/logo/a.svg`, `js/a.png`, `/etc/x`, `img/logo/A.png`, `img/logo/a/b.png`.
- [ ] **Step 2:** Run `node --test scripts/`; confirm they fail.
- [ ] **Step 3:** Implement `safeSavePath` and the two flags in `serve.mjs`. Keep the existing positional args (`dir`, `port`) working.
- [ ] **Step 4:** Run `node --test scripts/`; pass.
- [ ] **Step 5:** Verify by hand: `node scripts/serve.mjs --host` prints a `http://192.168.` or `10.` style URL and `curl` on it returns 200; `curl -X POST "http://localhost:5317/__save?path=img/logo/t-x.png" -d x` returns 404 without `--save`; with `--save` it returns 204 and the file exists; delete the file.
- [ ] **Step 6:** Commit `Dev server: LAN option and a guarded save route for stills`.

---

## Phase 1: CV lenses

### Task 4: Routing with `#cv/<lens>`

**Files:**
- Create: `js/route.js`, `scripts/route.test.mjs`
- Modify: `js/nav.js`, `index.html` (script order becomes data, vlog, popups, consent, route, nav, map)

**Interfaces:**
- Produces (classic globals): `LENSES = ['all','chem','ops','cust']`, `normalizeLens(x: unknown): Lens`, `parseRoute(hash: string): {page: 'home'|'cv'|'map', lens: Lens}`, `buildHash(page: string, lens?: string): string`. `goTo(page, lens?)` keeps working for the existing inline `onclick="goTo('cv')"` handlers.

- [ ] **Step 1: Write failing tests** with `loadClassic('js/route.js', ['parseRoute','buildHash','normalizeLens'])`:
  - `parseRoute('')` and `parseRoute('#home')` give `{page:'home', lens:'all'}`; `parseRoute('#cv')` gives `{page:'cv', lens:'all'}`; `parseRoute('#cv/ops')` gives lens `ops`; `parseRoute('#CV/OPS')` gives `{cv, ops}`.
  - Review Focus 1: `parseRoute('#cv/foo')`, `parseRoute('#cv/')`, `parseRoute('#cv/ops/x')` give `{cv, all}`, `{cv, all}`, `{cv, ops}`; `parseRoute('#nope')` gives home; `parseRoute('#map')` gives `{map, all}`.
  - `buildHash('cv','ops') === '#cv/ops'`, `buildHash('cv','all') === '#cv'`, `buildHash('home') === '#home'`.
- [ ] **Step 2:** Run `node --test scripts/`; confirm failure.
- [ ] **Step 3:** Implement `js/route.js`. In `nav.js`, make `initFromHash` and `goTo` use `parseRoute` and `buildHash`, and call `window.setLens && setLens(lens)` when the page is `cv` (Task 5 defines `setLens`).
- [ ] **Step 4:** Run tests; pass. Run `node scripts/check.mjs`; `All good.`.
- [ ] **Step 5:** In the browser: `#cv/ops` shows the CV page active; `#cv/zzz` shows the CV; the nav buttons still work; Back returns to the previous page. No console errors.
- [ ] **Step 6:** Commit `Route a lens in the CV hash`.

### Task 5: Lens infrastructure

**Files:**
- Create: `js/lens.js`, `scripts/lens.test.mjs`
- Modify: `css/cv.css`, `index.html` (`data-lens="all"` on `#page-cv`, script tag after `route.js`), `scripts/lib/rules.mjs`, `scripts/rules.test.mjs`, `scripts/check.mjs`

**Interfaces:**
- Consumes: Task 4 `normalizeLens`, `buildHash`.
- Produces: `setLens(lens: string): Lens` (sets `data-lens` on `#page-cv`, updates the hash when the CV is active, dispatches `document` `CustomEvent('mdb:lens', {detail:{lens}})`), `getLens(): Lens`, `checkLensVariants(html: string): string[]`. Markup contract: a group is an element with `data-lens-group="<name>"` containing exactly four children with `data-lens-text="all|chem|ops|cust"`. CSS: for each lens, `#page-cv[data-lens="X"] [data-lens-text]:not([data-lens-text="X"]){display:none}`.

- [ ] **Step 1: Write failing tests.** `checkLensVariants`: a group with four variants gives `[]`; a group missing `ops` gives a message containing the group name and `ops`; a duplicate `chem` gives a message containing `duplicate`. `setLens` (via `loadClassic` with a stub `document`): `setLens('ops')` returns `'ops'`, sets the attribute, dispatches one `mdb:lens` event with `detail.lens === 'ops'`; `setLens('zzz')` returns `'all'`.
- [ ] **Step 2:** Run; confirm failure.
- [ ] **Step 3:** Implement `lens.js`, the CSS block and `checkLensVariants`; wire it into `check.mjs`.
- [ ] **Step 4:** Run `node --test scripts/` and `node scripts/check.mjs`; both pass.
- [ ] **Step 5:** Commit `Lens state, CSS switch and variant check`.

### Task 6: CV copy and lens text (owner gate)

**Files:**
- Modify: `index.html` (CV page, Home strings), `js/data.js`, `js/popups.js`, `css/*.css` as needed, `scripts/lib/rules.mjs`, `scripts/rules.test.mjs`, `scripts/check.mjs`

**Interfaces:**
- Produces: `findBannedText(name: string, text: string): string[]`. Flags: U+2014, U+2013, `&mdash;`, `&ndash;`, U+2018, U+2019, U+201C, U+201D, `&lsquo;`, `&rsquo;`, `&ldquo;`, `&rdquo;`, `Technical Sales`, `Cann.Eden` not followed by `n`, British spellings (`organis`, `colour`, `centre`, `programme`, `analyse`, `behaviour`, `favour`, `realis`, `optimis`, `specialis`), and `listing review`. Each message contains the file name.
- Lens groups produced (all in `#page-cv`): `headline`, `profile`, `skills`, `job-1` to `job-7` (bullets, newest first), `edu-notes`.

- [ ] **Step 1: Write failing tests** for `findBannedText`, one fixture per flag, plus a clean string returning `[]`.
- [ ] **Step 2:** Run; confirm failure. Implement; pass.
- [ ] **Step 3:** Wire into `check.mjs` for `index.html`, `css/*`, `js/*`, `modules/*`. Run `node scripts/check.mjs`; expected: FAIL listing the current copy debt (entities, curly quotes, `Cann.Eden`, `Technical Sales`).
- [ ] **Step 4:** Fix every flagged item: dashes become commas, periods or middots; curly quotes become straight; `Cann.Edenn`; `Customer-Facing` in the CV role line and Home. Run `node scripts/check.mjs` until it prints `All good.`.
- [ ] **Step 5 (owner gate):** Draft the five text blocks for all four variants from the owner's three CV PDFs (Chemistry & R&D, Operations, Customer-Facing; the blended `all` variant is the current text, cleaned). Apply the Global Constraints: Intelcia as one fact, Avicampo with an Operations angle, no phone number. Also propose three candidate hero lines for Home (facts, no labels such as "chemist by trade"). Show the full draft in chat and wait for the owner's approval and his pick of the hero line. Do not insert anything before approval; the chosen hero line goes into `.hero-main` in Task 12.
- [ ] **Step 6:** After approval, insert the variants as `data-lens-group` markup. Run `node scripts/check.mjs`; `All good.` (this includes `checkLensVariants`).
- [ ] **Step 7:** In the browser, for each of `all`, `chem`, `ops`, `cust`: run `setLens(x)` in the console and confirm that for every group exactly one variant is visible (`document.querySelectorAll('#page-cv [data-lens-group] > :not([style*="none"])')` filtered by computed `display`, count equals the number of groups). Commit `CV copy fixes and lens text`.

### Task 7: The board on the CV page

**Files:**
- Create: `modules/board-data.js`, `modules/board.js` (from `lab/deep-dive-board/board.js`), `css/board.css`, `scripts/board-data.test.mjs`
- Modify: `index.html` (mount point `<section class="cv-board" id="cvBoard">` above Profile; `data-board` attributes on the 7 `.job` elements; remove the pillar cards block), `js/data.js` (remove `pillars`), `js/popups.js` (remove `openPillar`), `css/cv.css` (remove pillar rules), `scripts/lib/rules.mjs`, `scripts/check.mjs`

**Interfaces:**
- Consumes: Task 5 `setLens`, event `mdb:lens`.
- Produces: `parseJobs(rows: Row[]): Job[]` with `Row = {year: string, place: string, company: string, lines: Record<Lens, string>, weights: Record<'chem'|'ops'|'cust', number>}`; throws an Error containing `line too long` when any line exceeds 28 characters and `missing lens` when a lens line is absent; returns jobs with lines upper-cased. `dotFor(w: number): string` returns `'●'` at 0.8 and above, `'◑'` at 0.45 and above, else `'○'`. `rowsFromDom(root: ParentNode): Row[]` reads `data-year`, `data-place`, `data-company`, `data-line-all|chem|ops|cust`, `data-w-chem|ops|cust` from `.job[data-board]`. `mountBoard(host: HTMLElement): Promise<{dispose(): void}>`. `checkBoardLines(html: string): string[]` in `rules.mjs`.

- [ ] **Step 1: Write failing tests** in `scripts/board-data.test.mjs`: valid rows come back upper-cased; a 29-character line throws `line too long`; a row without `ops` throws `missing lens`; `dotFor(1)`, `dotFor(0.5)`, `dotFor(0.2)` give `●`, `◑`, `○`. In `rules.test.mjs`: `checkBoardLines` returns `[]` for HTML whose jobs have all four lines at 28 characters or fewer, and a message naming the job for a 29-character line.
- [ ] **Step 2:** Run; confirm failure. Implement `board-data.js` and `checkBoardLines`; wire the rule into `check.mjs`. Pass.
- [ ] **Step 3:** Port the board: `modules/board.js` imports `./board-data.js` and reads its jobs from the DOM. Changes against the lab version: lens key `sales` becomes `cust` with name `Customer-Facing` and title `CUSTOMER-FACING`; `COLS.place` goes from 11 to 12 so `CLERMONT-FD` keeps a gap before the company; the hidden `#sr` text block and the lab `JOBS` object are deleted; the board's four buttons call `window.setLens` and the board listens to `mdb:lens`; `window.__board` exists only when the address contains `test`; the font is loaded from `vendor/fonts/RobotoCondensed-700.woff2` through `@font-face` in `css/board.css`; no WebGL means the host gets `hidden`. Do not touch the flip engine or timings.
- [ ] **Step 4:** Add `data-board` attributes to the 7 jobs. Lines are Fable's placeholder wording, except Intelcia, whose four lines may only restate the approved fact. Weights are the lab guesses. Mark the block with an HTML comment that the owner supplies final lines and weights.
- [ ] **Step 5:** Load the module only when the CV page becomes active (dynamic `import('./modules/board.js')` from a small classic hook in `nav.js`).
- [ ] **Step 6:** `node --test scripts/` and `node scripts/check.mjs` pass.
- [ ] **Step 7:** Browser: on `#cv` the board renders with title `ALL PATHS, ONE PERSON` and 7 rows; `setLens('ops')` flips it to `OPERATIONS`; the four board buttons change `data-lens` on `#page-cv` and the text below. At 375 px the company column is dropped and no line is cut. Light theme: the board stays dark, the page around it uses site tokens. No console errors.
- [ ] **Step 8:** Commit `Put the split-flap board on the CV, reading from the page`.

### Task 8: Lens buttons on Home

**Files:**
- Modify: `index.html` (replace the three feature columns in `#page-home` with three links), `css/home.css`
- Create: `scripts/home.test.mjs`

**Interfaces:**
- Produces: three `a.lens-btn` elements with `href` `#cv/chem`, `#cv/ops`, `#cv/cust` and text `Chemistry & R&D`, `Operations`, `Customer-Facing`.

- [ ] **Step 1: Write failing test** that reads `index.html` and asserts those three anchors exist with exactly those hrefs and texts.
- [ ] **Step 2:** Run; confirm failure. Implement the markup and styles (the buttons keep the lens colors: teal, slate, orange).
- [ ] **Step 3:** Pass; `node scripts/check.mjs` passes.
- [ ] **Step 4:** Browser: click Operations on Home; the URL is `#cv/ops`, the CV is active and the board shows Operations. Commit `Home lens buttons link into the CV`.

---

## Phase 2: Opening, banner, logo

### Task 9: Opening module

**Files:**
- Create: `modules/opening-config.js`, `modules/opening.js` (from `lab/opening/opening.js`), `img/logo/mdb-shape.jpg` (copy of `lab/opening/mdb-shape.jpg`), `scripts/opening-config.test.mjs`

**Interfaces:**
- Produces in `opening-config.js`: `FINISHES: Record<'gold'|'emerald'|'gunmetal'|'orange', {color: string, metalness: number, roughness: number, clearcoat: number}>`, `SPACE_BLACK = '#07070b'`, `tierParams(tier: 'full'|'lite'): {k: number, min: number, max: number, pixelRatioCap: number}`, `glideTargets(letters: Rect, slot: Rect): {scale: number, dx: number, dy: number}` where `Rect = {x, y, width, height}`, `scale = slot.width / letters.width`, and `dx`, `dy` are the center-to-center offsets.
- Produces in `opening.js`: `createOpening(opts: {canvas: HTMLCanvasElement, shapeUrl: string, finish: keyof typeof FINISHES, tier: 'full'|'lite', transparent?: boolean}): Promise<Opening>` with `Opening = {setPixelRatio(r: number): void, start(): void, skipToRelease(): void, on(event: 'release'|'complete', fn: () => void): void, holdFrame(): void, letterRect(): Rect, glideTo(slot: Rect, seconds: number): void, dispose(): void, state: 'gate'|'gather'|'hold'|'release'|'complete'}`.

- [ ] **Step 1: Write failing tests**: `FINISHES.emerald.color === '#0d7040'`, `FINISHES.gunmetal` equals `{color:'#4b5059', metalness:1, roughness:0.16, clearcoat:0.4}`, `FINISHES.gold.color === '#e2b454'`; `tierParams('full')` is `{k:0.5, min:1.6, max:6, pixelRatioCap:1.5}` and `tierParams('lite')` is `{k:1.3, min:4.2, max:18, pixelRatioCap:1.5}`; `glideTargets({x:100,y:100,width:400,height:200},{x:20,y:10,width:100,height:50})` is `{scale:0.25, dx:-230, dy:-165}`.
- [ ] **Step 2:** Run; confirm failure. Implement `opening-config.js`. Pass.
- [ ] **Step 3:** Port `opening.js` into a factory. Before `start()` it renders the scattered, drifting cloud (the gate state) and does not play. Remove: the review bar, the scrubber, finish buttons, stats, `window.__open`, auto-play and the `sessionStorage` logic (the intro flag owns that). The sphere radius uses `tierParams`. `transparent: true` sets a transparent clear color instead of space black. `dispose()` frees geometry, material, environment and renderer. `glideTo` animates the sphere group by `glideTargets` over the given seconds and then fades it out.
- [ ] **Step 4:** `node --test scripts/` and `node scripts/check.mjs` pass (the module parses and uses only the `three`, `three/addons/` and `gsap` specifiers).
- [ ] **Step 5:** Commit `Opening as a module with finishes and tiers`. Visual verification happens in Task 10 and Task 11.

### Task 10: Logo stills

**Files:**
- Create: `scripts/stills/index.html`, `img/logo/gold-banner.webp`, `emerald-banner.webp`, `gunmetal-banner.webp`, `orange-banner.webp`, `img/logo/favicon-32.png`, `favicon-180.png`, `img/og.png`
- Modify: `index.html` (`<link rel="icon">` and `apple-touch-icon` in `<head>`), `scripts/lib/rules.mjs`, `scripts/rules.test.mjs`, `scripts/check.mjs`

**Interfaces:**
- Consumes: Task 3 `/__save`, Task 9 `createOpening` with `transparent: true` and `holdFrame()`.
- Produces: `checkLogoAssets(files: {name: string, bytes: number}[]): string[]` which returns a message for any `img/logo/*.webp` over 30000 bytes and for a missing `favicon-32.png`, `favicon-180.png` or `img/og.png`. Lens-to-finish default map: `all` gold, `chem` emerald, `ops` gunmetal, `cust` orange.

- [ ] **Step 1: Write failing tests** for `checkLogoAssets` (a 31000-byte webp gives a message naming it; a missing favicon gives a message; a complete small set gives `[]`).
- [ ] **Step 2:** Run; fail. Implement; pass. Wire into `check.mjs` (it will fail until the stills exist).
- [ ] **Step 3:** Build `scripts/stills/index.html`: for each finish it renders the hold frame on a transparent canvas, crops to the alpha bounding box, scales to a height of 96 px, and POSTs a WebP to `/__save`. From the gold crop it also writes the 32 px and 180 px PNG favicons (square, padded). It composes `img/og.png` at 1200x630: space black, the gold logo, and the name `Max Duffaud Bibas` in Inter.
- [ ] **Step 4:** Run `node scripts/serve.mjs --save`, open `/scripts/stills/`, run it, then stop the server.
- [ ] **Step 5:** `node scripts/check.mjs` prints `All good.` Open each banner still in the browser over a light and a dark background; expected: transparent background, no halo, readable letters. Commit `Render logo stills from the opening scene`.

### Task 11: Intro flag, gate, and starting the opening

**Files:**
- Create: `css/opening.css`, `js/home-intro.js`, `scripts/intro.test.mjs`
- Modify: `index.html` (inline `<script id="intro-flag">` as the first script in `<head>`; `#gate` markup before `<nav>`; link `css/opening.css`; script tag), `css/base.css` (token `--space: #07070b`)
- Delete: `lab/opening/gate-proto.html`, `lab/opening/gate-proto.js` (throwaway), the `lab/opening/gate-proto.*` line in `.git/info/exclude`

**Interfaces:**
- Produces (inline script, between `/*intro:start*/` and `/*intro:end*/`): `shouldRunIntro(env: {hash: string, seen: boolean, webgl: boolean, reducedMotion: boolean, force: boolean}): boolean` which is `webgl && !reducedMotion && (force || (!seen && (hash === '' || hash === '#home')))`. It adds `intro` to `<html>` before first paint when true. Reading `sessionStorage` is wrapped in try/catch and failure means `seen = false`.
- Produces (classic, `home-intro.js`): `chooseGateLook(env: {backdropFilter: boolean, fps: number | null}): 'frost'|'plain'` (plain when `backdropFilter` is false or `fps !== null && fps < 30`), `measureFps(ms: number): Promise<number>`, global `window.__intro = {state, look}`. Markup: `#gate` containing `button#gateEnter` (text `Welcome`, `aria-label="Welcome, enter the site"`) and `button#gateSkip` (text `Skip`).

- [ ] **Step 1: Write failing tests** in `scripts/intro.test.mjs` (extract the inline function by its markers and evaluate it): runs at `{hash:'', seen:false, webgl:true, reducedMotion:false, force:false}`; does not run when `seen`, when `hash:'#cv'` (Review Focus 4), when `#cv/ops`, when `reducedMotion`, when `!webgl`; runs with `force:true` and `hash:'#cv'`; does not run with `force:true` and `reducedMotion:true`. A fixture-level test that the inline script, evaluated with a `sessionStorage` whose `getItem` throws, still returns without throwing and treats `seen` as false (Review Focus 2). `chooseGateLook`: `{backdropFilter:false, fps:60}` plain; `{backdropFilter:true, fps:20}` plain; `{backdropFilter:true, fps:null}` frost; `{backdropFilter:true, fps:45}` frost.
- [ ] **Step 2:** Run; fail. Implement the inline function and `chooseGateLook`; pass.
- [ ] **Step 3:** Gate behavior. Under `html.intro` the page and nav are hidden by CSS and `#gate` shows space black with the button focused. `home-intro.js` dynamically imports `modules/opening.js`, creates the opening with tier `lite` when `matchMedia('(max-width: 760px)')` or `navigator.hardwareConcurrency <= 4`, else `full`, renders the cloud at pixel ratio 0.7, and measures fps for 1 s to pick the look (frost or plain). Click on `#gateEnter` sets the session flag, restores pixel ratio, calls `opening.start()`, and melts the frost (or fades the plain gate) as in Global Constraints. `#gateSkip` goes straight to state `done` with no animation. Pointer, wheel, key or touch during gather or hold calls `opening.skipToRelease()`.
- [ ] **Step 4:** Browser verification: with `?again`, state is `gate`, `getComputedStyle(document.querySelector('#page-home')).visibility === 'hidden'`, the button has focus; click `Welcome`, `__intro.state` becomes `gather`; reload without `?again` in the same session, no gate; `#cv/ops` direct load, no gate; `curl` the raw `index.html` and confirm it contains no `class="intro"` (the class is added by script only).
- [ ] **Step 5:** Delete the throwaway prototype files and the exclude line. `node --test scripts/` and `node scripts/check.mjs` pass. Commit `Welcome gate and opening start`.

### Task 12: Banner reveal, hero staging, settle, fail-safes

**Files:**
- Modify: `index.html` (nav logo becomes `<img id="logoImg" class="logo-img" src="img/logo/gold-banner.webp" alt="MDB">` inside the existing `#logoTrigger`, keeping the ring; the molecule logo SVG and the hero watermark SVG are removed; hero text wrapped in `.hero-main`), `css/base.css`, `css/home.css`, `css/opening.css`, `js/home-intro.js`

**Interfaces:**
- Consumes: Task 9 `Opening.on`, Task 11 states.
- Produces: states `'idle'|'gate'|'gather'|'hold'|'release'|'settle'|'done'` on `window.__intro.state`. CSS contract on `<html>`: `intro` (hidden page, gate), `intro-release` (nav fades in over 0.6 s, `.hero-main` appears centered through `--intro-dy`), `intro-settle` (`.hero-main` transitions `--intro-dy` to 0 over 0.8 s and the lens buttons fade in), all removed at `done`. Test hook: `?failopen` on `localhost` makes the dynamic import reject.

- [ ] **Step 1:** Implement the sequence: on opening `release` add `intro-release` (state `release`), 0.4 s later add `intro-settle` (state `settle`), on `complete` dispose the opening, remove the canvas, remove all `intro*` classes (state `done`). `--intro-dy` is the vertical distance from the hero's final position to the viewport center, measured once at release.
- [ ] **Step 2: Fail-safes (Review Focus 3 and 5).** A real-time timer of 3 s after the click: if the state is still `gate` or `idle`, or the import rejected, call `finishNow()` (page shown, state `done`). A second timer of 12 s after the click calls `finishNow()` regardless, so a suspended tab never leaves the page hidden. `visibilitychange` to visible re-checks the state and calls `finishNow()` if the opening has been over for longer than its duration.
- [ ] **Step 3:** Browser verification, desktop: click `Welcome`; within 5 s `__intro.state` reaches `release`, nav opacity is 1, `.hero-main` has a nonzero `--intro-dy` then 0; within 7 s state is `done`, `document.querySelectorAll('canvas').length === 0`, and `html` has no class beginning with `intro`.
- [ ] **Step 4:** Browser verification, fail paths: with `?again&failopen` click `Welcome`; the page is shown within 3.5 s and there is no uncaught error. At 375 px width the same sequence completes and the logo fits the banner. Reload after `done` and press Back and Forward; the opening never replays (Review Focus 4). Review Focus 5: before clicking, run `window.requestAnimationFrame = () => 0` in the console (simulating a suspended tab), then click `Welcome`; expected: state is `done` and the page is visible within 12.5 s.
- [ ] **Step 5:** `node scripts/check.mjs` passes. Commit `Banner reveal, hero settle and fail-safes`.

### Task 13: Per-lens logo

**Files:**
- Modify: `js/lens.js`, `index.html` (preload hints not needed), `css/base.css`
- Create: `scripts/logo.test.mjs`

**Interfaces:**
- Consumes: Task 10 stills, event `mdb:lens`.
- Produces: `LENS_FINISH = {all:'gold', chem:'emerald', ops:'gunmetal', cust:'orange'}`, `logoSrcFor(lens: string): string` returning `img/logo/<finish>-banner.webp` (unknown lens gives the gold path). On `mdb:lens` the banner image swaps with a 300 ms crossfade; all four images are preloaded when the browser is idle.

- [ ] **Step 1: Write failing test:** `logoSrcFor('ops') === 'img/logo/gunmetal-banner.webp'`, `logoSrcFor('chem') === 'img/logo/emerald-banner.webp'`, `logoSrcFor('zzz') === 'img/logo/gold-banner.webp'`.
- [ ] **Step 2:** Run; fail. Implement; pass.
- [ ] **Step 3:** Browser: `setLens('cust')` swaps the banner logo to the orange still; loading `#cv/ops` directly shows gunmetal from the first paint. Commit `Banner logo follows the lens`.

### Task 14: Sphere-to-logo glide

**Files:**
- Modify: `js/home-intro.js` (constant `GLIDE_HANDOFF = true` at the top), `modules/opening.js`

**Interfaces:**
- Consumes: Task 9 `glideTargets`, `letterRect`, `glideTo`; Task 12 `release` event.

- [ ] **Step 1:** On `release` with `GLIDE_HANDOFF` true, call `opening.glideTo(rectOf('#logoImg'), 0.9)` while the logo still fades in; with it false, keep the plain release (spheres float up and out, logo fades in).
- [ ] **Step 2:** Capture screenshots at 25, 50, 75 and 100 percent of the glide at desktop width and at 375 px. Accept when the letters land within 4 px of the logo rectangle and nothing jumps at the swap. If not, set `GLIDE_HANDOFF = false` and verify the plain path the same way.
- [ ] **Step 3:** `node scripts/check.mjs` passes. Commit `Glide handoff` (or `Plain release handoff`), stating which path was kept.

### Task 15: Verification pass and measurements

**Files:**
- Create: `scripts/budget.mjs`, `docs/superpowers/notes/2026-10-20-core-results.md`

**Interfaces:**
- Produces: `node scripts/budget.mjs` prints the gzip total of the HTML, CSS and classic scripts referenced by `index.html` and the gzip total of the vendored three and gsap files, and exits 1 if the first total is over 150 KB.

- [ ] **Step 1:** Write `budget.mjs`; run it. Expected: the pre-gate total at or under 150 KB. Record both totals in the results note.
- [ ] **Step 2:** Run `node --test scripts/` (all pass) and `node scripts/check.mjs` (`All good.`).
- [ ] **Step 3:** Walk the done-when list from the spec, phases 0 to 2, in the browser: CV complete with JavaScript off (the lens `all` text is readable, no board); every lens reads correctly; no board line cut at 375 px; Enter to settled hero at desktop and 375 px; Skip works; no flash of the page before the gate; light and dark themes. Record each result in the note.
- [ ] **Step 4:** Start `node scripts/serve.mjs --host` and ask the owner to open the printed URL on his phone and report the gate look, smoothness and the logo handoff. Record his answer. Reduced motion is covered by the Task 11 unit tests and is confirmed on the owner's PC with the OS setting.
- [ ] **Step 5:** List in the note the facts the next plan needs: the measured three.js size, which look and tier the phone chose, anything that stuttered. Commit `Phase 0 to 2 results`, then ask the owner to review the branch.
