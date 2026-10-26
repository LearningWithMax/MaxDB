# Trip, stage 1: the flight globe on the page

Date: 2026-10-24. Branch: `restructure` (nothing is pushed, nothing is live).
Parent specs: `2026-10-18-master-site-design.md` (sections 3.5, 5, 11 phase 3) and `2026-10-21-art-direction-brief.md`. This file refines
them for stage 1; where they differ, this file wins. Stage 2 (Explore mode, clicking a country on the globe, country notes) gets its own spec and plan.
Status: approved by the owner on 2026-10-24, with the four album buttons added (section 6).
This file is public once merged: no private notes in it.

## 1. Intent

The Trip page shows where the owner studied and worked as a short flight over a night globe: eleven stops, each with a plain line,
work and study clearly told apart. It replaces the flat map, which stays only for visitors without WebGL. Success looks like this:

- `#trip` shows the header, the globe in a dark window with a caption, and nothing that scrolls sideways at 375 wide.
- The flight plays by itself (paused for reduced motion), can be paused, restarted and scrubbed, and any stop can be picked from the list.
- Each stop says Born, Studied or Worked on the globe, in the list and on the card.
- Four album buttons (Venezuela, Israel, France, Spain) under the caption open the existing photo albums, so the photos stay reachable
  until Explore mode exists. The flat map's own country clicks still work in the fallback.
- Without WebGL, or if the globe fails to load, the flat map and a plain list of the same stops show instead. Without JavaScript the list shows.
- Only one 3D scene is alive at a time: the globe is removed when the visitor leaves `#trip`.
- The Home card shows a still rendered from the real globe.

## 2. What the owner decided

