# Trip stage 1: results

Date: 2026-10-24. Branch: `restructure`. Plan: `docs/superpowers/plans/2026-10-24-trip-stage1.md`. Spec: `docs/superpowers/specs/2026-10-24-trip-stage1-design.md`.
Nothing is pushed and nothing is live. This file is public once merged. It holds no private notes.

## What was built

The flight globe is on the Trip page, in a dark window with the caption "Fig. 2. The route, one stop at a time.", always a night scene in both themes.
Eleven stops, each Born, Studied or Worked (a ring for study, a dot for work, and a tag in the route list and on the stop card). Four album
buttons (Venezuela, Israel, France, Spain) under the caption open the existing photo albums. Without WebGL, without JavaScript, or when the
globe fails to load, the page shows the flat map, a plain list of the same 11 stops, and the album buttons. The Home card shows a still
rendered from the real globe. Fable's scene is used as delivered (`modules/globe.js`, `globe-data.js`, `jet.js`); this stage only mounts it.

- `modules/trip-stops.js`: the site's stops, in a file of its own so wording changes and Fable's Explore pass never edit the same file.
- `js/trip.js`: the lifecycle. The globe is built on the first visit to `#trip` and removed when you leave. The latest intent wins:
  leaving while it loads never leaves a globe behind, and trip, home, trip keeps exactly one.
- `scripts/lib/trip-list.mjs`, `scripts/trip-list.mjs`: build and check the plain list in `index.html`.
- `css/tokens.css` (the `--globe-*` tokens, fixed because the globe is dark in both themes), `css/globe.css` (29 hex and rgba fallbacks
  removed), `css/trip.css`.
- `scripts/stills/trip.html`: renders the Home card image with the globe's own `renderStill`.

## Numbers

| Measure | Result | Limit |
| --- | --- | --- |
| Tests | 415 pass | |
| HTML, CSS and classic scripts before the gate, gzip | 92.6 KB (was 87.2 KB) | 150 KB |
| `globe.js` + `globe-data.js` + `jet.js`, gzip | 9.3 + 3.8 + 7.6 = 20.7 KB (load only on `#trip`) | 40 KB |
| `trip-stops.js`, `trip.js`, `trip.css`, `globe.css`, gzip | 1.3, 1.5, 1.1, 1.8 KB | |
| `img/trip-preview.webp` | 48,650 bytes (was 65,276) | 90,000 |

## What was checked, and how

- `node --test`, `node scripts/check.mjs` ("All good.", including the new rule that the plain stop list matches `modules/trip-stops.js`;
  a mutation check changed one stop line and the check failed) and `node scripts/budget.mjs`.
- In the browser pane, at 1280 and 375 wide, dark and paper: `#trip` cold load mounts and plays the globe; the route list shows kind tags;
  the card reads "Stop 04 of 11, Studied"; picking a stop jumps to it; pause, restart and the scrubber work; each album button opens the
  right album and the close button closes it; leaving removes the canvas, returning builds one, and trip, home, trip, home, trip leaves
  exactly one; `/?failglobe#trip` shows the map, the list and the albums with one console warning; paper keeps the globe dark; no sideways
  scroll on Home, CV, Projects or Trip in either theme; the console is clean on all four pages.
- Lifecycle logic is covered by 11 Node tests with a fake globe, including leaving mid-load and mid-build (a mutation of the guard fails one).

Not verified, and needs the owner or a real device:

- Frame rate and heat of the globe on a real phone. The module has a `lite` option (phones and 4-core machines get it) as the lever.
- Safari and the LinkedIn in-app browser. Reduced motion with the OS setting (the module starts paused at stop 1; no page test can emulate it).
- On phones the orange card kicker ("STOP 06 OF 11, WORKED") overlaps light parts of the globe and is a little hard to read. It is in Fable's
  card and scrim, so it is a polish item for him, not fixed here.

## Deviations and rulings

1. `lab/flight-globe/flight.html` (Fable's playground) now links `css/tokens.css`. Without it the playground loses every globe color now that
   `globe.css` has no fallbacks. One line; tell Fable.
2. The plan's save-path test listed `img/trip-preview.png` as rejected, but the existing `img/<name>.png` rule allows it; the test rejects
   other root-level webp names and path tricks instead.
3. The Home image is zero-based stop 8 (Madrid 2023 to 2024), chosen from a contact sheet because the owner was not in the loop at that
   moment. It shows the Atlantic arcs, Europe and Israel; stop 6 (Madrid 2021 to 2022) is the next best. To change it: `node scripts/serve.mjs --save`,
   open `/scripts/stills/trip.html?stop=<n>&save`, update the card's alt text.
4. The whole-branch review is not run for this plan alone: the Projects plan is paused (its car broker loop needs the owner at the PC), so one review
   will cover Projects and Trip together after it finishes.

## How to change things later

- Stop wording, kinds, order: edit `modules/trip-stops.js`, run `node scripts/trip-list.mjs`, run the tests. Nothing else.
- The Home image after any visual change to the globe: re-run `scripts/stills/trip.html`.
- Globe look, jet, speed, colors: Fable edits `modules/globe*.js` and `css/globe.css`; the page keeps working while its API stays the same.
- Stage 2 (Explore mode, clicking a country) needs Fable's `setMode` and country event first.