- Two stages, each with its own spec and plan; the flight first, Explore after (his "A").
- Study and work must be visibly different, on the globe and in the text. Study stops: Poitiers, Bordeaux, Madrid (the Master's).
- Company names stay on every work stop (the CV already names them all). Intelcia keeps the one approved fact and the CV title.
- Bordeaux comes before the Michelin work-study in Clermont-Ferrand.
- Fable owns the globe scene and Explore mode; this stage uses the finished module and does not edit it.
- The stop wording is a draft from the CV; he will edit it later (section 4).

## 3. Out of scope

Explore mode, picking a country on the globe, and the country notes (stage 2); a measured frame rate on a real phone (the owner's test); a
deep link to one stop (`#trip/<stop>`); moving the flat map out of `index.html` into a lazy fragment (a later size optimization).

## 4. The stops

Eleven stops, in this order. The kind is `born`, `study` or `work`. `when` is mono, `what` is one plain line (120 characters or fewer).

| # | City, country | kind | when | what |
| --- | --- | --- | --- | --- |
| 1 | Caracas, Venezuela | born | Born here | The route starts here. |
| 2 | Poitiers, France | study | 2017 to 2019 | Associate degree in analytical and synthetic chemistry. |
| 3 | Prague, Czech Republic | work | 2019 | HPLC research internship at the Czech Academy of Sciences. |
| 4 | Bordeaux, France | study | 2019 to 2020 | Bachelor's in chemistry and polymer formulation, Université de Bordeaux. |
| 5 | Clermont-Ferrand, France | work | 2019 to 2021 | R&D work-study at Michelin, modeling rubber at the molecular level. |
| 6 | Rehovot, Israel | work | 2021 | Lab assistant at the Weizmann Institute, on algae and calcite research. |
| 7 | Madrid, Spain | study | 2021 to 2022 | Master's in Chemical Industry Management. |
| 8 | Caracas, Venezuela | work | 2022 to 2023 | Commercial technical representative at Laboratorios Chacao, in lab and feed. |
| 9 | Madrid, Spain | work | 2023 to 2024 | Operations support and team coordinator at Intelcia. Onboarded every new hire as the team grew from about 10 to 35. |
| 10 | Caracas, Venezuela | work | 2024 to 2025 | Commercial technician at Avicampo: field visits nationwide and IPPE Atlanta. |
| 11 | Yashresh, Israel | work | 2025 to 2026 | Team lead at Cann.Edenn, running the greenhouses. |

Coordinates and country codes are Fable's (`modules/globe-data.js`). The words live in one site file, `modules/trip-stops.js`
(section 5), so the owner can change them without touching the scene. Rules: no dashes, American spelling, straight apostrophes,
Cann.Edenn with two n, no "Technical Sales", and Intelcia only by the approved sentence (`INTELCIA_FACT` in `scripts/lib/rules.mjs`).

## 5. Units

| File | Responsibility |
| --- | --- |
| `modules/globe.js`, `modules/globe-data.js`, `modules/jet.js` (Fable, done) | The scene: `mountGlobe(host, options)` returns `{ play, pause, restart, seekToStop, renderStill, on, dispose, state }`. Not edited in this stage. |
| `modules/trip-stops.js` (new) | The site's stops: `export const TRIP_STOPS = [...]` with the full shape `{ cc, city, country, lat, lon, kind, when, what }`, passed to the globe as `options.stops`. Pure data, importable by Node tests. Fable's default `STOPS` stay as the lab's. Separate files so Fable's Explore pass and the owner's wording changes never edit the same file. |
| `js/trip.js` (new, classic script, before `nav.js`) | `mountTrip()`, `disposeTrip()`, the page state (`data-globe` = `off`, `loading`, `on`), the fallback switch, the phone check. Loads the module on demand with `import()`. |
| `js/nav.js` | `goTo` calls `mountTrip()` when the page is `trip` and `disposeTrip()` when it is not. |
| `css/globe.css` (Fable) | Edited here only to remove the hex fallbacks, so every color comes from the tokens. |
| `css/tokens.css` | Gains the `--globe-*` properties for the dark object, from the existing `--board-*` and palette tokens. |
| `css/trip.css` (new) | The Trip page layout, the dark frame, the caption, the static list, the fallback switch, serif city and mono tag overrides. |
| `index.html` | The Trip section: header, `#tripGlobe` host, caption, the static stops list (generated), the flat map wrapped as the fallback. |
| `scripts/lib/trip-list.mjs`, `scripts/trip-list.mjs` (new) | Builds the static list HTML from `TRIP_STOPS`; the script writes it into `index.html` between markers. After a wording change: edit `trip-stops.js`, run `node scripts/trip-list.mjs`. A test fails if the two differ. |
| `scripts/stills/trip.html` (new, dev only) | Renders the Home card image from the real globe with `renderStill` and saves it through the dev save route. `savepath.mjs` also allows `img/trip-preview.webp`. |

## 6. The page

- Header as now: mono kicker (`Venezuela · France · Czech Republic · Spain · Israel`), serif `h1` "Where I've been", the same plain line,
  then one mono instruction line: "Press play, or pick a stop. Rings are study, dots are work."
- The globe window: a `figure` holding `#tripGlobe` (the host), in the dark frame (`--board`, `--board-edge`, `--r-obj`, the shadow
  the preview objects use). Always the night scene, in both themes. Caption `.cap`: "Fig. 2. The route, one stop at a time."
  The host's size comes from Fable's CSS: 16 to 10 on desktop, 4 to 5 under 820 px.
- Inside the host (Fable's UI, restyled): the route legend with a kind tag per stop, the stop card (mono kicker "Stop 04 of 11, Studied",
  serif city, mono when, Inter line), play or pause, restart, and the scrubber.
- The static list `ol.trip-stops`: one `li` per stop with city, kind, when and line. Shown when `data-globe` is `off` (no JavaScript, WebGL
  missing, or the module failed); hidden when the globe is on, because the globe's legend carries the same content.
- The albums row, always visible under the caption (with the globe or with the fallback): a mono label "Albums" and four `.pill` buttons,
  Venezuela, Israel, France, Spain, each `onclick="openCountryAlbum('VE')"` and so on (the function in `js/popups.js`; the album popup, its
  photos and its close button are unchanged). Each button has an `aria-label` such as "Open the Venezuela photo album". Stage 2 keeps the
  row and adds clicking a country on the globe.
- The flat map (`#mapWrap` and its figure) is shown only when `data-globe` is `off`. `js/map.js` keeps working unchanged for it.
- `data-globe="off"` is the markup default, so a visitor without JavaScript gets the map and the list. `trip.js` sets `loading` on the first
  visit (the host shows "Loading the globe", the map is hidden), then `on` or back to `off`.

## 7. Loading and lifetime

- First visit to `#trip`: `import('../modules/globe.js')` and `import('../modules/trip-stops.js')` in parallel, then
  `mountGlobe(host, { stops: TRIP_STOPS, tailLogoUrl: 'img/logo/chrome-banner.webp', countriesUrl: 'vendor/data/countries-110m.json', lite })`.
  `lite` is true under 760 px wide or with 4 or fewer cores (the rule the opening uses). Autoplay stays on; the module starts paused for
  reduced motion.
- Leaving `#trip` calls `controller.dispose()`; returning mounts again from stop 1. If the visitor leaves while a mount is in progress,
  the mount finishes and disposes at once (no leaked renderer). A second `mountTrip()` while one is running does nothing.
- On any failure (no WebGL, a failed fetch, a thrown Error) the state goes to `off`, the console gets one line, and nothing is left in the host.
  A localhost-only `?failglobe` address flag forces this path for testing, like the opening's `?failopen`.
- Hidden tab and off-screen pausing are Fable's (IntersectionObserver and `visibilitychange`); this stage relies on them.

## 8. Styles and tokens

- `--globe-bg`, `--globe-ink`, `--globe-mute`, `--globe-line`, `--globe-panel`, the accent pair and the scrim are set on `#tripGlobe` from
  `--board`, `--board-ink`, `--board-mute`, `--board-edge`, `--gold` and `--orange` in `tokens.css`. `css/globe.css` loses its hex fallbacks;
  a test fails on any hex color in it. The study tone and the work tone on the markers are the module's `PALETTE` (Fable's colors, in JS).
- Fonts: the stop card city in `--font-serif`, the kicker, tag and when in `--font-mono`, the line and legend in `--font-sans`, set from
  `css/trip.css` (Fable's CSS exposes only `--globe-mono`). Only characters in the font subset are allowed (`é` is).
- The legend, the card and the controls keep Fable's 44 px targets and ARIA (real buttons, `aria-current="step"`, `aria-live="polite"`).
- Nothing in `trip.css` animates by itself; the globe is the only motion on the page.

## 9. The Home card

`renderStill({ stop, width: 1120, height: 700 })` from the real scene gives a canvas with the route drawn to that stop and no UI. The dev page
tries the stops where the route reads best (the Atlantic arcs show around stops 8 and 9), the owner picks by eye, and the result is saved as
`img/trip-preview.webp` at 90 KB or less. The card keeps its caption "Plate 1. The route, Caracas to Yashresh." and the alt text is updated to
describe the new image. Until then the provisional image stays.

## 10. Tests and checks

Node tests: `TRIP_STOPS` (eleven stops in the table's order; fields; kind known; `when` and `what` present; `what` 120 characters or fewer;
the copy rules; the Intelcia sentence present word for word and the stop names no product; study stops are exactly 2, 4 and 7; coordinates
match Fable's default stops for the same city); the static list equals `trip-list` output for `TRIP_STOPS`; the page structure (host,
caption, list, markers, `data-globe="off"` default, the map inside the fallback wrapper, the albums row with its four buttons, their handlers and labels, each country code present in `countryAlbums`); `trip.js` source rules (dynamic import only,
dispose on leave, one mount at a time, `?failglobe` on localhost only); no hex color in `css/globe.css`; every `--globe-*` property the CSS
reads is defined in `tokens.css`; `savepath` accepts `img/trip-preview.webp` and still rejects traversal. `check.mjs` already parses `modules/`
and the import map; it gains the static-list rule. `budget.mjs` is unchanged (the globe loads after first paint).

## 11. Verification in the browser

At 1280 and 375 wide, dark and paper: `#trip` cold load, the globe mounts and plays, the legend and card show the kind, play, pause,
restart and scrub work, picking a stop jumps to it, each album button opens its album and the close button closes it, leaving and returning leaves zero canvases in between and one after, `?failglobe` shows
the flat map and the list, no sideways scroll, the console is clean. Not verifiable here, left to the owner: frame rate and heat on a real
phone (use the `lite` option as the lever), Safari, the LinkedIn in-app browser, and reduced motion with the OS setting.

## 12. What can change later, and how

- The stop wording, kinds and order: edit `modules/trip-stops.js`, run `node scripts/trip-list.mjs`, run the tests. No other file.
- The Home image after any visual change to the globe: re-run `scripts/stills/trip.html`.
- Globe look, jet, speed, colors: Fable edits `modules/globe*.js` and `css/globe.css`; the page keeps working while the API stays the same.
- Decided now because later is expensive: the module's API (done), one source for the stop data, remove-on-leave, and the markup and state
  names in section 6.

## 13. Needed from the owner

His edits to the stop lines (section 4); his phone test before launch; later, Fable's Explore pass for stage 2.
